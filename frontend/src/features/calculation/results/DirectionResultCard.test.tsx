import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DirectionResultCard } from "./DirectionResultCard";
import { renderWithProviders } from "../../../test/utils";
import { mockCalculationResponse } from "../../../test/handlers";

const uplinkResult = mockCalculationResponse.results.uplink;

describe("DirectionResultCard", () => {
  it("renders uplink direction label", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.getByText("Result (Uplink)")).toBeInTheDocument();
  });

  it("renders downlink direction label", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="downlink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.getByText("Result (Downlink)")).toBeInTheDocument();
  });

  it("displays formatted elevation", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.getByText(/48\.50/)).toBeInTheDocument();
  });

  it("shows link margin for REGENERATIVE transponder", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.getByText(/Link margin/)).toBeInTheDocument();
  });

  it("hides link margin for TRANSPARENT transponder", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.queryByText(/Link margin/)).not.toBeInTheDocument();
  });

  it("shows ModCod when isDirectionalModcod is true", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="REGENERATIVE"
        isDirectionalModcod={true}
        modcodSelected={{
          uplink: {
            id: "qpsk-1/4",
            modulation: "QPSK",
            code_rate: "1/4",
          },
          downlink: null,
        }}
      />,
    );
    expect(screen.getByText(/ModCod/)).toBeInTheDocument();
  });
});
