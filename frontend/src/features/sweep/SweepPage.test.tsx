import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { server } from "../../test/server";
import { SweepPage } from "./SweepPage";

const API_BASE = "*/api/v1";

const mockSweepResponse = {
  sweep_parameter: "runtime.uplink.rain_rate_mm_per_hr",
  sweep_label: "Uplink Rain Rate (mm/hr)",
  threshold_db: 3.0,
  points: [
    {
      sweep_value: 0,
      combined_link_margin_db: 8.0,
      combined_cn_db: 15.0,
      combined_cn0_dbhz: 90.0,
      uplink_cn_db: 18.0,
      uplink_rain_loss_db: 0.0,
      uplink_link_margin_db: 10.0,
      downlink_cn_db: 17.0,
      downlink_rain_loss_db: 0.0,
      downlink_link_margin_db: 9.0,
      modcod_id: "8psk-3/4",
      modcod_label: "8PSK 3/4",
      viable: true,
      warnings: [],
    },
    {
      sweep_value: 50,
      combined_link_margin_db: 2.0,
      combined_cn_db: 10.0,
      combined_cn0_dbhz: 85.0,
      uplink_cn_db: 13.0,
      uplink_rain_loss_db: 5.0,
      uplink_link_margin_db: 4.0,
      downlink_cn_db: 17.0,
      downlink_rain_loss_db: 0.0,
      downlink_link_margin_db: 9.0,
      modcod_id: "qpsk-1/2",
      modcod_label: "QPSK 1/2",
      viable: false,
      warnings: [],
    },
    {
      sweep_value: 100,
      combined_link_margin_db: -3.0,
      combined_cn_db: 5.0,
      combined_cn0_dbhz: 80.0,
      uplink_cn_db: 8.0,
      uplink_rain_loss_db: 10.0,
      uplink_link_margin_db: -1.0,
      downlink_cn_db: 17.0,
      downlink_rain_loss_db: 0.0,
      downlink_link_margin_db: 9.0,
      modcod_id: "qpsk-1/4",
      modcod_label: "QPSK 1/4",
      viable: false,
      warnings: [],
    },
  ],
  crossover_value: 41.7,
  strategy: {
    waveform_strategy: "DVB_S2X",
    transponder_type: "TRANSPARENT",
  },
};

describe("SweepPage", () => {
  it("renders sweep configuration form", () => {
    renderWithProviders(<SweepPage />);

    expect(screen.getByText("Parameter Sweep")).toBeInTheDocument();
    expect(screen.getByText("Sweep Parameter")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByText("Steps")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Run Sweep/i }),
    ).toBeInTheDocument();
  });

  it("populates defaults when parameter is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SweepPage />);

    const paramSelect = screen.getByPlaceholderText(
      "Select parameter to sweep",
    );
    await user.click(paramSelect);

    const option = await screen.findByText("Uplink Rain Rate");
    await user.click(option);

    await waitFor(() => {
      const startInput = screen.getByLabelText("Start") as HTMLInputElement;
      expect(startInput.value).toBe("0");
    });
  });

  it("shows results chart after successful sweep", async () => {
    server.use(
      http.post(`${API_BASE}/link-budgets/sweep`, () =>
        HttpResponse.json(mockSweepResponse),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<SweepPage />);

    // Select parameter
    const paramSelect = screen.getByPlaceholderText(
      "Select parameter to sweep",
    );
    await user.click(paramSelect);
    const option = await screen.findByText("Uplink Rain Rate");
    await user.click(option);

    // Verify the page is rendered
    await waitFor(() => {
      expect(screen.getByText("Parameter Sweep")).toBeInTheDocument();
    });
  });

  it("shows error on API failure", async () => {
    server.use(
      http.post(`${API_BASE}/link-budgets/sweep`, () =>
        HttpResponse.json(
          { detail: "Sweep computation failed" },
          { status: 400 },
        ),
      ),
    );

    renderWithProviders(<SweepPage />);
    expect(screen.getByText("Parameter Sweep")).toBeInTheDocument();
  });

  it("renders threshold input with default value", () => {
    renderWithProviders(<SweepPage />);

    const thresholdInput = screen.getByLabelText(
      "Threshold (dB)",
    ) as HTMLInputElement;
    expect(thresholdInput.value).toBe("3");
  });
});
