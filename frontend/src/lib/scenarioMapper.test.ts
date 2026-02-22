import { describe, it, expect } from "vitest";
import { loadScenario } from "./scenarioMapper";

const baseScenario = {
  id: "test-id",
  name: "Test Scenario",
  description: "Test description",
  waveform_strategy: "DVB_S2X" as const,
  transponder_type: "TRANSPARENT" as const,
  satellite_id: "",
  earth_station_tx_id: "",
  earth_station_rx_id: "",
  modcod_table_id: "",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("loadScenario", () => {
  it("returns null for falsy input", () => {
    expect(loadScenario(null as never)).toBeNull();
  });

  it("returns defaults when no payload_snapshot", () => {
    const result = loadScenario({ ...baseScenario });
    expect(result).not.toBeNull();
    expect(result!.waveform_strategy).toBe("DVB_S2X");
    expect(result!.transponder_type).toBe("TRANSPARENT");
    expect(result!.runtime.bandwidth_hz).toBe(36e6);
  });

  it("uses default uplink frequency when not specified", () => {
    const result = loadScenario({ ...baseScenario });
    expect(result!.runtime.uplink.frequency_hz).toBe(14.25e9);
    expect(result!.runtime.uplink.rain_rate_mm_per_hr).toBe(10);
  });

  it("uses default downlink frequency when not specified", () => {
    const result = loadScenario({ ...baseScenario });
    expect(result!.runtime.downlink.frequency_hz).toBe(12e9);
    expect(result!.runtime.downlink.rain_rate_mm_per_hr).toBe(10);
  });

  it("uses provided runtime values over defaults", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: {
          bandwidth_hz: 50e6,
          uplink: {
            frequency_hz: 14.5e9,
            rain_rate_mm_per_hr: 20,
            temperature_k: 300,
            ground_lat_deg: 35.5,
            ground_lon_deg: 139.7,
            ground_alt_m: 50,
          },
          downlink: {
            frequency_hz: 11.5e9,
            bandwidth_hz: 50e6,
            rain_rate_mm_per_hr: 15,
          },
        },
      },
    });

    expect(result!.runtime.bandwidth_hz).toBe(50e6);
    expect(result!.runtime.uplink.frequency_hz).toBe(14.5e9);
    expect(result!.runtime.uplink.rain_rate_mm_per_hr).toBe(20);
    expect(result!.runtime.uplink.temperature_k).toBe(300);
    expect(result!.runtime.uplink.ground_lat_deg).toBe(35.5);
    expect(result!.runtime.uplink.ground_lon_deg).toBe(139.7);
    expect(result!.runtime.uplink.ground_alt_m).toBe(50);
    expect(result!.runtime.downlink.frequency_hz).toBe(11.5e9);
    expect(result!.runtime.downlink.rain_rate_mm_per_hr).toBe(15);
  });

  it("defaults temperature_k to 290", () => {
    const result = loadScenario({ ...baseScenario });
    expect(result!.runtime.uplink.temperature_k).toBe(290);
    expect(result!.runtime.downlink.temperature_k).toBe(290);
  });

  it("resolves satellite_id from scenario level", () => {
    const result = loadScenario({
      ...baseScenario,
      satellite_id: "sat-1",
    });
    expect(result!.satellite_id).toBe("sat-1");
  });

  it("resolves satellite_id from metadata", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        metadata: { satellite_id: "sat-meta" },
      },
    });
    expect(result!.satellite_id).toBe("sat-meta");
  });

  it("resolves satellite_id from entity", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        entity: { satellite: { id: "sat-entity" } },
      },
    });
    expect(result!.satellite_id).toBe("sat-entity");
  });

  it("resolves satellite_id from runtime", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: { satellite_id: "sat-runtime" },
      },
    });
    expect(result!.satellite_id).toBe("sat-runtime");
  });

  it("prefers scenario-level satellite_id over metadata", () => {
    const result = loadScenario({
      ...baseScenario,
      satellite_id: "sat-scenario",
      payload_snapshot: {
        metadata: { satellite_id: "sat-meta" },
      },
    });
    expect(result!.satellite_id).toBe("sat-scenario");
  });

  it("resolves modcod_table_id from static snapshot", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        static: { modcod_table_id: "modcod-static" },
      },
    });
    expect(result!.modcod_table_id).toBe("modcod-static");
  });

  it("resolves uplink and downlink modcod_table_ids", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        static: {
          uplink_modcod_table_id: "ul-modcod",
          downlink_modcod_table_id: "dl-modcod",
        },
      },
    });
    expect(result!.uplink_modcod_table_id).toBe("ul-modcod");
    expect(result!.downlink_modcod_table_id).toBe("dl-modcod");
  });

  it("falls back modcod IDs to shared modcod_table_id", () => {
    const result = loadScenario({
      ...baseScenario,
      modcod_table_id: "shared-modcod",
    });
    expect(result!.modcod_table_id).toBe("shared-modcod");
    expect(result!.uplink_modcod_table_id).toBe("shared-modcod");
    expect(result!.downlink_modcod_table_id).toBe("shared-modcod");
  });

  it("resolves earth_station_tx_id from metadata", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        metadata: { earth_station_tx_id: "es-tx-meta" },
      },
    });
    expect(result!.earth_station_tx_id).toBe("es-tx-meta");
  });

  it("resolves earth_station_rx_id from entity", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        entity: { earth_station_rx: { id: "es-rx-entity" } },
      },
    });
    expect(result!.earth_station_rx_id).toBe("es-rx-entity");
  });

  it("normalizes interference with defaults when not present", () => {
    const result = loadScenario({ ...baseScenario });
    const intf = result!.runtime.uplink.interference!;
    expect(intf.applied).toBe(false);
    expect(intf.adjacent_sat_ci_db).toBeUndefined();
    expect(intf.cross_polar_ci_db).toBeUndefined();
    expect(intf.other_carrier_ci_db).toBeUndefined();
  });

  it("normalizes interference with provided values", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: {
          uplink: {
            interference: {
              adjacent_sat_ci_db: 25,
              cross_polar_ci_db: 30,
              other_carrier_ci_db: null,
              applied: true,
              notes: "test note",
            },
          },
        },
      },
    });
    const intf = result!.runtime.uplink.interference!;
    expect(intf.applied).toBe(true);
    expect(intf.adjacent_sat_ci_db).toBe(25);
    expect(intf.cross_polar_ci_db).toBe(30);
    expect(intf.other_carrier_ci_db).toBeUndefined();
    expect(intf.notes).toBe("test note");
  });

  it("sets intermodulation defaults", () => {
    const result = loadScenario({ ...baseScenario });
    const im = result!.runtime.intermodulation!;
    expect(im.applied).toBe(false);
    expect(im.input_backoff_db).toBeUndefined();
    expect(im.output_backoff_db).toBeUndefined();
  });

  it("passes through intermodulation values", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: {
          intermodulation: {
            input_backoff_db: 3,
            output_backoff_db: 2,
            saturation_power_dbw: 50,
            composite_carriers: 8,
            reference_bandwidth_hz: 36e6,
            applied: true,
          },
        },
      },
    });
    const im = result!.runtime.intermodulation!;
    expect(im.applied).toBe(true);
    expect(im.input_backoff_db).toBe(3);
    expect(im.output_backoff_db).toBe(2);
    expect(im.saturation_power_dbw).toBe(50);
    expect(im.composite_carriers).toBe(8);
    expect(im.reference_bandwidth_hz).toBe(36e6);
  });

  it("resolves sat_longitude_deg from runtime", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: { sat_longitude_deg: 128.2 },
      },
    });
    expect(result!.runtime.sat_longitude_deg).toBe(128.2);
  });

  it("resolves sat_longitude_deg from entity satellite", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        entity: { satellite: { longitude_deg: 110 } },
      },
    });
    expect(result!.runtime.sat_longitude_deg).toBe(110);
  });

  it("sets waveform_strategy and transponder_type from scenario", () => {
    const result = loadScenario({
      ...baseScenario,
      waveform_strategy: "DVB_S2",
      transponder_type: "REGENERATIVE",
    });
    expect(result!.waveform_strategy).toBe("DVB_S2");
    expect(result!.transponder_type).toBe("REGENERATIVE");
  });

  it("defaults waveform_strategy to DVB_S2X", () => {
    const result = loadScenario({
      ...baseScenario,
      waveform_strategy: "",
    });
    expect(result!.waveform_strategy).toBe("DVB_S2X");
  });

  it("defaults transponder_type to TRANSPARENT", () => {
    const result = loadScenario({
      ...baseScenario,
      transponder_type: "",
    });
    expect(result!.transponder_type).toBe("TRANSPARENT");
  });

  it("sets overrides to undefined", () => {
    const result = loadScenario({ ...baseScenario });
    expect(result!.overrides).toBeUndefined();
  });

  it("resolves bandwidth from uplink when no shared bandwidth", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: {
          uplink: { bandwidth_hz: 72e6 },
        },
      },
    });
    expect(result!.runtime.bandwidth_hz).toBe(72e6);
  });

  it("resolves earth_station_tx_id from entity flat field", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        entity: { earth_station_tx_id: "es-tx-flat" },
      },
    });
    expect(result!.earth_station_tx_id).toBe("es-tx-flat");
  });

  it("resolves sat_latitude_deg from runtime", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: { sat_latitude_deg: 35.5 },
      },
    });
    expect(result!.runtime.sat_latitude_deg).toBe(35.5);
  });

  it("resolves sat_altitude_km from runtime", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: { sat_altitude_km: 550.0 },
      },
    });
    expect(result!.runtime.sat_altitude_km).toBe(550.0);
  });

  it("resolves computation_datetime from runtime", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: { computation_datetime: "2024-12-15T10:30:00Z" },
      },
    });
    expect(result!.runtime.computation_datetime).toBe("2024-12-15T10:30:00Z");
  });

  it("defaults LEO fields to undefined when absent", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: { sat_longitude_deg: 140.0 },
      },
    });
    expect(result!.runtime.sat_latitude_deg).toBeUndefined();
    expect(result!.runtime.sat_altitude_km).toBeUndefined();
    expect(result!.runtime.computation_datetime).toBeUndefined();
  });

  it("restores all LEO parameters together", () => {
    const result = loadScenario({
      ...baseScenario,
      payload_snapshot: {
        runtime: {
          sat_longitude_deg: 45.2,
          sat_latitude_deg: -12.8,
          sat_altitude_km: 550.0,
          computation_datetime: "2024-12-15T10:30:00Z",
          bandwidth_hz: 50e6,
        },
      },
    });
    expect(result!.runtime.sat_longitude_deg).toBe(45.2);
    expect(result!.runtime.sat_latitude_deg).toBe(-12.8);
    expect(result!.runtime.sat_altitude_km).toBe(550.0);
    expect(result!.runtime.computation_datetime).toBe("2024-12-15T10:30:00Z");
    expect(result!.runtime.bandwidth_hz).toBe(50e6);
  });
});
