import type { CalculationResponse } from "../../api/schemas";
import type { ScenarioSummary } from "../../api/types";
import { loadScenario } from "../../lib/scenarioMapper";

export interface ParameterRow {
  readonly key: string;
  readonly label: string;
  readonly valueA: string;
  readonly valueB: string;
  readonly isDifferent: boolean;
}

export interface ResultRow {
  readonly key: string;
  readonly label: string;
  readonly valueA: string;
  readonly valueB: string;
  readonly delta: string;
  readonly isDifferent: boolean;
}

function fmt(value: unknown): string {
  if (value === undefined || value === null) return "-";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

const PARAM_LABELS: Record<string, string> = {
  waveform_strategy: "Waveform",
  transponder_type: "Transponder",
  satellite_id: "Satellite",
  earth_station_tx_id: "Earth Station (TX)",
  earth_station_rx_id: "Earth Station (RX)",
  modcod_table_id: "ModCod Table",
  "runtime.bandwidth_hz": "Channel Bandwidth (Hz)",
  "runtime.rolloff": "Rolloff",
  "runtime.uplink.frequency_hz": "Uplink Frequency (Hz)",
  "runtime.uplink.bandwidth_hz": "Uplink Bandwidth (Hz)",
  "runtime.uplink.rain_rate_mm_per_hr": "Uplink Rain Rate (mm/hr)",
  "runtime.uplink.ground_lat_deg": "Uplink Latitude (deg)",
  "runtime.uplink.ground_lon_deg": "Uplink Longitude (deg)",
  "runtime.uplink.ground_alt_m": "Uplink Altitude (m)",
  "runtime.downlink.frequency_hz": "Downlink Frequency (Hz)",
  "runtime.downlink.bandwidth_hz": "Downlink Bandwidth (Hz)",
  "runtime.downlink.rain_rate_mm_per_hr": "Downlink Rain Rate (mm/hr)",
  "runtime.downlink.ground_lat_deg": "Downlink Latitude (deg)",
  "runtime.downlink.ground_lon_deg": "Downlink Longitude (deg)",
  "runtime.downlink.ground_alt_m": "Downlink Altitude (m)",
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current !== null && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function extractParameters(
  scenario: ScenarioSummary,
): Record<string, string> {
  const req = loadScenario(scenario);
  if (!req) return {};

  const flat = req as unknown as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of Object.keys(PARAM_LABELS)) {
    result[key] = fmt(getNestedValue(flat, key));
  }
  return result;
}

export function diffParameters(
  paramsA: Record<string, string>,
  paramsB: Record<string, string>,
): ParameterRow[] {
  const allKeys = new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]);
  const rows: ParameterRow[] = [];

  for (const key of Object.keys(PARAM_LABELS)) {
    if (!allKeys.has(key)) continue;
    const valueA = paramsA[key] ?? "-";
    const valueB = paramsB[key] ?? "-";
    rows.push({
      key,
      label: PARAM_LABELS[key] ?? key,
      valueA,
      valueB,
      isDifferent: valueA !== valueB,
    });
  }
  return rows;
}

const RESULT_LABELS: Record<string, string> = {
  "uplink.cn_db": "Uplink C/N (dB)",
  "uplink.cn0_dbhz": "Uplink C/N0 (dB-Hz)",
  "uplink.link_margin_db": "Uplink Link Margin (dB)",
  "uplink.fspl_db": "Uplink FSPL (dB)",
  "uplink.atm_loss_db": "Uplink Atm. Loss (dB)",
  "downlink.cn_db": "Downlink C/N (dB)",
  "downlink.cn0_dbhz": "Downlink C/N0 (dB-Hz)",
  "downlink.link_margin_db": "Downlink Link Margin (dB)",
  "downlink.fspl_db": "Downlink FSPL (dB)",
  "downlink.atm_loss_db": "Downlink Atm. Loss (dB)",
  "combined.cn_db": "Combined C/N (dB)",
  "combined.cn0_dbhz": "Combined C/N0 (dB-Hz)",
  "combined.link_margin_db": "Combined Link Margin (dB)",
};

export function extractResultSummary(
  response: CalculationResponse,
): Record<string, string> {
  const results = response.results as unknown as Record<string, unknown>;
  const summary: Record<string, string> = {};
  for (const key of Object.keys(RESULT_LABELS)) {
    summary[key] = fmt(getNestedValue(results, key));
  }
  return summary;
}

export function diffResults(
  summaryA: Record<string, string>,
  summaryB: Record<string, string>,
): ResultRow[] {
  const rows: ResultRow[] = [];

  for (const key of Object.keys(RESULT_LABELS)) {
    const valueA = summaryA[key] ?? "-";
    const valueB = summaryB[key] ?? "-";
    const numA = parseFloat(valueA);
    const numB = parseFloat(valueB);
    const hasDelta = Number.isFinite(numA) && Number.isFinite(numB);
    const deltaNum = hasDelta ? numB - numA : 0;
    const delta = hasDelta
      ? `${deltaNum >= 0 ? "+" : ""}${deltaNum.toFixed(2)}`
      : "-";

    rows.push({
      key,
      label: RESULT_LABELS[key] ?? key,
      valueA,
      valueB,
      delta,
      isDifferent: valueA !== valueB,
    });
  }
  return rows;
}
