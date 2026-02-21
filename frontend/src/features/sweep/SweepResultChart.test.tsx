import { describe, expect, it } from "vitest";

import { formatTickValue } from "./SweepResultChart";

describe("formatTickValue", () => {
  it("formats float to 2 decimal places", () => {
    expect(formatTickValue(6.12244897959183)).toBe("6.12");
  });

  it("formats integer with trailing zeros", () => {
    expect(formatTickValue(35)).toBe("35.00");
  });

  it("rounds correctly", () => {
    expect(formatTickValue(18.39667504793104)).toBe("18.40");
  });

  it("handles zero", () => {
    expect(formatTickValue(0)).toBe("0.00");
  });

  it("handles negative numbers", () => {
    expect(formatTickValue(-3.456)).toBe("-3.46");
  });
});
