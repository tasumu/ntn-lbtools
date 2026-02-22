import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CalculationForm } from "./CalculationForm";
import { renderWithProviders } from "../../test/utils";
import type { SatelliteAsset } from "../../api/types";

const mockLeoSatellite: SatelliteAsset = {
  id: "sat-leo",
  name: "LEO Satellite",
  orbit_type: "LEO",
  altitude_km: 550,
};

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

  it("shows satellite position fields with required indicators for LEO satellite without TLE", async () => {
    const initialValues = {
      waveform_strategy: "DVB_S2X" as const,
      transponder_type: "TRANSPARENT" as const,
      satellite_id: "sat-leo",
      modcod_table_id: "mc-001",
      earth_station_tx_id: "es-001",
      earth_station_rx_id: "es-001",
      runtime: {
        bandwidth_hz: 36e6,
        rolloff: 0.2,
        uplink: {
          frequency_hz: 14.25e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          temperature_k: 290,
          ground_lat_deg: 35,
          ground_lon_deg: 139,
          ground_alt_m: 0,
        },
        downlink: {
          frequency_hz: 12e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          temperature_k: 290,
          ground_lat_deg: 35,
          ground_lon_deg: 139,
          ground_alt_m: 0,
        },
      },
    };
    renderWithProviders(
      <CalculationForm
        {...defaultProps}
        satellites={[mockLeoSatellite]}
        satelliteOptions={[{ value: "sat-leo", label: "LEO Satellite" }]}
        initialValues={initialValues}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Satellite latitude (deg)")).toBeInTheDocument();
      expect(screen.getByText("Satellite altitude (km)")).toBeInTheDocument();
    });
  });
});
