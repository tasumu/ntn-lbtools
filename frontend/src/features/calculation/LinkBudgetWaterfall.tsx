import { SegmentedControl, Stack, Text, useMantineTheme } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
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

const KB_DB = 228.6; // Boltzmann constant in dB (approx -228.6 dBW/K/Hz, so -k is +228.6)

export function LinkBudgetWaterfall({ uplink, downlink }: Props) {
  const [direction, setDirection] = useState<"uplink" | "downlink">("uplink"); // Default to Uplink? Or just change order in UI? UI requested Uplink first.
  const theme = useMantineTheme();

  const data = useMemo(() => {
    const target = direction === "uplink" ? uplink : downlink;
    if (!target) return [];

    const bwDb = target.bandwidth_hz ? 10 * Math.log10(target.bandwidth_hz) : 0;
    
    // Step 1: Tx EIRP (+)
    const eirp = target.eirp_dbw ?? 0;
    
    // Step 2: Path Loss (-) (FSPL + Atm + Pointing)
    const fspl = target.fspl_db;
    const otherLoss = (target.atm_loss_db ?? 0) - fspl;
    
    // Step 3: Rx G/T (+)
    const gt = target.gt_db_per_k;

    // Step 4: Boltzmann (-k) -> +228.6
    const boltzmann = KB_DB;

    // Step 5: Bandwidth (-10logB)
    const bwLoss = bwDb;

    const steps = [];
    let current = 0;

    // 1. Tx EIRP
    steps.push({
      name: "Tx EIRP",
      value: [current, current + eirp],
      displayValue: eirp,
      type: "gain",
    });
    current += eirp;

    // 2. FSPL
    steps.push({
      name: "FSPL",
      value: [current - fspl, current],
      displayValue: -fspl,
      type: "loss",
    });
    current -= fspl;

    // 3. Other Losses (Atm + Pointing)
    if (otherLoss > 0.01) {
      steps.push({
        name: "Atm/Point",
        value: [current - otherLoss, current],
        displayValue: -otherLoss,
        type: "loss",
      });
      current -= otherLoss;
    }

    // 4. Rx G/T
    steps.push({
      name: "Rx G/T",
      value: [current, current + gt],
      displayValue: gt,
      type: "gain",
    });
    current += gt;

    // 5. -k (Boltzmann)
    steps.push({
      name: "-k",
      value: [current, current + boltzmann],
      displayValue: boltzmann,
      type: "gain", 
    });
    current += boltzmann;

    // 6. -BW
    steps.push({
      name: "BW Loss",
      value: [current - bwLoss, current],
      displayValue: -bwLoss,
      type: "loss",
    });
    current -= bwLoss;

    // Final: C/N (Total)
    steps.push({
      name: "C/N",
      value: [0, current],
      displayValue: current,
      type: "total",
    });

    return steps;
  }, [uplink, downlink, direction]);

  return (
    <Stack gap="md">
      <SegmentedControl
        value={direction}
        onChange={(v) => setDirection(v as "uplink" | "downlink")}
        data={[
          { label: "Uplink", value: "uplink" },
          { label: "Downlink", value: "downlink" },
        ]}
      />
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: "dB", angle: -90, position: "insideLeft" }} />
          <Tooltip
            cursor={{ fill: "transparent" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div style={{ backgroundColor: "white", padding: "8px", border: "1px solid #ccc", borderRadius: 4 }}>
                    <Text size="sm" fw={700}>{item.name}</Text>
                    <Text size="sm">Value: {item.displayValue.toFixed(2)} dB</Text>
                    <Text size="xs" c="dimmed">
                      Range: {item.value[0].toFixed(1)} to {item.value[1].toFixed(1)}
                    </Text>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={0} stroke="#000" />
          
          {data.slice(0, -1).map((step, index) => {
            const nextStep = data[index + 1];
            let yLevel = 0;
            if (nextStep.type === "loss") {
              yLevel = nextStep.value[1];
            } else if (nextStep.type === "gain") {
              yLevel = nextStep.value[0];
            } else if (nextStep.type === "total") {
              yLevel = nextStep.value[1];
            }
            return (
              <ReferenceLine
                key={`conn-${index}`}
                segment={[
                  { x: step.name, y: yLevel },
                  { x: nextStep.name, y: yLevel },
                ]}
                stroke="#333"
                strokeDasharray="2 2"
              />
            );
          })}

          <Bar dataKey="value">
            {data.map((entry, index) => {
              let color = theme.colors.gray[5];
              if (entry.type === "gain") color = theme.colors.teal[6];
              if (entry.type === "loss") color = theme.colors.red[6];
              if (entry.type === "total") color = theme.colors.blue[6];
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
            <LabelList
              dataKey="displayValue"
              position="top"
              formatter={(val: number) => val.toFixed(1)}
              style={{ fontSize: 11, fill: "#666" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Text size="xs" c="dimmed" ta="center">
        * "Atm/Point" includes Rain, Gas, Cloud, and Antenna Pointing losses. 
        * "-k" is the Boltzmann constant conversion (+228.6 dB).
      </Text>
    </Stack>
  );
}