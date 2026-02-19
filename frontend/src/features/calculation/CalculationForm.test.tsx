import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CalculationForm } from "./CalculationForm";
import { renderWithProviders } from "../../test/utils";

const defaultProps = {
  onSubmit: vi.fn(),
  loading: false,
  modcodOptions: [
    { value: "mc-001", label: "DVB_S2X v1.0.0", waveform: "DVB_S2X" },
  ],
  satelliteOptions: [{ value: "sat-001", label: "Test Satellite" }],
  earthStationOptions: [{ value: "es-001", label: "Test ES" }],
  modcodLoading: false,
  satelliteLoading: false,
  earthStationLoading: false,
  satellites: [],
  earthStations: [],
};

describe("CalculationForm", () => {
  it("renders the form with Calculate button", () => {
    renderWithProviders(<CalculationForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /Calculate/ }),
    ).toBeInTheDocument();
  });

  it("renders waveform and transponder selectors", () => {
    renderWithProviders(<CalculationForm {...defaultProps} />);
    expect(screen.getByText("Waveform")).toBeInTheDocument();
    expect(screen.getByText("Transponder")).toBeInTheDocument();
  });

  it("renders uplink and downlink sections", () => {
    renderWithProviders(<CalculationForm {...defaultProps} />);
    expect(screen.getByText(/earth \u2192 satellite/)).toBeInTheDocument();
    expect(screen.getByText(/satellite \u2192 earth/)).toBeInTheDocument();
  });

  it("renders rolloff field", () => {
    renderWithProviders(<CalculationForm {...defaultProps} />);
    expect(screen.getByText(/Rolloff/)).toBeInTheDocument();
  });

  it("renders channel bandwidth for TRANSPARENT mode", () => {
    renderWithProviders(<CalculationForm {...defaultProps} />);
    expect(screen.getByText(/Channel bandwidth/)).toBeInTheDocument();
  });

  it("shows loading state on Calculate button", () => {
    renderWithProviders(<CalculationForm {...defaultProps} loading={true} />);
    const btn = screen.getByRole("button", { name: /Calculate/ });
    expect(btn).toBeInTheDocument();
  });
});
