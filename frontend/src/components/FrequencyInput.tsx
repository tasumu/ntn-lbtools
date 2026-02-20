import { Group, NumberInput, Select } from "@mantine/core";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

export type UnitOption = {
  label: string;
  value: string;
  multiplier: number;
};

export const FREQUENCY_UNITS: UnitOption[] = [
  { label: "GHz", value: "GHz", multiplier: 1e9 },
  { label: "MHz", value: "MHz", multiplier: 1e6 },
  { label: "Hz", value: "Hz", multiplier: 1 },
];

export const BANDWIDTH_UNITS: UnitOption[] = [
  { label: "MHz", value: "MHz", multiplier: 1e6 },
  { label: "kHz", value: "kHz", multiplier: 1e3 },
  { label: "Hz", value: "Hz", multiplier: 1 },
];

type Props = {
  label: ReactNode;
  description?: string;
  withAsterisk?: boolean;
  value?: number | null;
  onChange: (valueHz: number | undefined) => void;
  error?: string;
  units: UnitOption[];
  defaultUnit: string;
};

export function FrequencyInput({
  label,
  description,
  withAsterisk,
  value,
  onChange,
  error,
  units,
  defaultUnit,
}: Props) {
  const [selectedUnit, setSelectedUnit] = useState(defaultUnit);

  const multiplier = useMemo(
    () => units.find((u) => u.value === selectedUnit)?.multiplier ?? 1,
    [units, selectedUnit],
  );

  const displayValue = useMemo(() => {
    if (value == null) return undefined;
    return value / multiplier;
  }, [value, multiplier]);

  const handleValueChange = useCallback(
    (val: string | number) => {
      if (val === "" || val === undefined) {
        onChange(undefined);
        return;
      }
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (Number.isFinite(num)) {
        onChange(num * multiplier);
      } else {
        onChange(undefined);
      }
    },
    [multiplier, onChange],
  );

  const handleUnitChange = useCallback((newUnit: string | null) => {
    if (!newUnit) return;
    setSelectedUnit(newUnit);
  }, []);

  const selectData = useMemo(
    () => units.map((u) => ({ value: u.value, label: u.label })),
    [units],
  );

  return (
    <Group gap={0} align="flex-end" wrap="nowrap">
      <NumberInput
        label={label}
        description={description}
        withAsterisk={withAsterisk}
        value={displayValue}
        onChange={handleValueChange}
        error={error}
        decimalScale={6}
        style={{ flex: 1 }}
      />
      <Select
        aria-label="Unit"
        data={selectData}
        value={selectedUnit}
        onChange={handleUnitChange}
        allowDeselect={false}
        w={90}
      />
    </Group>
  );
}
