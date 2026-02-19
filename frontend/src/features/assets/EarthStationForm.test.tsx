import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EarthStationForm } from "./EarthStationForm";
import { renderWithProviders } from "../../test/utils";

describe("EarthStationForm", () => {
  it("renders form fields", () => {
    renderWithProviders(<EarthStationForm />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Polarization/)).toBeInTheDocument();
  });

  it("renders save button for new earth station", () => {
    renderWithProviders(<EarthStationForm />);
    expect(
      screen.getByRole("button", { name: /Save earth station/ }),
    ).toBeInTheDocument();
  });

  it("shows update button in edit mode", () => {
    renderWithProviders(
      <EarthStationForm
        initial={{ id: "es-001", name: "Test ES" }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Update earth station/ }),
    ).toBeInTheDocument();
  });

  it("shows cancel button in edit mode", () => {
    renderWithProviders(
      <EarthStationForm
        initial={{ id: "es-001", name: "Test ES" }}
        onCancelEdit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
  });

  it("validates empty name on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EarthStationForm />);
    await user.click(
      screen.getByRole("button", { name: /Save earth station/ }),
    );
    await waitFor(() => {
      expect(screen.getByText(/String must contain at least 1 character/)).toBeInTheDocument();
    });
  });

  it("calls onCancelEdit when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancelEdit = vi.fn();
    renderWithProviders(
      <EarthStationForm
        initial={{ id: "es-001", name: "Test ES" }}
        onCancelEdit={onCancelEdit}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
