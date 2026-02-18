import { Group, NumberInput, Stack, Switch } from "@mantine/core";
import { Controller } from "react-hook-form";

import type { FormSectionProps } from "./types";

export function IntermodulationSection({ control, errors }: FormSectionProps) {
  const imErrors = errors.runtime?.intermodulation;

  return (
    <Stack gap="xs">
      <Group grow>
        <Controller
          name="runtime.intermodulation.applied"
          control={control}
          render={({ field }) => (
            <Switch
              label="Apply intermodulation"
              checked={field.value || false}
              onChange={(event) => field.onChange(event.currentTarget.checked)}
            />
          )}
        />
      </Group>
      <Group grow>
        <Controller
          name="runtime.intermodulation.input_backoff_db"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Input back-off (dB)"
              min={0}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={imErrors?.input_backoff_db?.message}
            />
          )}
        />
        <Controller
          name="runtime.intermodulation.output_backoff_db"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Output back-off (dB)"
              min={0}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={imErrors?.output_backoff_db?.message}
            />
          )}
        />
        <Controller
          name="runtime.intermodulation.composite_carriers"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Composite carriers"
              min={1}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={imErrors?.composite_carriers?.message}
            />
          )}
        />
      </Group>
      <Group grow>
        <Controller
          name="runtime.intermodulation.reference_bandwidth_hz"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Reference bandwidth (Hz)"
              min={0}
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={imErrors?.reference_bandwidth_hz?.message}
            />
          )}
        />
        <Controller
          name="runtime.intermodulation.saturation_power_dbw"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Saturation power (dBW)"
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={imErrors?.saturation_power_dbw?.message}
            />
          )}
        />
      </Group>
    </Stack>
  );
}
