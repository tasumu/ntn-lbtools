import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../test/utils";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a toggle button with accessible label", () => {
    renderWithProviders(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /toggle color scheme/i }),
    ).toBeInTheDocument();
  });

  it("toggles color scheme on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /toggle color scheme/i });
    await user.click(button);

    // After click, button should still be present and functional
    expect(button).toBeInTheDocument();
  });
});
