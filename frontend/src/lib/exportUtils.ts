import { OUTPUT_METRICS } from "../features/sweep/sweepTypes";
import type { SweepResponse } from "../features/sweep/sweepTypes";
import type { CalculationResponse } from "../api/schemas";

/**
 * Trigger a browser file download from a CSV string.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Build a CSV string from SweepResponse data.
 * Columns: sweep label, all OUTPUT_METRICS, ModCod, Viable.
 */
export function buildSweepCsv(data: SweepResponse): string {
  const headers = [
    data.sweep_label,
    ...OUTPUT_METRICS.map((m) => m.label),
    "ModCod",
    "Viable",
  ];

  const rows = data.points.map((pt) => [
    pt.sweep_value,
    ...OUTPUT_METRICS.map((m) => pt[m.key] ?? ""),
    pt.modcod_label ?? pt.modcod_id ?? "",
    pt.viable,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export type PdfParameterRow = { label: string; value: string };

function fmtDb(v: number | null | undefined): string {
  return v != null ? `${v.toFixed(2)} dB` : "N/A";
}

function fmtHz(v: number | null | undefined): string {
  if (v == null) return "N/A";
  if (v >= 1e9) return `${(v / 1e9).toFixed(3)} GHz`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} MHz`;
  return `${v} Hz`;
}

/**
 * Extract key parameters and results from a CalculationResponse
 * for rendering in a PDF report.
 */
export function buildPdfParameterRows(
  data: CalculationResponse,
): PdfParameterRow[] {
  const rt = data.runtime_echo as Record<string, unknown> | undefined;
  const ul = (rt?.uplink ?? {}) as Record<string, unknown>;
  const dl = (rt?.downlink ?? {}) as Record<string, unknown>;

  const strategy = data.strategy;
  const margin = data.combined_link_margin_db ?? data.results.combined?.link_margin_db ?? null;

  const rows: PdfParameterRow[] = [
    {
      label: "Strategy",
      value: `${strategy?.waveform_strategy ?? "N/A"} / ${strategy?.transponder_type ?? "N/A"}`,
    },
    {
      label: "Sat Longitude",
      value: rt?.sat_longitude_deg != null ? `${rt.sat_longitude_deg}\u00B0E` : "N/A",
    },
    { label: "Channel BW", value: fmtHz(rt?.bandwidth_hz as number | undefined) },
    { label: "UL Frequency", value: fmtHz(ul.frequency_hz as number | undefined) },
    { label: "UL Elevation", value: ul.elevation_deg != null ? `${ul.elevation_deg}\u00B0` : "N/A" },
    { label: "UL Rain Rate", value: ul.rain_rate_mm_per_hr != null ? `${ul.rain_rate_mm_per_hr} mm/hr` : "N/A" },
    { label: "DL Frequency", value: fmtHz(dl.frequency_hz as number | undefined) },
    { label: "DL Elevation", value: dl.elevation_deg != null ? `${dl.elevation_deg}\u00B0` : "N/A" },
    { label: "DL Rain Rate", value: dl.rain_rate_mm_per_hr != null ? `${dl.rain_rate_mm_per_hr} mm/hr` : "N/A" },
    { label: "UL C/N", value: fmtDb(data.results.uplink.cn_db) },
    { label: "DL C/N", value: fmtDb(data.results.downlink.cn_db) },
    { label: "Combined C/N", value: fmtDb(data.combined_cn_db ?? data.results.combined?.cn_db) },
    { label: "Link Margin", value: fmtDb(margin) },
    { label: "Verdict", value: margin != null && margin > 0 ? "GO" : "NO-GO" },
  ];

  return rows;
}

/**
 * Export a link budget calculation result as a single-page landscape PDF.
 * Captures the waterfall chart element as an image and adds a parameter summary table.
 */
export async function exportCalculationPdf(
  data: CalculationResponse,
  chartElement: HTMLElement | null,
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Title
  doc.setFontSize(16);
  doc.text("Link Budget Report", margin, margin + 6);

  // Date line
  doc.setFontSize(9);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.text(`Date: ${dateStr}`, margin, margin + 14);

  const contentTop = margin + 20;
  const chartW = (pageW - margin * 3) * 0.55;
  const tableX = margin + chartW + margin;
  const tableW = pageW - tableX - margin;

  // Capture waterfall chart
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const ratio = canvas.height / canvas.width;
      const imgH = Math.min(chartW * ratio, pageH - contentTop - margin);
      doc.addImage(imgData, "PNG", margin, contentTop, chartW, imgH);
    } catch {
      doc.setFontSize(10);
      doc.text("(Chart capture unavailable)", margin, contentTop + 10);
    }
  }

  // Parameter summary table
  const rows = buildPdfParameterRows(data);
  doc.setFontSize(11);
  doc.text("Parameter Summary", tableX, contentTop);

  doc.setFontSize(8);
  let y = contentTop + 6;
  const lineH = 5;

  for (const row of rows) {
    if (y + lineH > pageH - margin) break;

    doc.setFont("helvetica", "bold");
    doc.text(row.label, tableX, y);
    doc.setFont("helvetica", "normal");
    doc.text(row.value, tableX + tableW * 0.45, y);

    // Draw light separator
    doc.setDrawColor(220, 220, 220);
    doc.line(tableX, y + 1.5, tableX + tableW, y + 1.5);

    y += lineH;
  }

  doc.save(`link_budget_${dateStr}.pdf`);
}
