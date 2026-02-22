import { describe, expect, it } from "vitest";

import { NR_5G_PRESETS } from "./nr5gPresets";

describe("NR_5G_PRESETS", () => {
  it("has at least one preset", () => {
    expect(NR_5G_PRESETS.length).toBeGreaterThan(0);
  });

  it("each preset has a non-empty name and entries", () => {
    for (const preset of NR_5G_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.entries.length).toBeGreaterThan(0);
    }
  });

  it("each entry has required fields with valid values", () => {
    for (const preset of NR_5G_PRESETS) {
      for (const entry of preset.entries) {
        expect(entry.id).toBeTruthy();
        expect(entry.modulation).toBeTruthy();
        expect(entry.code_rate).toBeTruthy();
        expect(typeof entry.required_ebno_db).toBe("number");
        expect(entry.info_bits_per_symbol).toBeGreaterThan(0);
      }
    }
  });

  it("entries are sorted by increasing Eb/N0", () => {
    for (const preset of NR_5G_PRESETS) {
      for (let i = 1; i < preset.entries.length; i++) {
        expect(preset.entries[i].required_ebno_db).toBeGreaterThanOrEqual(
          preset.entries[i - 1].required_ebno_db,
        );
      }
    }
  });

  it("contains QPSK, 16QAM, and 64QAM modulations in Table 2", () => {
    const table2 = NR_5G_PRESETS[0];
    const modulations = new Set(table2.entries.map((e) => e.modulation));
    expect(modulations.has("QPSK")).toBe(true);
    expect(modulations.has("16QAM")).toBe(true);
    expect(modulations.has("64QAM")).toBe(true);
  });
});
