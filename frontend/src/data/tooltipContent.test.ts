import { describe, expect, it } from "vitest";

import { TOOLTIP_CONTENT } from "./tooltipContent";

const EXPECTED_KEYS = [
  "waveform",
  "transponder_type",
  "modcod_table",
  "satellite",
  "earth_station_tx",
  "earth_station_rx",
  "rolloff",
  "bandwidth_hz",
  "uplink_frequency",
  "uplink_bandwidth",
  "uplink_ground_lat",
  "uplink_ground_lon",
  "uplink_ground_alt",
  "uplink_rain_rate",
  "uplink_modcod",
  "downlink_frequency",
  "downlink_bandwidth",
  "downlink_ground_lat",
  "downlink_ground_lon",
  "downlink_ground_alt",
  "downlink_rain_rate",
  "downlink_modcod",
  "adjacent_sat_ci",
  "cross_polar_ci",
  "other_carrier_ci",
  "input_backoff",
  "output_backoff",
  "saturation_power",
  "composite_carriers",
  "reference_bandwidth",
];

describe("TOOLTIP_CONTENT", () => {
  it("has all 30 expected keys", () => {
    for (const key of EXPECTED_KEYS) {
      expect(TOOLTIP_CONTENT[key], `missing key: ${key}`).toBeDefined();
    }
    expect(Object.keys(TOOLTIP_CONTENT).length).toBe(EXPECTED_KEYS.length);
  });

  it("each entry has description > 10 chars and typicalRange > 3 chars", () => {
    for (const [key, entry] of Object.entries(TOOLTIP_CONTENT)) {
      expect(
        entry.description.length,
        `${key} description too short`,
      ).toBeGreaterThan(10);
      expect(
        entry.typicalRange.length,
        `${key} typicalRange too short`,
      ).toBeGreaterThan(3);
    }
  });
});
