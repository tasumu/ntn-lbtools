import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScenarioList } from "./ScenarioList";
import { renderWithProviders } from "../../test/utils";
import { mockScenario } from "../../test/handlers";

const defaultProps = {
  scenarios: [mockScenario],
  isLoading: false,
  errorMessage: "",
  selectedScenarioId: null,
  detailFetching: false,
  deletePending: false,
  deletingId: undefined,
  onSelect: vi.fn(),
  onDelete: vi.fn(),
};

describe("ScenarioList", () => {
  it("renders scenario names", () => {
    renderWithProviders(<ScenarioList {...defaultProps} />);
    expect(screen.getByText("Test Scenario")).toBeInTheDocument();
  });

  it("shows empty state when no scenarios", () => {
    renderWithProviders(
      <ScenarioList {...defaultProps} scenarios={[]} />,
    );
    expect(screen.getByText(/No scenarios saved yet/)).toBeInTheDocument();
  });

  it("shows loading indicator", () => {
    renderWithProviders(
      <ScenarioList {...defaultProps} isLoading={true} />,
    );
    expect(screen.getByText(/Loading.../)).toBeInTheDocument();
  });

  it("shows error message", () => {
    renderWithProviders(
      <ScenarioList {...defaultProps} errorMessage="Failed to load" />,
    );
    expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
  });

  it("calls onSelect when Load is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <ScenarioList {...defaultProps} onSelect={onSelect} />,
    );
    await user.click(screen.getByRole("button", { name: /Load/ }));
    expect(onSelect).toHaveBeenCalledWith("sc-001", expect.anything());
  });

  it("shows delete confirmation flow", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithProviders(
      <ScenarioList {...defaultProps} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    expect(screen.getByRole("button", { name: /Confirm/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
  });

  it("calls onDelete on confirm", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithProviders(
      <ScenarioList {...defaultProps} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await user.click(screen.getByRole("button", { name: /Confirm/ }));
    expect(onDelete).toHaveBeenCalledWith("sc-001");
  });

  it("cancels delete confirmation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScenarioList {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await user.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();
  });
});
