import { describe, expect, it } from "vitest";

import { DVB_S2X_PRESETS } from "./dvbs2xPresets";
import type { ModcodPresetEntry } from "./dvbs2xPresets";

const MOD_ORDERS: Record<string, number> = {
  QPSK: 4,
  "8PSK": 8,
  "16APSK": 16,
  "32APSK": 32,
};

function parseCodeRate(rate: string): { num: number; den: number } {
  const [num, den] = rate.split("/").map(Number);
  return { num, den };
}

describe("DVB-S2X Presets", () => {
  it("has at least 2 presets", () => {
    expect(DVB_S2X_PRESETS.length).toBeGreaterThanOrEqual(2);
  });

  it("normal frames preset has at least 20 entries", () => {
    const normal = DVB_S2X_PRESETS.find((p) =>
      p.name.toLowerCase().includes("normal"),
    );
    expect(normal).toBeDefined();
    expect(normal!.entries.length).toBeGreaterThanOrEqual(20);
  });

  it("short frames preset has at least 10 entries", () => {
    const short = DVB_S2X_PRESETS.find((p) =>
      p.name.toLowerCase().includes("short"),
    );
    expect(short).toBeDefined();
    expect(short!.entries.length).toBeGreaterThanOrEqual(10);
  });

  for (const preset of DVB_S2X_PRESETS) {
    describe(`preset: ${preset.name}`, () => {
      it("each entry has valid fields", () => {
        for (const entry of preset.entries) {
          expect(entry.id).toBeTruthy();
          expect(entry.modulation).toBeTruthy();
          expect(entry.code_rate).toMatch(/^\d+\/\d+$/);
          expect(typeof entry.required_ebno_db).toBe("number");
          expect(entry.info_bits_per_symbol).toBeGreaterThan(0);
        }
      });

      it("has unique IDs within preset", () => {
        const ids = preset.entries.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("is sorted by required_ebno_db ascending within each modulation", () => {
        const grouped = new Map<string, number[]>();
        for (const entry of preset.entries) {
          const list = grouped.get(entry.modulation) ?? [];
          list.push(entry.required_ebno_db);
          grouped.set(entry.modulation, list);
        }
        for (const [mod, values] of grouped) {
          for (let i = 1; i < values.length; i++) {
            expect(
              values[i],
              `${mod}: entry ${i} should be >= entry ${i - 1}`,
            ).toBeGreaterThanOrEqual(values[i - 1]);
          }
        }
      });

      it("info_bits_per_symbol approximates log2(modOrder) * (num/den)", () => {
        for (const entry of preset.entries) {
          const modOrder = MOD_ORDERS[entry.modulation];
          expect(modOrder).toBeDefined();
          const { num, den } = parseCodeRate(entry.code_rate);
          const expected = Math.log2(modOrder) * (num / den);
          expect(entry.info_bits_per_symbol).toBeCloseTo(expected, 1);
        }
      });
    });
  }
});
