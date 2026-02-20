import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ModcodManager } from "./ModcodManager";
import { DVB_S2X_PRESETS } from "../../data/dvbs2xPresets";
import { renderWithProviders } from "../../test/utils";

describe("ModcodManager", () => {
  it("renders the form with waveform and version fields", () => {
    renderWithProviders(<ModcodManager />);
    expect(screen.getByLabelText(/Waveform/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Version/)).toBeInTheDocument();
  });

  it("renders save button", () => {
    renderWithProviders(<ModcodManager />);
    expect(
      screen.getByRole("button", { name: /Save ModCod table/ }),
    ).toBeInTheDocument();
  });

  it("renders entries section", () => {
    renderWithProviders(<ModcodManager />);
    expect(screen.getByText(/Entries/)).toBeInTheDocument();
  });

  it("renders add entry button", () => {
    renderWithProviders(<ModcodManager />);
    expect(
      screen.getByRole("button", { name: /Add entry/ }),
    ).toBeInTheDocument();
  });

  it("adds a new entry when Add entry is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ModcodManager />);
    const removeButtons = screen.getAllByRole("button", { name: /Remove/ });
    const initialCount = removeButtons.length;
    await user.click(screen.getByRole("button", { name: /Add entry/ }));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Remove/ })).toHaveLength(
        initialCount + 1,
      );
    });
  });

  it("loads saved ModCod tables from the API", async () => {
    renderWithProviders(<ModcodManager />);
    await waitFor(() => {
      expect(screen.getByText("Saved ModCod Tables")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("DVB_S2X")).toBeInTheDocument();
    });
  });

  it("shows delete confirmation modal for saved tables", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ModcodManager />);
    await waitFor(() => {
      expect(screen.getByText("DVB_S2X")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await waitFor(() => {
      expect(screen.getByText(/Confirm deletion/)).toBeInTheDocument();
    });
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it("renders Load Preset button", () => {
    renderWithProviders(<ModcodManager />);
    expect(
      screen.getByRole("button", { name: /Load Preset/ }),
    ).toBeInTheDocument();
  });

  it("populates entries when a preset is loaded", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ModcodManager />);
    await user.click(screen.getByRole("button", { name: /Load Preset/ }));
    const firstPreset = DVB_S2X_PRESETS[0];
    await waitFor(() => {
      expect(
        screen.getByText(
          `${firstPreset.name} (${firstPreset.entries.length} entries)`,
        ),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByText(
        `${firstPreset.name} (${firstPreset.entries.length} entries)`,
      ),
    );
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Remove/ })).toHaveLength(
        firstPreset.entries.length,
      );
    });
  });
});
