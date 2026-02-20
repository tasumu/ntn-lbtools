import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PresetSelector } from "./PresetSelector";
import { DVB_S2X_PRESETS } from "../../data/dvbs2xPresets";
import { renderWithProviders } from "../../test/utils";

describe("PresetSelector", () => {
  it("renders Load Preset button", () => {
    renderWithProviders(<PresetSelector onSelect={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /Load Preset/ }),
    ).toBeInTheDocument();
  });

  it("shows preset options on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PresetSelector onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Load Preset/ }));
    for (const preset of DVB_S2X_PRESETS) {
      await waitFor(() => {
        expect(
          screen.getByText(
            `${preset.name} (${preset.entries.length} entries)`,
          ),
        ).toBeInTheDocument();
      });
    }
  });

  it("calls onSelect when a preset is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<PresetSelector onSelect={onSelect} />);
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
    expect(onSelect).toHaveBeenCalledWith(firstPreset);
  });
});
