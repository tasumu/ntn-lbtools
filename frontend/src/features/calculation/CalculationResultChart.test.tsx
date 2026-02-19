import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalculationResultChart } from "./CalculationResultChart";
import { renderWithProviders } from "../../test/utils";
import { mockCalculationResponse } from "../../test/handlers";

describe("CalculationResultChart", () => {
  it("renders without crashing", () => {
    renderWithProviders(
      <CalculationResultChart
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
      />,
    );
    expect(screen.getByText("Losses (dB)")).toBeInTheDocument();
    expect(screen.getByText("Signal Metrics")).toBeInTheDocument();
  });
});
