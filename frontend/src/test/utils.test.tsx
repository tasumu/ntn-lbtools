import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "./utils";

describe("renderWithProviders", () => {
  it("does not emit React Router v7 future flag warnings", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithProviders(<div>test</div>);
    const routerWarnings = spy.mock.calls.filter(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("React Router Future Flag Warning"),
    );
    expect(routerWarnings).toHaveLength(0);
    spy.mockRestore();
  });
});
