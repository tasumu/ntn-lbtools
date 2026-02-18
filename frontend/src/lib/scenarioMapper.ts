import type { CalculationRequest } from "../api/schemas";
import type { ScenarioSummary } from "../api/types";

type InterferenceBlock =
  CalculationRequest["runtime"]["uplink"]["interference"];

type ScenarioPayloadRuntime = {
  bandwidth_hz?: number;
  sat_longitude_deg?: number;
  satellite_id?: string;
  modcod_table_id?: string;
  uplink?: DirectionRuntime;
  downlink?: DirectionRuntime;
  intermodulation?: IntermodulationBlock;
};

type DirectionRuntime = {
  frequency_hz?: number;
  bandwidth_hz?: number;
  rain_rate_mm_per_hr?: number;
  temperature_k?: number;
  pressure_hpa?: number;
  water_vapor_density?: number;
  ground_lat_deg?: number;
  ground_lon_deg?: number;
  ground_alt_m?: number;
  interference?: RawInterference;
};

type RawInterference = {
  adjacent_sat_ci_db?: number | null;
  cross_polar_ci_db?: number | null;
  other_carrier_ci_db?: number | null;
  applied?: boolean;
  notes?: string;
};

type IntermodulationBlock = {
  input_backoff_db?: number | null;
  output_backoff_db?: number | null;
  saturation_power_dbw?: number | null;
  composite_carriers?: number | null;
  reference_bandwidth_hz?: number | null;
  applied?: boolean;
};

type ScenarioPayload = {
  runtime?: ScenarioPayloadRuntime;
  metadata?: Record<string, string | undefined>;
  entity?: {
    satellite?: { id?: string; longitude_deg?: number };
    earth_station_tx?: { id?: string };
    earth_station_rx?: { id?: string };
    earth_station_tx_id?: string;
    earth_station_rx_id?: string;
  };
  static?: {
    modcod_table_id?: string;
    uplink_modcod_table_id?: string;
    downlink_modcod_table_id?: string;
  };
};

type ScenarioInput = Omit<ScenarioSummary, "payload_snapshot"> & {
  payload_snapshot?: ScenarioPayload;
};

const DEFAULT_UPLINK = {
  frequency_hz: 14.25e9,
  bandwidth_hz: 36e6,
  rain_rate_mm_per_hr: 10,
} as const;

const DEFAULT_DOWNLINK = {
  frequency_hz: 12e9,
  bandwidth_hz: 36e6,
  rain_rate_mm_per_hr: 10,
} as const;

function normalizeInterference(
  block: RawInterference | undefined,
): InterferenceBlock {
  if (!block) {
    return {
      adjacent_sat_ci_db: undefined,
      cross_polar_ci_db: undefined,
      other_carrier_ci_db: undefined,
      applied: false,
    };
  }
  return {
    adjacent_sat_ci_db: block.adjacent_sat_ci_db ?? undefined,
    cross_polar_ci_db: block.cross_polar_ci_db ?? undefined,
    other_carrier_ci_db: block.other_carrier_ci_db ?? undefined,
    applied: block.applied ?? false,
    notes: block.notes,
  };
}

function pickDirection(
  dir: DirectionRuntime | undefined,
  fallback: typeof DEFAULT_UPLINK | typeof DEFAULT_DOWNLINK,
  runtimeParent?: ScenarioPayloadRuntime,
) {
  const groundLat =
    dir?.ground_lat_deg ?? runtimeParent?.uplink?.ground_lat_deg ?? 0;
  const groundLon =
    dir?.ground_lon_deg ?? runtimeParent?.uplink?.ground_lon_deg ?? 0;
  const groundAlt =
    dir?.ground_alt_m ?? runtimeParent?.uplink?.ground_alt_m ?? 0;

  return {
    frequency_hz: dir?.frequency_hz ?? fallback.frequency_hz,
    bandwidth_hz: dir?.bandwidth_hz ?? fallback.bandwidth_hz,
    elevation_deg: undefined,
    rain_rate_mm_per_hr:
      dir?.rain_rate_mm_per_hr ?? fallback.rain_rate_mm_per_hr,
    temperature_k: dir?.temperature_k ?? 290,
    pressure_hpa: dir?.pressure_hpa ?? undefined,
    water_vapor_density: dir?.water_vapor_density ?? undefined,
    ground_lat_deg: groundLat,
    ground_lon_deg: groundLon,
    ground_alt_m: groundAlt,
    interference: normalizeInterference(dir?.interference),
  };
}

export function loadScenario(
  scenario: ScenarioInput,
): CalculationRequest | null {
  if (!scenario) return null;

  const runtime = scenario.payload_snapshot?.runtime;
  const meta = scenario.payload_snapshot?.metadata ?? {};
  const entity = scenario.payload_snapshot?.entity ?? {};
  const staticSnapshot = scenario.payload_snapshot?.static ?? {};

  const sharedBandwidth =
    runtime?.bandwidth_hz ??
    runtime?.uplink?.bandwidth_hz ??
    runtime?.downlink?.bandwidth_hz ??
    DEFAULT_UPLINK.bandwidth_hz;

  const satelliteId =
    scenario.satellite_id ||
    meta.satellite_id ||
    entity.satellite?.id ||
    runtime?.satellite_id ||
    undefined;

  const modcodId =
    scenario.modcod_table_id ||
    staticSnapshot.modcod_table_id ||
    meta.modcod_table_id ||
    runtime?.modcod_table_id ||
    undefined;

  const uplinkModcodId =
    staticSnapshot.uplink_modcod_table_id ||
    meta.uplink_modcod_table_id ||
    scenario.uplink_modcod_table_id ||
    modcodId ||
    undefined;

  const downlinkModcodId =
    staticSnapshot.downlink_modcod_table_id ||
    meta.downlink_modcod_table_id ||
    scenario.downlink_modcod_table_id ||
    modcodId ||
    undefined;

  return {
    waveform_strategy:
      (scenario.waveform_strategy as CalculationRequest["waveform_strategy"]) ||
      "DVB_S2X",
    transponder_type:
      (scenario.transponder_type as CalculationRequest["transponder_type"]) ||
      "TRANSPARENT",
    modcod_table_id: modcodId,
    uplink_modcod_table_id: uplinkModcodId,
    downlink_modcod_table_id: downlinkModcodId,
    satellite_id: satelliteId ?? "",
    earth_station_tx_id:
      meta.earth_station_tx_id ||
      entity.earth_station_tx_id ||
      entity.earth_station_tx?.id ||
      scenario.earth_station_tx_id ||
      undefined,
    earth_station_rx_id:
      meta.earth_station_rx_id ||
      entity.earth_station_rx_id ||
      entity.earth_station_rx?.id ||
      scenario.earth_station_rx_id ||
      undefined,
    runtime: {
      bandwidth_hz: sharedBandwidth,
      uplink: pickDirection(runtime?.uplink, DEFAULT_UPLINK, runtime),
      downlink: pickDirection(runtime?.downlink, DEFAULT_DOWNLINK, runtime),
      sat_longitude_deg:
        runtime?.sat_longitude_deg ??
        entity.satellite?.longitude_deg ??
        (meta.sat_longitude_deg ? Number(meta.sat_longitude_deg) : undefined),
      intermodulation: {
        input_backoff_db:
          runtime?.intermodulation?.input_backoff_db ?? undefined,
        output_backoff_db:
          runtime?.intermodulation?.output_backoff_db ?? undefined,
        saturation_power_dbw:
          runtime?.intermodulation?.saturation_power_dbw ?? undefined,
        composite_carriers:
          runtime?.intermodulation?.composite_carriers ?? undefined,
        reference_bandwidth_hz:
          runtime?.intermodulation?.reference_bandwidth_hz ?? undefined,
        applied: runtime?.intermodulation?.applied ?? false,
      },
    },
    overrides: undefined,
  };
}
