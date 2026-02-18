import { Divider, Group, NumberInput, Switch, TextInput } from "@mantine/core";
import { Controller } from "react-hook-form";

import type { FormSectionProps } from "./types";

type Props = FormSectionProps & {
  direction: "uplink" | "downlink";
  mitigationDb: number | undefined;
  onMitigationChange: (value: number | undefined) => void;
};

export function InterferenceSection({
  control,
  errors,
  direction,
  mitigationDb,
  onMitigationChange,
}: Props) {
  const label = direction === "uplink" ? "Uplink" : "Downlink";
  const dirErrors =
    direction === "uplink"
      ? errors.runtime?.uplink?.interference
      : errors.runtime?.downlink?.interference;

  return (
    <>
      <Divider label={`Interference (${label})`} />
      <Group grow>
        <Controller
          name={`runtime.${direction}.interference.applied`}
          control={control}
          render={({ field }) => (
            <Switch
              label={`Apply ${direction} interference`}
              checked={field.value || false}
              onChange={(event) => field.onChange(event.currentTarget.checked)}
            />
          )}
        />
      </Group>
      <Group grow>
        <NumberInput
          label={`Mitigation (dB, improve ${direction} C/I)`}
          min={0}
          value={mitigationDb ?? undefined}
          onChange={(value) =>
            onMitigationChange(value === "" ? undefined : (value as number | undefined))
          }
        />
        <Controller
          name={`runtime.${direction}.interference.notes`}
          control={control}
          render={({ field }) => (
            <TextInput
              label="Notes"
              placeholder={
                direction === "uplink"
                  ? "e.g., improved pointing"
                  : "e.g., cross-pol isolation improvement"
              }
              value={field.value || ""}
              onChange={(event) => field.onChange(event.currentTarget.value)}
            />
          )}
        />
      </Group>
      <Group grow>
        <Controller
          name={`runtime.${direction}.interference.adjacent_sat_ci_db`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Adjacent Satellite Interference C/I (dB)"
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={dirErrors?.adjacent_sat_ci_db?.message}
            />
          )}
        />
        <Controller
          name={`runtime.${direction}.interference.cross_polar_ci_db`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Cross-Polarization Interference C/I (dB)"
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={dirErrors?.cross_polar_ci_db?.message}
            />
          )}
        />
        <Controller
          name={`runtime.${direction}.interference.other_carrier_ci_db`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Other interference C/I (dB)"
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value === "" ? undefined : value)}
              error={dirErrors?.other_carrier_ci_db?.message}
            />
          )}
        />
      </Group>
    </>
  );
}
