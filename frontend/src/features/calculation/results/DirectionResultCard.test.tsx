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

  it("shows GO badge for REGENERATIVE with positive margin", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.getByText("GO")).toBeInTheDocument();
  });

  it("shows NO-GO badge for REGENERATIVE with negative margin", () => {
    const negativeResult = { ...uplinkResult, link_margin_db: -1.0 };
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={negativeResult}
        elevationDeg={48.5}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.getByText("NO-GO")).toBeInTheDocument();
  });

  it("does not show badge for TRANSPARENT", () => {
    renderWithProviders(
      <DirectionResultCard
        direction="uplink"
        result={uplinkResult}
        elevationDeg={48.5}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
      />,
    );
    expect(screen.queryByText("GO")).not.toBeInTheDocument();
    expect(screen.queryByText("NO-GO")).not.toBeInTheDocument();
  });

  it("shows throughput for REGENERATIVE with spectral efficiency", () => {
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
            effective_spectral_efficiency: 0.5,
          },
          downlink: null,
        }}
      />,
    );
    expect(screen.getByText(/Throughput.*18\.00 Mbps/)).toBeInTheDocument();
  });
});
