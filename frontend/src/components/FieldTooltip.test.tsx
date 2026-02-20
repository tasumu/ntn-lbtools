import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldTooltip, LabelWithTooltip } from "./FieldTooltip";
import { renderWithProviders } from "../test/utils";

describe("FieldTooltip", () => {
  it("renders info icon for a known key", () => {
    renderWithProviders(<FieldTooltip fieldKey="rolloff" />);
    expect(screen.getByLabelText("Info: rolloff")).toBeInTheDocument();
  });

  it("returns null for an unknown key", () => {
    renderWithProviders(<FieldTooltip fieldKey="nonexistent_field" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("LabelWithTooltip", () => {
  it("renders label text and tooltip icon", () => {
    renderWithProviders(
      <LabelWithTooltip label="Rolloff (alpha)" fieldKey="rolloff" />,
    );
    expect(screen.getByText("Rolloff (alpha)")).toBeInTheDocument();
    expect(screen.getByLabelText("Info: rolloff")).toBeInTheDocument();
  });

  it("renders label without icon for unknown key", () => {
    renderWithProviders(
      <LabelWithTooltip label="Unknown Field" fieldKey="unknown_xyz" />,
    );
    expect(screen.getByText("Unknown Field")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
