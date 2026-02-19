import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalculationView } from "./CalculationView";
import { renderWithProviders } from "../../test/utils";

describe("CalculationView", () => {
  it("renders the Inputs section", () => {
    renderWithProviders(<CalculationView />);
    expect(screen.getByText("Inputs")).toBeInTheDocument();
  });

  it("renders the Reload button", () => {
    renderWithProviders(<CalculationView />);
    expect(
      screen.getByRole("button", { name: /Reload/ }),
    ).toBeInTheDocument();
  });

  it("renders the Calculate button", () => {
    renderWithProviders(<CalculationView />);
    expect(
      screen.getByRole("button", { name: /Calculate/ }),
    ).toBeInTheDocument();
  });

  it("renders Saved Scenarios section", () => {
    renderWithProviders(<CalculationView />);
    expect(screen.getByText("Saved Scenarios")).toBeInTheDocument();
  });

  it("loads scenarios from API", async () => {
    renderWithProviders(<CalculationView />);
    await waitFor(() => {
      expect(screen.getByText("Test Scenario")).toBeInTheDocument();
    });
  });
});
