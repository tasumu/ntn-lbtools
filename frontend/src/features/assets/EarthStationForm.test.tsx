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

  it("renders location fields", () => {
    renderWithProviders(<EarthStationForm />);
    expect(screen.getByText("Default Location (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Latitude/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Longitude/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Altitude/)).toBeInTheDocument();
  });

  it("populates location fields in edit mode", () => {
    renderWithProviders(
      <EarthStationForm
        initial={{
          id: "es-002",
          name: "With Location",
          latitude_deg: 35.68,
          longitude_deg: 139.69,
          altitude_m: 40,
        }}
      />,
    );
    const latInput = screen.getByLabelText(/Latitude/) as HTMLInputElement;
    expect(latInput.value).toBe("35.68");
    const lonInput = screen.getByLabelText(/Longitude/) as HTMLInputElement;
    expect(lonInput.value).toBe("139.69");
    const altInput = screen.getByLabelText(/Altitude/) as HTMLInputElement;
    expect(altInput.value).toBe("40");
  });
});
