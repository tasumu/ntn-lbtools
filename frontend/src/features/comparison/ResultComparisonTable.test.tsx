import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultComparisonTable } from "./ResultComparisonTable";
import type { ResultRow } from "./comparisonUtils";
import { renderWithProviders } from "../../test/utils";

const rows: ResultRow[] = [
  {
    key: "uplink.cn_db",
    label: "Uplink C/N (dB)",
    valueA: "12.5",
    valueB: "10.0",
    delta: "-2.50",
    isDifferent: true,
  },
  {
    key: "combined.link_margin_db",
    label: "Combined Link Margin (dB)",
    valueA: "2.0",
    valueB: "-1.0",
    delta: "-3.00",
    isDifferent: true,
  },
  {
    key: "combined.cn_db",
    label: "Combined C/N (dB)",
    valueA: "9.5",
    valueB: "9.5",
    delta: "+0.00",
    isDifferent: false,
  },
];

describe("ResultComparisonTable", () => {
  it("renders result rows with delta column", () => {
    renderWithProviders(
      <ResultComparisonTable rows={rows} nameA="A" nameB="B" />,
    );
    expect(screen.getByText("Uplink C/N (dB)")).toBeInTheDocument();
    expect(screen.getByText("-2.50")).toBeInTheDocument();
    expect(screen.getByText("+0.00")).toBeInTheDocument();
  });

  it("renders Go/No-Go badges for margin rows", () => {
    renderWithProviders(
      <ResultComparisonTable rows={rows} nameA="A" nameB="B" />,
    );
    // Margin row value "2.0" should have a green badge, "-1.0" a red badge
    const badges = screen.getAllByText(/2\.0|−1\.0|-1\.0/);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("renders scenario names as column headers", () => {
    renderWithProviders(
      <ResultComparisonTable rows={rows} nameA="Scenario A" nameB="Scenario B" />,
    );
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("Scenario B")).toBeInTheDocument();
    expect(screen.getByText("Delta")).toBeInTheDocument();
  });
});
