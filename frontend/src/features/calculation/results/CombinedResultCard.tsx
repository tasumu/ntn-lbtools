import { Badge, Button, Card, Group, Stack, Text } from "@mantine/core";

import type { CalculationResponse } from "../../../api/schemas";
import { formatDb, formatHz, formatModcod, formatThroughput } from "../../../lib/formatters";
import { CnBalanceSection } from "./CnBalanceSection";

type Props = {
  results: CalculationResponse["results"];
  combinedLinkMarginDb?: number | null;
  modcodSelected?: CalculationResponse["modcod_selected"];
  transponderType?: string;
  isDirectionalModcod: boolean;
  modcodSummary: string;
  channelBandwidth?: number | null;
  onSave: () => void;
};

export function CombinedResultCard({
  results,
  combinedLinkMarginDb,
  modcodSelected,
  transponderType,
  isDirectionalModcod,
  modcodSummary,
  channelBandwidth,
  onSave,
}: Props) {
  const cleanMargin =
    results.combined?.clean_link_margin_db ??
    (transponderType === "REGENERATIVE" &&
    results.uplink.clean_link_margin_db != null &&
    results.downlink.clean_link_margin_db != null
      ? Math.min(results.uplink.clean_link_margin_db, results.downlink.clean_link_margin_db)
      : null);

  const e2eMargin =
    combinedLinkMarginDb ??
    results.combined?.link_margin_db ??
    Math.min(results.uplink.link_margin_db, results.downlink.link_margin_db);

  const isGo = e2eMargin != null && e2eMargin > 0;

  const getSpectralEfficiency = (
    modcod: CalculationResponse["modcod_selected"] | undefined,
    direction?: "uplink" | "downlink",
  ): number | null | undefined => {
    if (!modcod) return null;
    if ("uplink" in modcod || "downlink" in modcod) {
      const directional = modcod as { uplink?: { effective_spectral_efficiency?: number | null } | null; downlink?: { effective_spectral_efficiency?: number | null } | null };
      const target = direction ? directional[direction] : (directional.downlink ?? directional.uplink);
      return target?.effective_spectral_efficiency;
    }
    return (modcod as { effective_spectral_efficiency?: number | null }).effective_spectral_efficiency;
  };

  const throughput =
    transponderType === "REGENERATIVE"
      ? null
      : formatThroughput(channelBandwidth, getSpectralEfficiency(modcodSelected));

  return (
    <Card shadow="sm" withBorder style={{ flex: 0.8 }}>
      <Group justify="space-between">
        <Text fw={600}>Total</Text>
        <Badge color={isGo ? "green" : "red"} variant="filled" size="lg">
          {isGo ? "GO" : "NO-GO"}
        </Badge>
      </Group>
      <Stack gap={6} mt="sm">
        <Text size="sm">Clean margin: {formatDb(cleanMargin)} dB</Text>
        <Text size="sm">End-to-end margin: {formatDb(e2eMargin)} dB</Text>
        <Text size="sm">
          C/(N+I): {formatDb(results.combined?.cni_db)} dB | C/IM: {formatDb(results.combined?.c_im_db)}
        </Text>
        {transponderType === "REGENERATIVE" && (
          <>
            <Text size="sm">Uplink margin: {formatDb(results.uplink.link_margin_db)} dB</Text>
            <Text size="sm">Downlink margin: {formatDb(results.downlink.link_margin_db)} dB</Text>
            <Text size="sm">
              UL throughput: {formatThroughput(results.uplink.bandwidth_hz, getSpectralEfficiency(modcodSelected, "uplink"))}
            </Text>
            <Text size="sm">
              DL throughput: {formatThroughput(results.downlink.bandwidth_hz, getSpectralEfficiency(modcodSelected, "downlink"))}
            </Text>
          </>
        )}
        {!isDirectionalModcod && (
          <Text size="sm">Selected ModCod: {modcodSummary}</Text>
        )}
        {throughput && <Text size="sm">Throughput: {throughput}</Text>}
        <Text size="sm">Channel BW: {formatHz(channelBandwidth)}</Text>
        <Text size="sm" fw={600} mt="xs">C/N Balance</Text>
        <CnBalanceSection
          uplink={results.uplink}
          downlink={results.downlink}
          combined={results.combined}
          transponderType={transponderType}
        />
        <Button mt="xs" onClick={onSave}>Save as scenario</Button>
      </Stack>
    </Card>
  );
}
