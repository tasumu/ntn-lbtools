from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

from src.core.strategies.base import WaveformStrategy

_MODCOD_FIELDS = {
    "id",
    "modulation",
    "code_rate",
    "required_cn0_dbhz",
    "required_ebno_db",
    "info_bits_per_symbol",
    "rolloff",
    "pilots",
}


def _coerce_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_code_rate(value: str | None) -> float | None:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    if "/" in text:
        parts = text.split("/", 1)
        try:
            numerator = float(parts[0].strip())
            denominator = float(parts[1].strip())
        except ValueError:
            return None
        if denominator == 0:
            return None
        return numerator / denominator
    try:
        return float(text)
    except ValueError:
        return None


def _modulation_bits(modulation: str | None) -> float | None:
    if not modulation:
        return None
    mod = modulation.strip().upper()
    if not mod:
        return None
    named = {
        "BPSK": 1.0,
        "QPSK": 2.0,
        "OQPSK": 2.0,
    }
    if mod in named:
        return named[mod]
    digits = ""
    for ch in mod:
        if ch.isdigit():
            digits += ch
        elif digits:
            break
    if digits:
        try:
            order = int(digits)
        except ValueError:
            return None
        if order > 0:
            return math.log2(order)
    return None


def _infer_info_bits_per_symbol(entry: dict) -> float | None:
    bits_per_symbol = _modulation_bits(entry.get("modulation"))
    code_rate = _parse_code_rate(entry.get("code_rate"))
    if bits_per_symbol is None or code_rate is None:
        return None
    info_bits = bits_per_symbol * code_rate
    if info_bits <= 0:
        return None
    return info_bits


def _clean_modcod_dict(entry: dict) -> dict:
    return {k: v for k, v in entry.items() if k in _MODCOD_FIELDS}


@dataclass
class ModcodEntry:
    id: str
    modulation: str
    code_rate: str
    required_cn0_dbhz: float | None = None
    required_ebno_db: float | None = None
    info_bits_per_symbol: float | None = None
    rolloff: float | None = None
    pilots: bool | None = None


class DvbS2xStrategy(WaveformStrategy):
    name = "DVB_S2X"

    def __init__(self, table: Sequence[ModcodEntry] | Iterable[dict] | None = None):
        # Default roll-off is only used when callers omit rolloff; it is not baked into table data.
        self.default_rolloff = 0.2
        if table is None:
            self.table: list[ModcodEntry] = [
                ModcodEntry("qpsk-1/4", "QPSK", "1/4", required_cn0_dbhz=65.0, info_bits_per_symbol=0.5),
                ModcodEntry("qpsk-1/2", "QPSK", "1/2", required_cn0_dbhz=70.0, info_bits_per_symbol=1.0),
                ModcodEntry("8psk-3/4", "8PSK", "3/4", required_cn0_dbhz=78.0, info_bits_per_symbol=2.25),
            ]
        else:
            normalized: list[ModcodEntry] = []
            for entry in table:
                if isinstance(entry, ModcodEntry):
                    normalized.append(entry)
                    continue
                cleaned = _clean_modcod_dict(entry)
                cleaned["required_cn0_dbhz"] = _coerce_float(cleaned.get("required_cn0_dbhz"))
                cleaned["required_ebno_db"] = _coerce_float(cleaned.get("required_ebno_db"))
                cleaned["info_bits_per_symbol"] = _coerce_float(cleaned.get("info_bits_per_symbol"))
                if not cleaned.get("info_bits_per_symbol"):
                    inferred = _infer_info_bits_per_symbol(cleaned)
                    if inferred is not None:
                        cleaned["info_bits_per_symbol"] = inferred
                normalized.append(ModcodEntry(**cleaned))
            self.table = normalized
        self._validate_table()

    def _sorted_entries(self) -> list[ModcodEntry]:
        def threshold(e: ModcodEntry) -> float:
            if e.required_cn0_dbhz is not None:
                return e.required_cn0_dbhz
            if e.required_ebno_db is not None:
                return e.required_ebno_db
            return float("inf")

        return sorted(self.table, key=threshold)

    def _validate_table(self) -> None:
        for entry in self.table:
            if entry.info_bits_per_symbol is None or entry.info_bits_per_symbol <= 0:
                raise ValueError(f"info_bits_per_symbol must be provided and positive for ModCod {entry.id}")

    def _resolve_rolloff(self, entry: ModcodEntry, rolloff: float | None) -> float:
        alpha = rolloff if rolloff is not None else entry.rolloff
        if alpha is None:
            alpha = self.default_rolloff
        return max(alpha, 0.0)

    def _info_bits_per_symbol(self, entry: ModcodEntry, rolloff: float | None) -> float:
        if entry.info_bits_per_symbol is None:
            raise ValueError("info_bits_per_symbol is required for all ModCod entries")
        return entry.info_bits_per_symbol

    def _effective_spectral_efficiency(self, entry: ModcodEntry, rolloff: float | None) -> float:
        alpha = self._resolve_rolloff(entry, rolloff)
        info_bits = self._info_bits_per_symbol(entry, rolloff)
        return info_bits / (1 + alpha)

    def _bitrate_bps(self, entry: ModcodEntry, bandwidth_hz: float | None, rolloff: float | None) -> float | None:
        if bandwidth_hz is None:
            return None
        eff = self._effective_spectral_efficiency(entry, rolloff)
        return max(bandwidth_hz * eff, 1.0)

    def _required_cn0(self, entry: ModcodEntry, bandwidth_hz: float | None) -> float | None:
        if entry.required_cn0_dbhz is not None:
            return entry.required_cn0_dbhz
        return None

    def select_modcod(self, cn0_dbhz: float, bandwidth_hz: float | None = None, rolloff: float | None = None) -> ModcodEntry | None:
        entries = self._sorted_entries()
        if not entries:
            return None

        selected: ModcodEntry | None = None
        for entry in entries:
            required_cn0 = self._required_cn0(entry, bandwidth_hz)
            bitrate = self._bitrate_bps(entry, bandwidth_hz, rolloff)
            if bandwidth_hz is not None and bitrate is not None:
                available_ebno = cn0_dbhz - 10 * math.log10(bitrate)
                if required_cn0 is not None:
                    required_ebno = required_cn0 - 10 * math.log10(bitrate)
                elif entry.required_ebno_db is not None:
                    required_ebno = entry.required_ebno_db
                else:
                    required_ebno = None
                if required_ebno is None:
                    continue
                if available_ebno >= required_ebno:
                    selected = entry
            elif required_cn0 is not None and cn0_dbhz >= required_cn0:
                selected = entry
        return selected or entries[0]

    def select_modcod_with_margin(
        self, cn0_dbhz: float, bandwidth_hz: float | None = None, rolloff: float | None = None,
    ) -> tuple[ModcodEntry | None, float | None, float | None, float | None, float | None]:
        entry = self.select_modcod(cn0_dbhz, bandwidth_hz, rolloff)
        if entry is None:
            return None, None, None, None, None
        bitrate = self._bitrate_bps(entry, bandwidth_hz, rolloff)
        required_cn0 = self._required_cn0(entry, bandwidth_hz)
        if bitrate is None:
            return entry, None, required_cn0, None, None

        available_ebno = cn0_dbhz - 10 * math.log10(bitrate)
        if required_cn0 is not None:
            required_ebno = required_cn0 - 10 * math.log10(bitrate)
        elif entry.required_ebno_db is not None:
            required_ebno = entry.required_ebno_db
        else:
            required_ebno = None

        if required_ebno is None:
            return entry, available_ebno, None, None, bitrate

        margin = available_ebno - required_ebno
        return entry, available_ebno, required_ebno, margin, bitrate

    def effective_spectral_efficiency(self, entry: ModcodEntry, rolloff: float | None = None) -> float:
        return self._effective_spectral_efficiency(entry, rolloff)

    def spectral_efficiency(self) -> float:
        entries = self._sorted_entries()
        if not entries:
            return 1.0 / (1 + self.default_rolloff)
        return self._effective_spectral_efficiency(entries[-1], self.default_rolloff)
