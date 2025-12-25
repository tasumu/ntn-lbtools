import { describe, expect, it } from "vitest";

import { calculationResponseSchema, runtimeParametersSchema } from "../src/api/schemas";

describe("runtimeParametersSchema", () => {
  it("accepts valid runtime parameters", () => {
    const parsed = runtimeParametersSchema.parse({
      sat_longitude_deg: 140,
      uplink: {
        frequency_hz: 14.25e9,
        bandwidth_hz: 36e6,
        elevation_deg: 35,
        rain_rate_mm_per_hr: 10,
        temperature_k: 290,
        ground_lat_deg: 35,
        ground_lon_deg: 139,
        ground_alt_m: 0,
        interference: {
          adjacent_sat_ci_db: 30,
          cross_polar_ci_db: 25,
          other_carrier_ci_db: null,
          applied: false,
        },
      },
      downlink: {
        frequency_hz: 12e9,
        bandwidth_hz: 36e6,
        elevation_deg: 35,
        rain_rate_mm_per_hr: 10,
        temperature_k: 290,
        ground_lat_deg: -35,
        ground_lon_deg: -10,
        ground_alt_m: 0,
        interference: {
          adjacent_sat_ci_db: 30,
          cross_polar_ci_db: 25,
          other_carrier_ci_db: null,
          applied: false,
        },
      },
      intermodulation: {
        input_backoff_db: 3,
        output_backoff_db: 3,
        composite_carriers: 2,
        reference_bandwidth_hz: 36e6,
        applied: true,
      },
    });
    expect(parsed.uplink.frequency_hz).toBe(14.25e9);
  });

  it("rejects invalid elevation", () => {
    expect(() =>
      runtimeParametersSchema.parse({
        sat_longitude_deg: 140,
        uplink: {
          frequency_hz: 14.25e9,
          bandwidth_hz: 36e6,
          elevation_deg: -5,
          rain_rate_mm_per_hr: 10,
          temperature_k: 290,
        },
        downlink: {
          frequency_hz: 12e9,
          bandwidth_hz: 36e6,
          elevation_deg: 35,
          rain_rate_mm_per_hr: 10,
          temperature_k: 290,
        },
      }),
    ).toThrow();
  });
});

describe("calculationResponseSchema", () => {
  it("parses minimal response shape", () => {
    const payload = {
      schema_version: "1.1.0",
      strategy: { waveform_strategy: "DVB_S2X", transponder_type: "TRANSPARENT" },
      results: {
        uplink: {
          direction: "uplink",
          fspl_db: 1,
          rain_loss_db: 0,
          gas_loss_db: 0,
          cloud_loss_db: 0,
          atm_loss_db: 1,
          antenna_pointing_loss_db: 0.1,
          gt_db_per_k: 20,
          cn_db: 1,
          cn0_dbhz: 1,
          link_margin_db: 1,
          modcod_selected: "qpsk-1/4",
          eirp_dbw: 50,
          bandwidth_hz: 36e6,
          cni_db: 1,
          c_im_db: 21,
        },
        downlink: {
          direction: "downlink",
          fspl_db: 1,
          rain_loss_db: 0,
          gas_loss_db: 0,
          cloud_loss_db: 0,
          atm_loss_db: 1,
          antenna_pointing_loss_db: 0.1,
          gt_db_per_k: 20,
          cn_db: 1,
          cn0_dbhz: 1,
          link_margin_db: 1,
          modcod_selected: "qpsk-1/4",
          eirp_dbw: 50,
          bandwidth_hz: 36e6,
          cni_db: 1,
          c_im_db: 21,
        },
        combined: {
          cn_db: 1,
          cn0_dbhz: 1,
          cni_db: 1,
          cni0_dbhz: 1,
          c_im_db: 21,
          link_margin_db: 1,
        },
      },
      modcod_selected: { id: "qpsk-1/4" },
      runtime_echo: {
        sat_longitude_deg: 140,
        uplink: {
          frequency_hz: 14.25e9,
          bandwidth_hz: 36e6,
          elevation_deg: 35,
          rain_rate_mm_per_hr: 10,
          temperature_k: 290,
          ground_lat_deg: 35,
          ground_lon_deg: 139,
          ground_alt_m: 0,
          interference: { adjacent_sat_ci_db: 30, cross_polar_ci_db: 25, other_carrier_ci_db: null, applied: false },
        },
        downlink: {
          frequency_hz: 12e9,
          bandwidth_hz: 36e6,
          elevation_deg: 35,
          rain_rate_mm_per_hr: 10,
          temperature_k: 290,
          ground_lat_deg: -35,
          ground_lon_deg: -10,
          ground_alt_m: 0,
          interference: { adjacent_sat_ci_db: 30, cross_polar_ci_db: 25, other_carrier_ci_db: null, applied: false },
        },
        intermodulation: { input_backoff_db: 3, output_backoff_db: 3, composite_carriers: 2, reference_bandwidth_hz: 36e6, applied: true },
      },
      payload_snapshot: {
        static: {},
        entity: {},
        runtime: {
          sat_longitude_deg: 140,
          uplink: {
            frequency_hz: 14.25e9,
            bandwidth_hz: 36e6,
            elevation_deg: 35,
            rain_rate_mm_per_hr: 10,
            temperature_k: 290,
            ground_lat_deg: 35,
            ground_lon_deg: 139,
            ground_alt_m: 0,
          },
          downlink: {
            frequency_hz: 12e9,
            bandwidth_hz: 36e6,
            elevation_deg: 35,
            rain_rate_mm_per_hr: 10,
            temperature_k: 290,
            ground_lat_deg: -35,
            ground_lon_deg: -10,
            ground_alt_m: 0,
            interference: { adjacent_sat_ci_db: 30, cross_polar_ci_db: 25, other_carrier_ci_db: null, applied: false },
          },
        },
        strategy: { waveform_strategy: "DVB_S2X", transponder_type: "TRANSPARENT" },
        metadata: { schema_version: "1.1.0" },
        overrides: { mitigation: { uplink_db: 0, downlink_db: 0 } },
      },
    };

    const parsed = calculationResponseSchema.parse(payload);
    expect(parsed.schema_version).toBe("1.1.0");
    expect(parsed.results.uplink.modcod_selected).toBe("qpsk-1/4");
  });
});
