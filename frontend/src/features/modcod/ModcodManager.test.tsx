import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ModcodManager } from "./ModcodManager";
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
    await user.click(
      screen.getByRole("button", { name: /Add entry/ }),
    );
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Remove/ }),
      ).toHaveLength(initialCount + 1);
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

  it("shows delete confirmation flow for saved tables", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ModcodManager />);
    await waitFor(() => {
      expect(screen.getByText("DVB_S2X")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    expect(screen.getByRole("button", { name: /Confirm/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
  });
});
