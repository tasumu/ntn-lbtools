import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../test/utils";
import {
  FrequencyInput,
  FREQUENCY_UNITS,
  BANDWIDTH_UNITS,
} from "./FrequencyInput";

describe("FrequencyInput", () => {
  it("renders with correct default unit display value", () => {
    renderWithProviders(
      <FrequencyInput
        label="Frequency"
        value={14.25e9}
        onChange={vi.fn()}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
      />,
    );
    const input = screen.getByLabelText("Frequency") as HTMLInputElement;
    expect(input.value).toBe("14.25");
  });

  it("displays value in MHz when defaultUnit is MHz", () => {
    renderWithProviders(
      <FrequencyInput
        label="Bandwidth"
        value={36e6}
        onChange={vi.fn()}
        units={BANDWIDTH_UNITS}
        defaultUnit="MHz"
      />,
    );
    const input = screen.getByLabelText("Bandwidth") as HTMLInputElement;
    expect(input.value).toBe("36");
  });

  it("calls onChange with Hz value when user types", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <FrequencyInput
        label="Frequency"
        value={undefined}
        onChange={onChange}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
      />,
    );
    const input = screen.getByLabelText("Frequency");
    await user.clear(input);
    await user.type(input, "14");
    // The last call should be with Hz value (14 * 1e9)
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe(14e9);
  });

  it("renders unit selector without visible label, with aria-label", () => {
    renderWithProviders(
      <FrequencyInput
        label="Frequency"
        value={14.25e9}
        onChange={vi.fn()}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
      />,
    );
    // No visible "Unit" label - it should NOT be rendered as text
    expect(screen.queryByText("Unit")).not.toBeInTheDocument();
    // Accessible via aria-label
    const unitInput = screen.getByRole("textbox", { name: "Unit" });
    expect(unitInput).toHaveValue("GHz");
  });

  it("displays null/undefined value as empty", () => {
    renderWithProviders(
      <FrequencyInput
        label="Frequency"
        value={null}
        onChange={vi.fn()}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
      />,
    );
    const input = screen.getByLabelText("Frequency") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("shows error message when provided", () => {
    renderWithProviders(
      <FrequencyInput
        label="Frequency"
        value={14.25e9}
        onChange={vi.fn()}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
        error="Required field"
      />,
    );
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });

  it("shows asterisk when withAsterisk is true", () => {
    renderWithProviders(
      <FrequencyInput
        label="Frequency"
        value={14.25e9}
        onChange={vi.fn()}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
        withAsterisk
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("aligns NumberInput and Select at bottom so inputs share the same row height", () => {
    const { container } = renderWithProviders(
      <FrequencyInput
        label="Uplink frequency"
        value={14.25e9}
        onChange={vi.fn()}
        units={FREQUENCY_UNITS}
        defaultUnit="GHz"
      />,
    );
    // The wrapper Group should align items at flex-end
    const group = container.querySelector(".mantine-Group-root");
    expect(group).not.toBeNull();
    expect(group!.getAttribute("style")).toContain("--group-align: flex-end");

    // Select root should have fixed width via style
    const unitInput = screen.getByRole("textbox", { name: "Unit" });
    const selectRoot = unitInput.closest(".mantine-Select-root");
    expect(selectRoot).not.toBeNull();
    // Mantine converts w={90} to rem-based calc
    expect((selectRoot as HTMLElement).style.width).toContain("5.625rem");
  });
});
