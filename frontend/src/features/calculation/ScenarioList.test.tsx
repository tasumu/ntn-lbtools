import { screen, waitFor } from "@testing-library/react";
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
  duplicatePending: false,
  duplicatingId: undefined,
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
};

describe("ScenarioList", () => {
  it("renders scenario names", () => {
    renderWithProviders(<ScenarioList {...defaultProps} />);
    expect(screen.getByText("Test Scenario")).toBeInTheDocument();
  });

  it("shows empty state when no scenarios", () => {
    renderWithProviders(<ScenarioList {...defaultProps} scenarios={[]} />);
    expect(screen.getByText(/No scenarios saved yet/)).toBeInTheDocument();
  });

  it("shows loading indicator", () => {
    renderWithProviders(<ScenarioList {...defaultProps} isLoading={true} />);
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
    renderWithProviders(<ScenarioList {...defaultProps} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /Load/ }));
    expect(onSelect).toHaveBeenCalledWith("sc-001", expect.anything());
  });

  it("shows delete confirmation modal", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithProviders(<ScenarioList {...defaultProps} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await waitFor(() => {
      expect(screen.getByText(/Confirm deletion/)).toBeInTheDocument();
    });
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it("calls onDelete when modal Delete is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithProviders(<ScenarioList {...defaultProps} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await waitFor(() => {
      expect(screen.getByText(/Confirm deletion/)).toBeInTheDocument();
    });
    // Click the Delete button inside the modal (last one)
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
    await user.click(deleteButtons[deleteButtons.length - 1]);
    expect(onDelete).toHaveBeenCalledWith("sc-001");
  });

  it("cancels delete confirmation modal", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScenarioList {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await waitFor(() => {
      expect(screen.getByText(/Confirm deletion/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Cancel/ }));
    await waitFor(() => {
      expect(screen.queryByText(/Confirm deletion/)).not.toBeInTheDocument();
    });
  });

  it("renders Duplicate button for each scenario", () => {
    renderWithProviders(<ScenarioList {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /Duplicate/ }),
    ).toBeInTheDocument();
  });

  it("calls onDuplicate when Duplicate is clicked", async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    renderWithProviders(
      <ScenarioList {...defaultProps} onDuplicate={onDuplicate} />,
    );
    await user.click(screen.getByRole("button", { name: /Duplicate/ }));
    expect(onDuplicate).toHaveBeenCalledWith("sc-001");
  });
});
