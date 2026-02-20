import { describe, expect, it } from "vitest";

import {
  diffParameters,
  diffResults,
  extractParameters,
  extractResultSummary,
} from "./comparisonUtils";
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
  it("extracts result metrics from a calculation response", () => {
    const summary = extractResultSummary(
      mockCalculationResponse as unknown as CalculationResponse,
    );
    expect(summary["uplink.cn_db"]).toBe("12.5");
    expect(summary["downlink.cn_db"]).toBe("12.5");
    expect(summary["combined.cn_db"]).toBe("9.5");
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
