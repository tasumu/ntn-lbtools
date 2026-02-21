import { describe, expect, it } from "vitest";

import {
  diffParameters,
  diffResults,
  extractParameters,
  extractResultSummary,
  resolveAssetNames,
} from "./comparisonUtils";
import type { ParameterRow } from "./comparisonUtils";
import { mockCalculationResponse, mockScenario } from "../../test/handlers";
import type { ScenarioSummary } from "../../api/types";
import type { CalculationResponse } from "../../api/schemas";

const scenarioA: ScenarioSummary = {
  ...mockScenario,
  id: "sc-001",
  name: "Scenario A",
};

const scenarioB: ScenarioSummary = {
  ...mockScenario,
  id: "sc-002",
  name: "Scenario B",
  satellite_id: "sat-002",
  payload_snapshot: {
    runtime: {
      bandwidth_hz: 72e6,
      uplink: {
        frequency_hz: 14.5e9,
        bandwidth_hz: 72e6,
        rain_rate_mm_per_hr: 20,
        ground_lat_deg: 40,
        ground_lon_deg: 140,
        ground_alt_m: 100,
      },
      downlink: {
        frequency_hz: 11.5e9,
        bandwidth_hz: 72e6,
        rain_rate_mm_per_hr: 15,
        ground_lat_deg: 40,
        ground_lon_deg: 140,
        ground_alt_m: 100,
      },
    },
  },
};

describe("extractParameters", () => {
  it("returns a flat record of parameter strings", () => {
    const params = extractParameters(scenarioA);
    expect(params["waveform_strategy"]).toBe("DVB_S2X");
    expect(params["transponder_type"]).toBe("TRANSPARENT");
    expect(params["satellite_id"]).toBe("sat-001");
  });

  it("includes runtime parameters", () => {
    const params = extractParameters(scenarioA);
    expect(params["runtime.bandwidth_hz"]).toBeDefined();
    expect(params["runtime.uplink.frequency_hz"]).toBeDefined();
  });
});

describe("diffParameters", () => {
  it("marks differing parameters", () => {
    const paramsA = extractParameters(scenarioA);
    const paramsB = extractParameters(scenarioB);
    const diff = diffParameters(paramsA, paramsB);

    expect(diff.length).toBeGreaterThan(0);

    const satRow = diff.find((r) => r.key === "satellite_id");
    expect(satRow).toBeDefined();
    expect(satRow!.isDifferent).toBe(true);
    expect(satRow!.valueA).toBe("sat-001");
    expect(satRow!.valueB).toBe("sat-002");
  });

  it("marks identical parameters as not different", () => {
    const paramsA = extractParameters(scenarioA);
    const paramsB = extractParameters(scenarioA);
    const diff = diffParameters(paramsA, paramsB);

    expect(diff.every((r) => !r.isDifferent)).toBe(true);
  });

  it("has human-readable labels", () => {
    const paramsA = extractParameters(scenarioA);
    const diff = diffParameters(paramsA, paramsA);
    const satRow = diff.find((r) => r.key === "satellite_id");
    expect(satRow!.label).toBe("Satellite");
  });
});

describe("extractResultSummary", () => {
  it("formats result values to 2 decimal places", () => {
    const summary = extractResultSummary(
      mockCalculationResponse as unknown as CalculationResponse,
    );
    expect(summary["uplink.cn_db"]).toBe("12.50");
    expect(summary["downlink.cn_db"]).toBe("12.50");
    expect(summary["combined.cn_db"]).toBe("9.50");
    expect(summary["uplink.cn0_dbhz"]).toBe("88.10");
    expect(summary["combined.link_margin_db"]).toBe("2.00");
  });

  it("returns dash for missing result values", () => {
    const minimal = {
      ...mockCalculationResponse,
      results: { uplink: {}, downlink: {}, combined: {} },
    };
    const summary = extractResultSummary(
      minimal as unknown as CalculationResponse,
    );
    expect(summary["uplink.cn_db"]).toBe("-");
  });
});

describe("diffResults", () => {
  it("computes delta between two result summaries", () => {
    const summaryA = extractResultSummary(
      mockCalculationResponse as unknown as CalculationResponse,
    );
    const summaryB: Record<string, string> = {
      ...summaryA,
      "combined.cn_db": "11.0",
    };
    const diff = diffResults(summaryA, summaryB);
    const combinedRow = diff.find((r) => r.key === "combined.cn_db");
    expect(combinedRow).toBeDefined();
    expect(combinedRow!.isDifferent).toBe(true);
    expect(combinedRow!.delta).toBe("+1.50");
  });

  it("shows no difference for identical results", () => {
    const summary = extractResultSummary(
      mockCalculationResponse as unknown as CalculationResponse,
    );
    const diff = diffResults(summary, summary);
    expect(diff.every((r) => !r.isDifferent)).toBe(true);
    expect(diff.every((r) => r.delta === "+0.00")).toBe(true);
  });
});

describe("resolveAssetNames", () => {
  const assetMap: ReadonlyMap<string, string> = new Map([
    ["sat-001", "GEO Satellite Alpha"],
    ["sat-002", "GEO Satellite Beta"],
    ["es-001", "Tokyo Ground Station"],
    ["es-002", "Osaka Ground Station"],
    ["mc-001", "DVB-S2X Standard"],
  ]);

  const rows: ParameterRow[] = [
    {
      key: "satellite_id",
      label: "Satellite",
      valueA: "sat-001",
      valueB: "sat-002",
      isDifferent: true,
    },
    {
      key: "earth_station_tx_id",
      label: "Earth Station (TX)",
      valueA: "es-001",
      valueB: "es-001",
      isDifferent: false,
    },
    {
      key: "earth_station_rx_id",
      label: "Earth Station (RX)",
      valueA: "es-001",
      valueB: "es-002",
      isDifferent: true,
    },
    {
      key: "modcod_table_id",
      label: "ModCod Table",
      valueA: "mc-001",
      valueB: "mc-001",
      isDifferent: false,
    },
    {
      key: "waveform_strategy",
      label: "Waveform",
      valueA: "DVB_S2X",
      valueB: "DVB_S2X",
      isDifferent: false,
    },
  ];

  it("replaces satellite_id UUID with asset name", () => {
    const resolved = resolveAssetNames(rows, assetMap);
    const sat = resolved.find((r) => r.key === "satellite_id")!;
    expect(sat.valueA).toBe("GEO Satellite Alpha");
    expect(sat.valueB).toBe("GEO Satellite Beta");
  });

  it("replaces earth_station_tx_id and earth_station_rx_id UUIDs with names", () => {
    const resolved = resolveAssetNames(rows, assetMap);
    const tx = resolved.find((r) => r.key === "earth_station_tx_id")!;
    expect(tx.valueA).toBe("Tokyo Ground Station");
    const rx = resolved.find((r) => r.key === "earth_station_rx_id")!;
    expect(rx.valueB).toBe("Osaka Ground Station");
  });

  it("replaces modcod_table_id UUID with name", () => {
    const resolved = resolveAssetNames(rows, assetMap);
    const mc = resolved.find((r) => r.key === "modcod_table_id")!;
    expect(mc.valueA).toBe("DVB-S2X Standard");
  });

  it("keeps UUID if asset not found in map", () => {
    const sparseMap = new Map([["sat-001", "Known Satellite"]]);
    const resolved = resolveAssetNames(rows, sparseMap);
    const sat = resolved.find((r) => r.key === "satellite_id")!;
    expect(sat.valueA).toBe("Known Satellite");
    expect(sat.valueB).toBe("sat-002"); // not in map, keeps UUID
  });

  it("does not modify non-asset parameters", () => {
    const resolved = resolveAssetNames(rows, assetMap);
    const waveform = resolved.find((r) => r.key === "waveform_strategy")!;
    expect(waveform.valueA).toBe("DVB_S2X");
    expect(waveform.valueB).toBe("DVB_S2X");
  });

  it("returns new array without mutating original", () => {
    const resolved = resolveAssetNames(rows, assetMap);
    expect(resolved).not.toBe(rows);
    expect(rows[0].valueA).toBe("sat-001"); // original unchanged
  });
});
