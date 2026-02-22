import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CombinedResultCard } from "./CombinedResultCard";
import { renderWithProviders } from "../../../test/utils";
import { mockCalculationResponse } from "../../../test/handlers";

const results = mockCalculationResponse.results;

describe("CombinedResultCard", () => {
  it("renders Total heading", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        modcodSelected={mockCalculationResponse.modcod_selected}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Total").length).toBeGreaterThanOrEqual(1);
  });

  it("displays clean margin and end-to-end margin", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        modcodSelected={mockCalculationResponse.modcod_selected}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Clean margin/)).toBeInTheDocument();
    expect(screen.getByText(/End-to-end margin/)).toBeInTheDocument();
  });

  it("shows Save as scenario button", () => {
    const onSave = vi.fn();
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={onSave}
      />,
    );
    expect(
      screen.getByRole("button", { name: /save as scenario/i }),
    ).toBeInTheDocument();
  });

  it("shows per-direction margins for REGENERATIVE", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Uplink margin/)).toBeInTheDocument();
    expect(screen.getByText(/Downlink margin/)).toBeInTheDocument();
  });

  it("displays modcod summary when not directional", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Selected ModCod.*QPSK 1\/4/)).toBeInTheDocument();
  });

  it("shows GO badge when margin is positive", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("GO")).toBeInTheDocument();
  });

  it("shows NO-GO badge when margin is negative", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={-1.5}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("NO-GO")).toBeInTheDocument();
  });

  it("shows NO-GO badge when margin is zero", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("NO-GO")).toBeInTheDocument();
  });

  it("shows throughput for TRANSPARENT with spectral efficiency", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        modcodSelected={{
          id: "qpsk-1/4",
          modulation: "QPSK",
          code_rate: "1/4",
          effective_spectral_efficiency: 0.5,
        }}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Throughput.*18\.00 Mbps/)).toBeInTheDocument();
  });

  it("hides C/(N+I) and C/IM row for REGENERATIVE", () => {
    const regenResults = {
      ...results,
      combined: undefined,
    };
    renderWithProviders(
      <CombinedResultCard
        results={regenResults}
        combinedLinkMarginDb={2.0}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText(/C\/\(N\+I\)/)).not.toBeInTheDocument();
  });

  it("shows C/(N+I) and C/IM row for TRANSPARENT", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/C\/\(N\+I\)/)).toBeInTheDocument();
  });

  it("hides clean margin when null for REGENERATIVE", () => {
    const regenResults = {
      ...results,
      combined: undefined,
      uplink: { ...results.uplink, clean_link_margin_db: null },
      downlink: { ...results.downlink, clean_link_margin_db: null },
    };
    renderWithProviders(
      <CombinedResultCard
        results={regenResults}
        combinedLinkMarginDb={2.0}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Clean margin/)).not.toBeInTheDocument();
  });

  it("shows clean margin for TRANSPARENT", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Clean margin/)).toBeInTheDocument();
  });

  it("shows separate UL/DL bandwidth for REGENERATIVE", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/UL BW/)).toBeInTheDocument();
    expect(screen.getByText(/DL BW/)).toBeInTheDocument();
    expect(screen.queryByText(/^Channel BW/)).not.toBeInTheDocument();
  });

  it("shows single Channel BW for TRANSPARENT", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Channel BW/)).toBeInTheDocument();
    expect(screen.queryByText(/UL BW/)).not.toBeInTheDocument();
  });

  it("shows 'Bottleneck margin' label for REGENERATIVE", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="REGENERATIVE"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Bottleneck margin/)).toBeInTheDocument();
    expect(screen.queryByText(/End-to-end margin/)).not.toBeInTheDocument();
  });

  it("shows 'End-to-end margin' label for TRANSPARENT", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        transponderType="TRANSPARENT"
        isDirectionalModcod={false}
        modcodSummary="QPSK 1/4"
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/End-to-end margin/)).toBeInTheDocument();
    expect(screen.queryByText(/Bottleneck margin/)).not.toBeInTheDocument();
  });

  it("shows per-direction throughput for REGENERATIVE", () => {
    renderWithProviders(
      <CombinedResultCard
        results={results}
        combinedLinkMarginDb={2.0}
        modcodSelected={{
          uplink: {
            id: "qpsk-1/4",
            modulation: "QPSK",
            code_rate: "1/4",
            effective_spectral_efficiency: 0.5,
          },
          downlink: {
            id: "8psk-3/4",
            modulation: "8PSK",
            code_rate: "3/4",
            effective_spectral_efficiency: 2.0,
          },
        }}
        transponderType="REGENERATIVE"
        isDirectionalModcod={true}
        modcodSummary=""
        channelBandwidth={36e6}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/UL throughput/)).toBeInTheDocument();
    expect(screen.getByText(/DL throughput/)).toBeInTheDocument();
  });
});
