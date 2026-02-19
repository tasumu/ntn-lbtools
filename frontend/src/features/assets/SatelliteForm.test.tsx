import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SatelliteForm } from "./SatelliteForm";
import { renderWithProviders } from "../../test/utils";

describe("SatelliteForm", () => {
  it("renders form fields", () => {
    renderWithProviders(<SatelliteForm />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Frequency band/)).toBeInTheDocument();
  });

  it("renders save button for new satellite", () => {
    renderWithProviders(<SatelliteForm />);
    expect(
      screen.getByRole("button", { name: /Save satellite/ }),
    ).toBeInTheDocument();
  });

  it("shows update button in edit mode", () => {
    renderWithProviders(
      <SatelliteForm
        initial={{
          id: "sat-001",
          name: "Test Sat",
          orbit_type: "GEO",
          frequency_band: "Ku",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Update satellite/ }),
    ).toBeInTheDocument();
  });

  it("shows cancel button in edit mode", () => {
    renderWithProviders(
      <SatelliteForm
        initial={{ id: "sat-001", name: "Test Sat", orbit_type: "GEO" }}
        onCancelEdit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
  });

  it("validates empty name on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SatelliteForm />);
    await user.click(
      screen.getByRole("button", { name: /Save satellite/ }),
    );
    await waitFor(() => {
      expect(screen.getByText(/String must contain at least 1 character/)).toBeInTheDocument();
    });
  });

  it("calls onCancelEdit when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onCancelEdit = vi.fn();
    renderWithProviders(
      <SatelliteForm
        initial={{ id: "sat-001", name: "Test Sat", orbit_type: "GEO" }}
        onCancelEdit={onCancelEdit}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
