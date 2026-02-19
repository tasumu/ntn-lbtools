import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AssetsPage } from "./AssetsPage";
import { renderWithProviders } from "../test/utils";

describe("AssetsPage", () => {
  it("renders Assets heading", () => {
    renderWithProviders(<AssetsPage />);
    expect(screen.getByText("Assets")).toBeInTheDocument();
  });

  it("renders satellite, earth-station, and modcod tabs", () => {
    renderWithProviders(<AssetsPage />);
    expect(screen.getByRole("tab", { name: /Satellites/ })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Earth Stations/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /ModCod Tables/ }),
    ).toBeInTheDocument();
  });

  it("shows satellite form on satellite tab by default", () => {
    renderWithProviders(<AssetsPage />);
    expect(
      screen.getByRole("button", { name: /Save satellite/ }),
    ).toBeInTheDocument();
  });

  it("loads and displays satellites from API", async () => {
    renderWithProviders(<AssetsPage />);
    await waitFor(() => {
      expect(screen.getByText("Test Satellite")).toBeInTheDocument();
    });
  });

  it("switches to earth stations tab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetsPage />);
    await user.click(screen.getByRole("tab", { name: /Earth Stations/ }));
    expect(
      screen.getByRole("button", { name: /Save earth station/ }),
    ).toBeInTheDocument();
  });

  it("loads earth stations from API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetsPage />);
    await user.click(screen.getByRole("tab", { name: /Earth Stations/ }));
    await waitFor(() => {
      expect(screen.getByText("Test Earth Station")).toBeInTheDocument();
    });
  });

  it("shows delete confirmation for satellite", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetsPage />);
    await waitFor(() => {
      expect(screen.getByText("Test Satellite")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Delete/ }));
    expect(screen.getByRole("button", { name: /Confirm/ })).toBeInTheDocument();
  });
});
