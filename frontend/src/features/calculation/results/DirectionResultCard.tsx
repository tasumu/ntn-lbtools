import { Badge, Card, Group, Stack, Text } from "@mantine/core";

import type { CalculationResponse } from "../../../api/schemas";
import { formatDb, formatDeg, formatApplied, formatModcod, formatThroughput } from "../../../lib/formatters";

type DirectionResult = CalculationResponse["results"]["uplink"];

type Props = {
  direction: "uplink" | "downlink";
  result: DirectionResult;
  elevationDeg?: number | null;
  transponderType?: string;
  isDirectionalModcod: boolean;
  modcodSelected?: CalculationResponse["modcod_selected"];
};

export function DirectionResultCard({
  direction,
  result,
  elevationDeg,
  transponderType,
  isDirectionalModcod,
  modcodSelected,
}: Props) {
  const label = direction === "uplink" ? "Uplink" : "Downlink";
  const isRegen = transponderType === "REGENERATIVE";
  const directionIsGo = isRegen && result.link_margin_db > 0;

  const getDirectionalSpectralEfficiency = (): number | null | undefined => {
    if (!modcodSelected) return null;
    if ("uplink" in modcodSelected || "downlink" in modcodSelected) {
      const directional = modcodSelected as { uplink?: { effective_spectral_efficiency?: number | null } | null; downlink?: { effective_spectral_efficiency?: number | null } | null };
      return directional[direction]?.effective_spectral_efficiency;
    }
    return (modcodSelected as { effective_spectral_efficiency?: number | null }).effective_spectral_efficiency;
  };

  return (
    <Card shadow="sm" withBorder style={{ flex: 1 }}>
      <Group justify="space-between">
        <Text fw={600}>Result ({label})</Text>
        {isRegen && (
          <Badge color={directionIsGo ? "green" : "red"} variant="light" size="md">
            {directionIsGo ? "GO" : "NO-GO"}
          </Badge>
        )}
      </Group>
      <Stack gap={4} mt="sm">
        <Text size="sm">Elevation: {formatDeg(elevationDeg)} deg</Text>
        <Text size="sm">Tx EIRP: {formatDb(result.eirp_dbw)} dBW</Text>
        <Text size="sm">Rx G/T: {formatDb(result.gt_db_per_k)} dB/K</Text>
        <Text size="sm">Pointing Loss: {formatDb(result.antenna_pointing_loss_db)} dB</Text>
        <Text size="sm">FSPL: {formatDb(result.fspl_db)} dB</Text>
        <Text size="sm">Rain loss: {formatDb(result.rain_loss_db)} dB</Text>
        <Text size="sm">Gas loss: {formatDb(result.gas_loss_db)} dB</Text>
        <Text size="sm">
          C/N0: {formatDb(result.cn0_dbhz)} dB-Hz | C/N: {formatDb(result.cn_db)} dB
        </Text>
        <Text size="sm">
          C/(N+I): {formatDb(result.cni_db)} dB | C/IM: {formatDb(result.c_im_db)} dB (
          {formatApplied(result.interference_applied)} / {formatApplied(result.intermod_applied)})
        </Text>
        {isRegen && (
          <Text size="sm">Link margin: {formatDb(result.link_margin_db)} dB</Text>
        )}
        {isDirectionalModcod && (
          <Text size="sm">ModCod: {formatModcod(modcodSelected, direction)}</Text>
        )}
        {isRegen && (
          <Text size="sm">
            Throughput: {formatThroughput(result.bandwidth_hz, getDirectionalSpectralEfficiency())}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
