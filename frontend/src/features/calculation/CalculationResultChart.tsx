import { Card, Stack, Text } from "@mantine/core";
import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CalculationResponse } from "../../api/schemas";

type Props = {
  uplink: CalculationResponse["results"]["uplink"];
  downlink: CalculationResponse["results"]["downlink"];
};

export const CalculationResultChart = memo(function CalculationResultChart({
  uplink,
  downlink,
}: Props) {
  const lossData = useMemo(
    () => [
      {
        name: "Rain",
        uplink: uplink.rain_loss_db,
        downlink: downlink.rain_loss_db,
      },
      {
        name: "Gas",
        uplink: uplink.gas_loss_db,
        downlink: downlink.gas_loss_db,
      },
      {
        name: "Cloud",
        uplink: uplink.cloud_loss_db,
        downlink: downlink.cloud_loss_db,
      },
      {
        name: "Pointing",
        uplink: uplink.antenna_pointing_loss_db,
        downlink: downlink.antenna_pointing_loss_db,
      },
      {
        name: "Total Atm",
        uplink:
          uplink.rain_loss_db + uplink.gas_loss_db + uplink.cloud_loss_db,
        downlink:
          downlink.rain_loss_db +
          downlink.gas_loss_db +
          downlink.cloud_loss_db,
      },
    ],
    [uplink, downlink],
  );

  const signalData = useMemo(
    () => [
      {
        name: "Tx EIRP (dBW)",
        uplink: uplink.eirp_dbw,
        downlink: downlink.eirp_dbw,
      },
      {
        name: "Rx G/T (dB/K)",
        uplink: uplink.gt_db_per_k,
        downlink: downlink.gt_db_per_k,
      },
      { name: "C/N (dB)", uplink: uplink.cn_db, downlink: downlink.cn_db },
      {
        name: "Margin (dB)",
        uplink: uplink.link_margin_db,
        downlink: downlink.link_margin_db,
      },
    ],
    [uplink, downlink],
  );

  return (
    <Stack gap="md">
      <Card shadow="sm" withBorder>
        <Text fw={600} mb="sm">
          Losses (dB)
        </Text>
        <div
          role="img"
          aria-label="Bar chart comparing uplink and downlink atmospheric losses"
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={lossData}
              margin={{ top: 8, right: 16, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="uplink"
                name="Uplink"
                fill="var(--mantine-color-uplink-7)"
              />
              <Bar
                dataKey="downlink"
                name="Downlink"
                fill="var(--mantine-color-downlink-7)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card shadow="sm" withBorder>
        <Text fw={600} mb="sm">
          Signal Metrics
        </Text>
        <div
          role="img"
          aria-label="Bar chart comparing uplink and downlink signal metrics"
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={signalData}
              margin={{ top: 8, right: 16, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="uplink"
                name="Uplink"
                fill="var(--mantine-color-uplink-7)"
              />
              <Bar
                dataKey="downlink"
                name="Downlink"
                fill="var(--mantine-color-downlink-7)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Stack>
  );
});
