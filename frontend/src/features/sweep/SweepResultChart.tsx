import {
  Badge,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Tabs,
  Text,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { memo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDb } from "../../lib/formatters";
import type { SweepResponse, OutputMetricKey } from "./sweepTypes";
import { OUTPUT_METRICS } from "./sweepTypes";

export function formatTickValue(v: number): string {
  return Number(v).toFixed(2);
}

type Props = {
  data: SweepResponse;
};

function SweepResultChartInner({ data }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<OutputMetricKey>(
    "combined_link_margin_db",
  );

  const selectedMetricInfo = OUTPUT_METRICS.find(
    (m) => m.key === selectedMetric,
  );
  const yLabel = selectedMetricInfo
    ? `${selectedMetricInfo.label} (${selectedMetricInfo.unit})`
    : "";

  const chartData = data.points.map((pt) => ({
    x: pt.sweep_value,
    y: pt[selectedMetric] as number | null,
    viable: pt.viable,
    modcod: pt.modcod_label ?? pt.modcod_id ?? "-",
  }));

  const handleCopyCSV = () => {
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
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    navigator.clipboard.writeText(csv);
    notifications.show({
      title: "Copied",
      message: "CSV data copied to clipboard",
      color: "blue",
    });
  };

  return (
    <Card shadow="sm" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Sweep Results</Text>
          {data.crossover_value != null && (
            <Badge color="orange" variant="filled" size="lg">
              Crossover: {data.crossover_value.toFixed(1)}
            </Badge>
          )}
        </Group>

        <SegmentedControl
          value={selectedMetric}
          onChange={(v) => setSelectedMetric(v as OutputMetricKey)}
          data={OUTPUT_METRICS.map((m) => ({
            value: m.key,
            label: m.label,
          }))}
          size="xs"
        />

        <Tabs defaultValue="chart" aria-label="Sweep result visualization">
          <Tabs.List>
            <Tabs.Tab value="chart">Chart</Tabs.Tab>
            <Tabs.Tab value="table">Data Table</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="chart" pt="md">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  label={{
                    value: data.sweep_label,
                    position: "insideBottom",
                    offset: -5,
                  }}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatTickValue}
                />
                <YAxis
                  label={{
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip
                  formatter={(value: number | string | (number | string)[]) => [
                    typeof value === "number" ? formatDb(value) : "-",
                    selectedMetricInfo?.label ?? "",
                  ]}
                  labelFormatter={(label: number) =>
                    `${data.sweep_label}: ${formatTickValue(label)}`
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="y"
                  name={selectedMetricInfo?.label}
                  stroke="var(--mantine-color-blue-6)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                {data.threshold_db != null && (
                  <ReferenceLine
                    y={data.threshold_db}
                    stroke="red"
                    strokeDasharray="5 5"
                    label={{
                      value: `Threshold: ${data.threshold_db} dB`,
                      position: "right",
                      fill: "red",
                      fontSize: 12,
                    }}
                  />
                )}
                {data.crossover_value != null && (
                  <ReferenceLine
                    x={data.crossover_value}
                    stroke="orange"
                    strokeDasharray="3 3"
                    label={{
                      value: `Crossover: ${data.crossover_value.toFixed(1)}`,
                      position: "top",
                      fill: "orange",
                      fontSize: 12,
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Tabs.Panel>

          <Tabs.Panel value="table" pt="md">
            <Group justify="flex-end" mb="xs">
              <Button size="xs" variant="light" onClick={handleCopyCSV}>
                Copy CSV
              </Button>
            </Group>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{data.sweep_label}</Table.Th>
                  <Table.Th>{selectedMetricInfo?.label ?? "Value"}</Table.Th>
                  <Table.Th>ModCod</Table.Th>
                  <Table.Th>Viable</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.points.map((pt, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{pt.sweep_value}</Table.Td>
                    <Table.Td>
                      {formatDb(pt[selectedMetric] as number | null)} dB
                    </Table.Td>
                    <Table.Td>
                      {pt.modcod_label ?? pt.modcod_id ?? "-"}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={pt.viable ? "green" : "red"}
                        size="sm"
                        variant="filled"
                      >
                        {pt.viable ? "Yes" : "No"}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}

export const SweepResultChart = memo(SweepResultChartInner);
