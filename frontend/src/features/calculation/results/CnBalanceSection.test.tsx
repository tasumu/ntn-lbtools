import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CnBalanceSection } from "./CnBalanceSection";
import { renderWithProviders } from "../../../test/utils";
import { mockCalculationResponse } from "../../../test/handlers";

describe("CnBalanceSection", () => {
  it("renders uplink, downlink, and total labels", () => {
    renderWithProviders(
      <CnBalanceSection
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
        combined={mockCalculationResponse.results.combined}
        transponderType="TRANSPARENT"
      />,
    );
    expect(screen.getByText("Uplink")).toBeInTheDocument();
    expect(screen.getByText("Downlink")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("shows 'Bottleneck' label for REGENERATIVE C/N balance", () => {
    renderWithProviders(
      <CnBalanceSection
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
        combined={mockCalculationResponse.results.combined}
        transponderType="REGENERATIVE"
      />,
    );
    expect(screen.getByText("Uplink")).toBeInTheDocument();
    expect(screen.getByText("Bottleneck")).toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  it("shows 'Total' label for TRANSPARENT C/N balance", () => {
    renderWithProviders(
      <CnBalanceSection
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
        combined={mockCalculationResponse.results.combined}
        transponderType="TRANSPARENT"
      />,
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByText("Bottleneck")).not.toBeInTheDocument();
  });

  it("renders without combined results", () => {
    renderWithProviders(
      <CnBalanceSection
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
        transponderType="TRANSPARENT"
      />,
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});
