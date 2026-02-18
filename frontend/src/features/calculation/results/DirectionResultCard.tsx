import { Card, Group, Stack, Text } from "@mantine/core";

import type { CalculationResponse } from "../../../api/schemas";
import { formatDb, formatDeg, formatApplied, formatModcod } from "../../../lib/formatters";

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

  return (
    <Card shadow="sm" withBorder style={{ flex: 1 }}>
      <Group justify="space-between">
        <Text fw={600}>Result ({label})</Text>
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
        {transponderType === "REGENERATIVE" && (
          <Text size="sm">Link margin: {formatDb(result.link_margin_db)} dB</Text>
        )}
        {isDirectionalModcod && (
          <Text size="sm">ModCod: {formatModcod(modcodSelected, direction)}</Text>
        )}
      </Stack>
    </Card>
  );
}
