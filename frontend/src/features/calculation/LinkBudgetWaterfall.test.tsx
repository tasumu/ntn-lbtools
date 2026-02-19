import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LinkBudgetWaterfall } from "./LinkBudgetWaterfall";
import { renderWithProviders } from "../../test/utils";
import { mockCalculationResponse } from "../../test/handlers";

describe("LinkBudgetWaterfall", () => {
  it("renders without crashing", () => {
    renderWithProviders(
      <LinkBudgetWaterfall
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
      />,
    );
    expect(screen.getByText("Uplink")).toBeInTheDocument();
    expect(screen.getByText("Downlink")).toBeInTheDocument();
  });

  it("renders SegmentedControl for direction switching", () => {
    renderWithProviders(
      <LinkBudgetWaterfall
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
      />,
    );
    const uplinkRadio = screen.getByRole("radio", { name: /Uplink/ });
    expect(uplinkRadio).toBeInTheDocument();
  });

  it("can switch to downlink direction", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LinkBudgetWaterfall
        uplink={mockCalculationResponse.results.uplink}
        downlink={mockCalculationResponse.results.downlink}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /Downlink/ }));
    expect(screen.getByRole("radio", { name: /Downlink/ })).toBeChecked();
  });
});
