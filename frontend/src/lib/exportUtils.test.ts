import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  downloadCsv,
  buildSweepCsv,
  buildPdfParameterRows,
} from "./exportUtils";
import type { SweepResponse } from "../features/sweep/sweepTypes";
import type { CalculationResponse } from "../api/schemas";

describe("downloadCsv", () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let createElementSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  beforeEach(() => {
    clickSpy = vi.fn();
    createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
      style: {},
    } as unknown as HTMLAnchorElement);
    // jsdom doesn't implement URL.createObjectURL/revokeObjectURL
    createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = revokeObjectURLSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Blob with text/csv MIME type", () => {
    downloadCsv("a,b\n1,2", "test.csv");

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv;charset=utf-8;");
  });

  it("triggers an anchor click with download attribute", () => {
    downloadCsv("a,b\n1,2", "test.csv");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("sets the download filename on the anchor", () => {
    const anchor = {
      href: "",
      download: "",
      click: clickSpy,
      style: {},
    } as unknown as HTMLAnchorElement;
    createElementSpy.mockReturnValue(anchor);

    downloadCsv("a,b\n1,2", "report.csv");

    expect(anchor.download).toBe("report.csv");
  });

  it("revokes the object URL after click", () => {
    downloadCsv("data", "file.csv");

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });
});

describe("buildSweepCsv", () => {
  const mockSweepData: SweepResponse = {
    sweep_parameter: "runtime.uplink.rain_rate_mm_per_hr",
    sweep_label: "Uplink Rain Rate (mm/hr)",
    threshold_db: 3.0,
    points: [
      {
        sweep_value: 0,
        combined_link_margin_db: 8.0,
        combined_cn_db: 15.0,
        combined_cn0_dbhz: 90.0,
        uplink_cn_db: 18.0,
        uplink_rain_loss_db: 0.0,
        uplink_link_margin_db: 10.0,
        downlink_cn_db: 17.0,
        downlink_rain_loss_db: 0.0,
        downlink_link_margin_db: 9.0,
        modcod_id: "8psk-3/4",
        modcod_label: "8PSK 3/4",
        viable: true,
        warnings: [],
      },
      {
        sweep_value: 50,
        combined_link_margin_db: 2.0,
        combined_cn_db: 10.0,
        combined_cn0_dbhz: 85.0,
        uplink_cn_db: 13.0,
        uplink_rain_loss_db: 5.0,
        uplink_link_margin_db: 4.0,
        downlink_cn_db: 17.0,
        downlink_rain_loss_db: 0.0,
        downlink_link_margin_db: 9.0,
        modcod_id: "qpsk-1/2",
        modcod_label: "QPSK 1/2",
        viable: false,
        warnings: [],
      },
    ],
    crossover_value: 41.7,
    strategy: {
      waveform_strategy: "DVB_S2X",
      transponder_type: "TRANSPARENT",
    },
  };

  it("includes the sweep label as first header column", () => {
    const csv = buildSweepCsv(mockSweepData);
    const headerLine = csv.split("\n")[0];
    expect(headerLine.startsWith("Uplink Rain Rate (mm/hr)")).toBe(true);
  });

  it("includes all OUTPUT_METRICS columns in the header", () => {
    const csv = buildSweepCsv(mockSweepData);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toContain("Combined Link Margin");
    expect(headerLine).toContain("Uplink C/N");
    expect(headerLine).toContain("Downlink C/N");
    expect(headerLine).toContain("Combined C/N");
    expect(headerLine).toContain("Uplink Rain Loss");
    expect(headerLine).toContain("Downlink Rain Loss");
  });

  it("includes ModCod and Viable columns", () => {
    const csv = buildSweepCsv(mockSweepData);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toContain("ModCod");
    expect(headerLine).toContain("Viable");
  });

  it("outputs one data row per sweep point", () => {
    const csv = buildSweepCsv(mockSweepData);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    // 1 header + 2 data rows
    expect(lines.length).toBe(3);
  });

  it("formats data values correctly", () => {
    const csv = buildSweepCsv(mockSweepData);
    const rows = csv.split("\n");
    const firstDataRow = rows[1];
    expect(firstDataRow).toContain("0");
    expect(firstDataRow).toContain("8");
    expect(firstDataRow).toContain("8PSK 3/4");
    expect(firstDataRow).toContain("true");
  });

  it("handles empty points array", () => {
    const emptyData: SweepResponse = {
      ...mockSweepData,
      points: [],
    };
    const csv = buildSweepCsv(emptyData);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    // Header only
    expect(lines.length).toBe(1);
  });

  it("handles null metric values", () => {
    const nullData: SweepResponse = {
      ...mockSweepData,
      points: [
        {
          sweep_value: 10,
          combined_link_margin_db: null,
          combined_cn_db: null,
          combined_cn0_dbhz: null,
          uplink_cn_db: null,
          uplink_rain_loss_db: null,
          uplink_link_margin_db: null,
          downlink_cn_db: null,
          downlink_rain_loss_db: null,
          downlink_link_margin_db: null,
          modcod_id: null,
          modcod_label: null,
          viable: false,
          warnings: [],
        },
      ],
    };
    const csv = buildSweepCsv(nullData);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    expect(lines.length).toBe(2);
    // Should not throw
  });
});

describe("buildPdfParameterRows", () => {
  const mockResponse: CalculationResponse = {
    schema_version: "1.1.0",
    strategy: {
      waveform_strategy: "DVB_S2X",
      transponder_type: "TRANSPARENT",
    },
    results: {
      uplink: {
        direction: "uplink",
        fspl_db: 207.1,
        rain_loss_db: 1.2,
        gas_loss_db: 0.3,
        cloud_loss_db: 0.1,
        atm_loss_db: 1.6,
        antenna_pointing_loss_db: 0.1,
        gt_db_per_k: 2.5,
        cn_db: 12.5,
        cn0_dbhz: 88.1,
        link_margin_db: 3.5,
        clean_link_margin_db: 4.0,
        clean_cn_db: 13.0,
        modcod_selected: "QPSK 3/4",
        eirp_dbw: 65.0,
        bandwidth_hz: 36e6,
        cni_db: 11.8,
        cni0_dbhz: 87.4,
        c_im_db: 25.0,
        interference_applied: false,
        intermod_applied: false,
        warnings: [],
      },
      downlink: {
        direction: "downlink",
        fspl_db: 205.5,
        rain_loss_db: 2.0,
        gas_loss_db: 0.2,
        cloud_loss_db: 0.05,
        atm_loss_db: 2.25,
        antenna_pointing_loss_db: 0.1,
        gt_db_per_k: 23.2,
        cn_db: 14.0,
        cn0_dbhz: 89.6,
        link_margin_db: 5.0,
        clean_link_margin_db: 5.5,
        clean_cn_db: 14.5,
        modcod_selected: "QPSK 3/4",
        eirp_dbw: 51.0,
        bandwidth_hz: 36e6,
        cni_db: 13.5,
        cni0_dbhz: 89.1,
        c_im_db: 22.0,
        interference_applied: false,
        intermod_applied: false,
        warnings: [],
      },
      combined: {
        cn_db: 9.5,
        cn0_dbhz: 85.1,
        cni_db: 9.0,
        cni0_dbhz: 84.6,
        c_im_db: 22.0,
        link_margin_db: 2.0,
        clean_link_margin_db: 2.5,
        clean_cn_db: 10.0,
      },
    },
    combined_link_margin_db: 2.0,
    combined_cn_db: 9.5,
    combined_cn0_dbhz: 85.1,
    modcod_selected: {
      id: "qpsk-3/4",
      modulation: "QPSK",
      code_rate: "3/4",
      required_cn0_dbhz: 65,
      info_bits_per_symbol: 1.48,
    },
    runtime_echo: {
      sat_longitude_deg: 128.0,
      bandwidth_hz: 36e6,
      rolloff: 0.2,
      uplink: {
        frequency_hz: 14.25e9,
        bandwidth_hz: 36e6,
        elevation_deg: 48.5,
        rain_rate_mm_per_hr: 10,
        ground_lat_deg: 35.68,
        ground_lon_deg: 139.69,
      },
      downlink: {
        frequency_hz: 12.0e9,
        bandwidth_hz: 36e6,
        elevation_deg: 48.5,
        rain_rate_mm_per_hr: 15,
        ground_lat_deg: 35.68,
        ground_lon_deg: 139.69,
      },
    },
    payload_snapshot: null,
  } as unknown as CalculationResponse;

  it("returns an array of label-value pairs", () => {
    const rows = buildPdfParameterRows(mockResponse);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("label");
    expect(rows[0]).toHaveProperty("value");
  });

  it("includes strategy info", () => {
    const rows = buildPdfParameterRows(mockResponse);
    const labels = rows.map((r) => r.label);
    expect(labels).toContain("Strategy");
  });

  it("includes uplink and downlink parameters", () => {
    const rows = buildPdfParameterRows(mockResponse);
    const labels = rows.map((r) => r.label);
    expect(labels.some((l) => l.includes("UL"))).toBe(true);
    expect(labels.some((l) => l.includes("DL"))).toBe(true);
  });

  it("includes link margin result", () => {
    const rows = buildPdfParameterRows(mockResponse);
    const marginRow = rows.find((r) => r.label.includes("Margin"));
    expect(marginRow).toBeDefined();
    expect(marginRow!.value).toContain("2.00");
  });

  it("handles missing runtime_echo gracefully", () => {
    const noRuntime = {
      ...mockResponse,
      runtime_echo: undefined,
    } as unknown as CalculationResponse;
    const rows = buildPdfParameterRows(noRuntime);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("includes GO/NO-GO verdict", () => {
    const rows = buildPdfParameterRows(mockResponse);
    const verdictRow = rows.find((r) => r.label === "Verdict");
    expect(verdictRow).toBeDefined();
    expect(verdictRow!.value).toBe("GO");
  });

  it("shows NO-GO for negative margin", () => {
    const noGo = {
      ...mockResponse,
      combined_link_margin_db: -1.5,
    } as unknown as CalculationResponse;
    const rows = buildPdfParameterRows(noGo);
    const verdictRow = rows.find((r) => r.label === "Verdict");
    expect(verdictRow!.value).toBe("NO-GO");
  });
});
