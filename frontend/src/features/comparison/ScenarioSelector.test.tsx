import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScenarioSelector } from "./ScenarioSelector";
import { renderWithProviders } from "../../test/utils";

const scenarios = [
  { value: "sc-001", label: "Scenario A" },
  { value: "sc-002", label: "Scenario B" },
  { value: "sc-003", label: "Scenario C" },
];

describe("ScenarioSelector", () => {
  it("renders two select dropdowns and a Compare button", () => {
    renderWithProviders(
      <ScenarioSelector
        scenarios={scenarios}
        loading={false}
        onCompare={vi.fn()}
      />,
    );
    expect(screen.getAllByPlaceholderText("Select scenario")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /Compare/ }),
    ).toBeInTheDocument();
  });

  it("Compare button is disabled until both scenarios are selected", () => {
    renderWithProviders(
      <ScenarioSelector
        scenarios={scenarios}
        loading={false}
        onCompare={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Compare/ })).toBeDisabled();
  });

  it("calls onCompare when both selected and Compare is clicked", async () => {
    const onCompare = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ScenarioSelector
        scenarios={scenarios}
        loading={false}
        onCompare={onCompare}
      />,
    );

    // Select Scenario A dropdown
    const selectInputs = screen.getAllByPlaceholderText("Select scenario");
    await user.click(selectInputs[0]);
    await user.click(screen.getByRole("option", { name: "Scenario A" }));

    // Select Scenario B dropdown
    await user.click(selectInputs[1]);
    await user.click(screen.getByRole("option", { name: "Scenario C" }));

    await user.click(screen.getByRole("button", { name: /Compare/ }));
    expect(onCompare).toHaveBeenCalledWith("sc-001", "sc-003");
  });
});
