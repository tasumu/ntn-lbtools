import { Group, Progress, Stack, Text } from "@mantine/core";

import type { CalculationResponse } from "../../../api/schemas";
import { formatDb } from "../../../lib/formatters";

type Props = {
  uplink: CalculationResponse["results"]["uplink"];
  downlink: CalculationResponse["results"]["downlink"];
  combined?: CalculationResponse["results"]["combined"];
  transponderType?: string;
};

export function CnBalanceSection({
  uplink,
  downlink,
  combined,
  transponderType,
}: Props) {
  const ulDegraded = uplink.cn_db;
  const ulClean = uplink.clean_cn_db ?? ulDegraded;
  const ulDegradation = Math.max(0, ulClean - ulDegraded);

  const dlDegraded = downlink.cn_db;
  const dlClean = downlink.clean_cn_db ?? dlDegraded;
  const dlDegradation = Math.max(0, dlClean - dlDegraded);

  let totalDegraded: number;
  let totalClean: number;
  let totalDegradation: number;

  if (transponderType === "REGENERATIVE") {
    totalDegraded = Math.min(ulDegraded, dlDegraded);
    totalClean = Math.min(ulClean, dlClean);
    totalDegradation = Math.max(0, totalClean - totalDegraded);
  } else {
    totalDegraded = combined?.cn_db ?? 0;
    totalClean = combined?.clean_cn_db ?? totalDegraded;
    totalDegradation = Math.max(0, totalClean - totalDegraded);
  }

  const maxVal = Math.max(20, Math.max(ulClean, dlClean, totalClean) + 5);

  return (
    <Stack gap={4}>
      <BalanceBar
        label="Uplink"
        degraded={ulDegraded}
        degradation={ulDegradation}
        color="teal"
        maxVal={maxVal}
      />
      <BalanceBar
        label="Downlink"
        degraded={dlDegraded}
        degradation={dlDegradation}
        color="blue"
        maxVal={maxVal}
      />
      <BalanceBar
        label={transponderType === "REGENERATIVE" ? "Bottleneck" : "Total"}
        degraded={totalDegraded}
        degradation={totalDegradation}
        color="grape"
        maxVal={maxVal}
      />
    </Stack>
  );
}

function BalanceBar({
  label,
  degraded,
  degradation,
  color,
  maxVal,
}: {
  label: string;
  degraded: number;
  degradation: number;
  color: string;
  maxVal: number;
}) {
  const clean = degraded + degradation;
  const degPercent = Math.min(100, Math.max(0, (degraded / maxVal) * 100));
  const cleanPercent = Math.min(100, Math.max(0, (degradation / maxVal) * 100));

  return (
    <Group gap="xs" align="center">
      <Text size="xs" w={60}>
        {label}
      </Text>
      <Progress.Root size="sm" style={{ flex: 1 }}>
        <Progress.Section value={degPercent} color={color} />
        <Progress.Section
          value={cleanPercent}
          color={color}
          style={{ opacity: 0.3 }}
        />
      </Progress.Root>
      <Text size="xs" w={90} ta="right">
        {formatDb(degraded)} / {formatDb(clean)} dB
      </Text>
    </Group>
  );
}
