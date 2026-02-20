import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ParameterDiffTable } from "./ParameterDiffTable";
import type { ParameterRow } from "./comparisonUtils";
import { renderWithProviders } from "../../test/utils";

const rows: ParameterRow[] = [
  {
    key: "satellite_id",
    label: "Satellite",
    valueA: "sat-001",
    valueB: "sat-002",
    isDifferent: true,
  },
  {
    key: "waveform_strategy",
    label: "Waveform",
    valueA: "DVB_S2X",
    valueB: "DVB_S2X",
    isDifferent: false,
  },
];

describe("ParameterDiffTable", () => {
  it("renders all rows with scenario names as headers", () => {
    renderWithProviders(
      <ParameterDiffTable rows={rows} nameA="Scenario A" nameB="Scenario B" />,
    );
    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("Scenario B")).toBeInTheDocument();
    expect(screen.getByText("Satellite")).toBeInTheDocument();
    expect(screen.getByText("Waveform")).toBeInTheDocument();
  });

  it("filters to differences only when toggle is on", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ParameterDiffTable rows={rows} nameA="A" nameB="B" />,
    );
    await user.click(screen.getByLabelText("Show differences only"));
    expect(screen.getByText("Satellite")).toBeInTheDocument();
    expect(screen.queryByText("Waveform")).toBeNull();
  });

  it("shows no differences message when all identical and filter on", async () => {
    const user = userEvent.setup();
    const identicalRows: ParameterRow[] = [
      {
        key: "waveform_strategy",
        label: "Waveform",
        valueA: "DVB_S2X",
        valueB: "DVB_S2X",
        isDifferent: false,
      },
    ];
    renderWithProviders(
      <ParameterDiffTable rows={identicalRows} nameA="A" nameB="B" />,
    );
    await user.click(screen.getByLabelText("Show differences only"));
    expect(screen.getByText("No differences found")).toBeInTheDocument();
  });
});
