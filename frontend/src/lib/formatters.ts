import type { CalculationResponse } from "../api/schemas";

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : null;
};

export const formatDb = (value?: number | null): string => {
  const n = toNumber(value);
  return n === null ? "-" : n.toFixed(2);
};

export const formatHz = (value?: number | null): string => {
  const n = toNumber(value);
  return n === null
    ? "-"
    : `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} Hz`;
};

export const formatDeg = (value?: number | null): string => {
  const n = toNumber(value);
  return n === null ? "-" : n.toFixed(2);
};

export const formatModcod = (
  modcod: CalculationResponse["modcod_selected"] | undefined,
  direction?: "uplink" | "downlink",
): string => {
  if (!modcod) return "-";

  type SingleModcod = {
    modulation?: string | null;
    code_rate?: string | null;
    id?: string;
  };

  const hasDirection =
    typeof modcod === "object" &&
    modcod !== null &&
    ("uplink" in modcod || "downlink" in modcod);

  if (hasDirection) {
    const directional = modcod as {
      uplink?: SingleModcod | null;
      downlink?: SingleModcod | null;
    };
    const target = direction
      ? directional[direction]
      : directional.downlink || directional.uplink;
    if (!target) return "-";
    const parts = [target.modulation, target.code_rate].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : (target.id ?? "-");
  }

  const single = modcod as SingleModcod;
  const parts = [single.modulation, single.code_rate].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : (single.id ?? "-");
};

export const formatThroughput = (
  bandwidthHz?: number | null,
  spectralEfficiency?: number | null,
): string => {
  const bw = toNumber(bandwidthHz);
  const se = toNumber(spectralEfficiency);
  if (bw === null || se === null) return "-";
  const bps = bw * se;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} kbps`;
  return `${bps.toFixed(2)} bps`;
};

export const formatApplied = (flag?: boolean): string =>
  flag ? "Applied" : "Not applied";

export const formatError = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const detail = (error as { detail?: unknown }).detail;
  if (detail) {
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            const loc = Array.isArray((item as { loc?: unknown }).loc)
              ? (item as { loc: string[] }).loc.join(" → ")
              : "";
            return `${loc}: ${(item as { msg: string }).msg}`;
          }
          try {
            return JSON.stringify(item);
          } catch {
            return String(item);
          }
        })
        .join("; ");
    }
    if (typeof detail === "object") {
      try {
        return JSON.stringify(detail);
      } catch {
        return "Unknown error";
      }
    }
    return String(detail);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};
