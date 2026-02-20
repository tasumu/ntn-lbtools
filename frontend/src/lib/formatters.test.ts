import { describe, it, expect } from "vitest";
import {
  formatDb,
  formatHz,
  formatDeg,
  formatModcod,
  formatThroughput,
  formatApplied,
  formatError,
} from "./formatters";

describe("formatDb", () => {
  it("formats a positive number to 2 decimal places", () => {
    expect(formatDb(12.345)).toBe("12.35");
  });

  it("formats zero", () => {
    expect(formatDb(0)).toBe("0.00");
  });

  it("formats a negative number", () => {
    expect(formatDb(-3.1)).toBe("-3.10");
  });

  it("returns dash for null", () => {
    expect(formatDb(null)).toBe("-");
  });

  it("returns dash for undefined", () => {
    expect(formatDb(undefined)).toBe("-");
  });

  it("returns dash for NaN", () => {
    expect(formatDb(NaN)).toBe("-");
  });

  it("returns dash for Infinity", () => {
    expect(formatDb(Infinity)).toBe("-");
  });

  it("handles string numbers via toNumber coercion", () => {
    // toNumber coerces strings
    expect(formatDb("5.5" as unknown as number)).toBe("5.50");
  });

  it("returns dash for non-numeric string", () => {
    expect(formatDb("abc" as unknown as number)).toBe("-");
  });
});

describe("formatHz", () => {
  it("formats Hz with locale string", () => {
    const result = formatHz(14250000000);
    expect(result).toMatch(/14.*250.*000.*000 Hz/);
  });

  it("formats small Hz values", () => {
    expect(formatHz(1000)).toMatch(/1.*000 Hz/);
  });

  it("returns dash for null", () => {
    expect(formatHz(null)).toBe("-");
  });

  it("returns dash for undefined", () => {
    expect(formatHz(undefined)).toBe("-");
  });

  it("formats zero", () => {
    expect(formatHz(0)).toBe("0 Hz");
  });
});

describe("formatDeg", () => {
  it("formats degrees to 2 decimal places", () => {
    expect(formatDeg(45.678)).toBe("45.68");
  });

  it("formats zero", () => {
    expect(formatDeg(0)).toBe("0.00");
  });

  it("formats negative degrees", () => {
    expect(formatDeg(-12.1)).toBe("-12.10");
  });

  it("returns dash for null", () => {
    expect(formatDeg(null)).toBe("-");
  });

  it("returns dash for undefined", () => {
    expect(formatDeg(undefined)).toBe("-");
  });
});

describe("formatModcod", () => {
  it("returns dash for undefined", () => {
    expect(formatModcod(undefined)).toBe("-");
  });

  it("returns dash for null", () => {
    expect(formatModcod(null as unknown as undefined)).toBe("-");
  });

  it("formats a single modcod with modulation and code_rate", () => {
    const modcod = { id: "m1", modulation: "8PSK", code_rate: "3/4" };
    expect(formatModcod(modcod)).toBe("8PSK 3/4");
  });

  it("formats a single modcod with only modulation", () => {
    const modcod = { id: "m2", modulation: "QPSK", code_rate: null };
    expect(formatModcod(modcod)).toBe("QPSK");
  });

  it("falls back to id for a single modcod with no modulation/code_rate", () => {
    const modcod = { id: "modcod-1", modulation: null, code_rate: null };
    expect(formatModcod(modcod)).toBe("modcod-1");
  });

  it("returns empty string for single modcod with empty id and null fields", () => {
    const modcod = { id: "", modulation: null, code_rate: null };
    expect(formatModcod(modcod)).toBe("");
  });

  it("formats a directional modcod (with direction param)", () => {
    const modcod = {
      uplink: { id: "u1", modulation: "QPSK", code_rate: "1/2" },
      downlink: { id: "d1", modulation: "8PSK", code_rate: "3/4" },
    };
    expect(formatModcod(modcod, "uplink")).toBe("QPSK 1/2");
    expect(formatModcod(modcod, "downlink")).toBe("8PSK 3/4");
  });

  it("formats a directional modcod (without direction param)", () => {
    const modcod = {
      uplink: { id: "u1", modulation: "QPSK", code_rate: "1/2" },
      downlink: { id: "d1", modulation: "8PSK", code_rate: "3/4" },
    };
    // Falls back to downlink || uplink
    expect(formatModcod(modcod)).toBe("8PSK 3/4");
  });

  it("returns dash for directional modcod with null target", () => {
    const modcod = {
      uplink: null,
      downlink: null,
    };
    expect(formatModcod(modcod, "uplink")).toBe("-");
  });
});

describe("formatThroughput", () => {
  it("computes Mbps from bandwidth and spectral efficiency", () => {
    expect(formatThroughput(36e6, 0.5)).toBe("18.00 Mbps");
  });

  it("computes kbps for small values", () => {
    expect(formatThroughput(100e3, 0.5)).toBe("50.00 kbps");
  });

  it("computes bps for very small values", () => {
    expect(formatThroughput(100, 0.5)).toBe("50.00 bps");
  });

  it("returns dash for null bandwidth", () => {
    expect(formatThroughput(null, 0.5)).toBe("-");
  });

  it("returns dash for null spectral efficiency", () => {
    expect(formatThroughput(36e6, null)).toBe("-");
  });

  it("returns dash for undefined inputs", () => {
    expect(formatThroughput(undefined, undefined)).toBe("-");
  });

  it("handles high spectral efficiency", () => {
    expect(formatThroughput(36e6, 4.0)).toBe("144.00 Mbps");
  });
});

describe("formatApplied", () => {
  it("returns 'Applied' for true", () => {
    expect(formatApplied(true)).toBe("Applied");
  });

  it("returns 'Not applied' for false", () => {
    expect(formatApplied(false)).toBe("Not applied");
  });

  it("returns 'Not applied' for undefined", () => {
    expect(formatApplied(undefined)).toBe("Not applied");
  });
});

describe("formatError", () => {
  it("returns empty string for falsy values", () => {
    expect(formatError(null)).toBe("");
    expect(formatError(undefined)).toBe("");
    expect(formatError("")).toBe("");
    expect(formatError(0)).toBe("");
  });

  it("returns the string directly for string input", () => {
    expect(formatError("Something failed")).toBe("Something failed");
  });

  it("returns message for Error instances", () => {
    expect(formatError(new Error("test error"))).toBe("test error");
  });

  it("extracts string detail from object", () => {
    expect(formatError({ detail: "Not found" })).toBe("Not found");
  });

  it("extracts object detail as JSON", () => {
    expect(formatError({ detail: { key: "value" } })).toBe('{"key":"value"}');
  });

  it("formats array detail with msg and loc", () => {
    const error = {
      detail: [{ msg: "field required", loc: ["body", "name"] }],
    };
    expect(formatError(error)).toBe("body \u2192 name: field required");
  });

  it("formats array detail without loc", () => {
    const error = {
      detail: [{ msg: "invalid" }],
    };
    expect(formatError(error)).toBe(": invalid");
  });

  it("formats array detail with non-object items", () => {
    const error = { detail: ["error1", "error2"] };
    expect(formatError(error)).toBe('"error1"; "error2"');
  });

  it("stringifies unknown objects without detail", () => {
    expect(formatError({ code: 500 })).toBe('{"code":500}');
  });

  it("returns 'Unknown error' for non-serializable objects", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(formatError(circular)).toBe("Unknown error");
  });

  it("handles multiple array detail items with semicolon separator", () => {
    const error = {
      detail: [
        { msg: "required", loc: ["body", "field1"] },
        { msg: "too short", loc: ["body", "field2"] },
      ],
    };
    const result = formatError(error);
    expect(result).toContain("body \u2192 field1: required");
    expect(result).toContain("body \u2192 field2: too short");
    expect(result).toContain("; ");
  });
});
