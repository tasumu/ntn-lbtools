import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScenarioSaveModal } from "./ScenarioSaveModal";
import { renderWithProviders } from "../../test/utils";

const defaultProps = {
  opened: true,
  onClose: vi.fn(),
  payload_snapshot: {} as Record<string, unknown>,
  metadata: {
    waveform_strategy: "DVB_S2X",
    transponder_type: "TRANSPARENT",
    modcod_table_id: "mc-001",
  },
};

describe("ScenarioSaveModal", () => {
  it("renders modal with title when opened", () => {
    renderWithProviders(<ScenarioSaveModal {...defaultProps} />);
    expect(screen.getByText("Save Scenario")).toBeInTheDocument();
  });

  it("renders name and description inputs", () => {
    renderWithProviders(<ScenarioSaveModal {...defaultProps} />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
  });

  it("has a save button", () => {
    renderWithProviders(<ScenarioSaveModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Save/ })).toBeInTheDocument();
  });

  it("validates empty name on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScenarioSaveModal {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Save/ }));
    await waitFor(() => {
      expect(screen.getByText(/String must contain at least 1 character/)).toBeInTheDocument();
    });
  });

  it("does not render when closed", () => {
    renderWithProviders(
      <ScenarioSaveModal {...defaultProps} opened={false} />,
    );
    expect(screen.queryByText("Save Scenario")).not.toBeInTheDocument();
  });
});
