"""Interference and intermodulation impairment calculations."""

import math
from dataclasses import replace
from typing import Any

from src.core.models.common import CalculationResult


def compute_interference(
    interference_block: dict[str, Any] | None,
) -> tuple[float, float | None, bool]:
    """Aggregate C/I from individual interference contributions.

    Returns (i_over_c_linear, aggregate_ci_db, applied_flag).
    """
    block = interference_block or {}
    ci_values = [
        block.get("adjacent_sat_ci_db"),
        block.get("cross_polar_ci_db"),
        block.get("other_carrier_ci_db"),
    ]
    inv_terms = []
    for value in ci_values:
        if value is None:
            continue
        ci_lin = 10 ** (value / 10)
        if ci_lin <= 0:
            continue
        inv_terms.append(1 / ci_lin)
    i_over_c = sum(inv_terms)
    aggregate_ci_db = None
    if i_over_c > 0:
        aggregate_ci_db = 10 * math.log10(1 / i_over_c)
    applied = bool(block.get("applied")) or any(v is not None for v in ci_values)
    return i_over_c, aggregate_ci_db, applied


def estimate_intermodulation(
    intermod_block: dict[str, Any] | None,
) -> tuple[float | None, bool]:
    """Simple IMD estimate using output/input backoff and carrier count.

    Returns (c_im_db, applied_flag).
    """
    if not intermod_block:
        return None, False
    carriers = intermod_block.get("composite_carriers")
    o_bo = intermod_block.get("output_backoff_db")
    i_bo = intermod_block.get("input_backoff_db")
    backoff = o_bo if o_bo is not None else i_bo
    if backoff is None or carriers is None or carriers < 1:
        return None, False
    c_im_db = max(0.0, 2 * backoff + 7 - 10 * math.log10(carriers))
    return c_im_db, True


def combine_cn_db(ul_cn: float, dl_cn: float) -> float:
    """Combine uplink and downlink C/N in linear domain."""
    ul_lin = 10 ** (ul_cn / 10)
    dl_lin = 10 ** (dl_cn / 10)
    combined_lin = 1 / ((1 / ul_lin) + (1 / dl_lin))
    return 10 * math.log10(combined_lin)


def apply_impairments(
    result: CalculationResult,
    bandwidth_hz: float | None,
    i_over_c: float,
    aggregate_ci_db: float | None,
    interference_flag: bool,
    apply_intermod: bool,
    c_im_db_value: float | None,
) -> CalculationResult:
    """Apply interference and intermodulation impairments to a link result."""
    if not bandwidth_hz:
        return result

    base_cn0 = result.cn0_dbhz
    base_cn = result.cn_db
    cn_lin = 10 ** (base_cn / 10)
    thermal_term = 1 / cn_lin
    interference_term = i_over_c if i_over_c > 0 else 0.0

    updates: dict[str, Any] = {}

    if interference_term > 0:
        cni_lin = 1 / (thermal_term + interference_term)
        updates["cni_db"] = 10 * math.log10(cni_lin)
        updates["cni0_dbhz"] = updates["cni_db"] + 10 * math.log10(bandwidth_hz)
    else:
        updates["cni_db"] = base_cn
        updates["cni0_dbhz"] = base_cn0

    intermod_term = 0.0
    if apply_intermod and c_im_db_value:
        cim_lin = 10 ** (c_im_db_value / 10)
        if cim_lin > 0:
            intermod_term = 1 / cim_lin
            updates["c_im_db"] = c_im_db_value
            updates["intermod_applied"] = True

    total_term = thermal_term + interference_term + intermod_term
    if total_term > 0:
        cn_lin_effective = 1 / total_term
        cn_db_effective = 10 * math.log10(cn_lin_effective)
        cn0_effective = cn_db_effective + 10 * math.log10(bandwidth_hz)
        updates["cn_db"] = cn_db_effective
        updates["cn0_dbhz"] = cn0_effective
        delta = cn_db_effective - base_cn
        if result.link_margin_db is not None:
            updates["link_margin_db"] = result.link_margin_db + delta

    updates["interference_applied"] = interference_flag or interference_term > 0
    warnings = list(result.warnings or [])
    cni_db_val = updates.get("cni_db", result.cni_db)
    cn_db_val = updates.get("cn_db", result.cn_db)
    intermod_flag = updates.get("intermod_applied", result.intermod_applied)
    c_im_val = updates.get("c_im_db", result.c_im_db)
    if updates["interference_applied"] and aggregate_ci_db is not None and cni_db_val is not None:
        warnings.append(
            f"Interference applied: aggregate C/I={aggregate_ci_db:.2f} dB, "
            f"C/(N+I) degraded by {base_cn - cni_db_val:.2f} dB",
        )
    if intermod_flag and c_im_val is not None and cn_db_val is not None:
        warnings.append(
            f"Intermodulation applied: C/IM={c_im_val:.2f} dB, "
            f"total C/N degraded by {base_cn - cn_db_val:.2f} dB",
        )
    updates["warnings"] = warnings
    return replace(result, **updates)
