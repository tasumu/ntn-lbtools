import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Group, NumberInput, Select, Stack } from "@mantine/core";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  SWEEPABLE_PARAMETERS,
  sweepConfigSchema,
  type SweepConfig,
} from "./sweepTypes";

type Props = {
  onSubmit: (config: SweepConfig) => void;
  loading?: boolean;
  disabled?: boolean;
};

const parameterOptions = SWEEPABLE_PARAMETERS.map((p) => ({
  value: p.path,
  label: p.label,
}));

export function SweepConfigForm({ onSubmit, loading, disabled }: Props) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SweepConfig>({
    resolver: zodResolver(sweepConfigSchema),
    defaultValues: {
      parameter_path: "",
      start: 0,
      end: 100,
      steps: 50,
    },
  });

  const selectedPath = watch("parameter_path");

  useEffect(() => {
    const param = SWEEPABLE_PARAMETERS.find((p) => p.path === selectedPath);
    if (param) {
      setValue("start", param.defaultStart);
      setValue("end", param.defaultEnd);
      setValue("steps", param.defaultSteps);
    }
  }, [selectedPath, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="sm">
        <Controller
          name="parameter_path"
          control={control}
          render={({ field }) => (
            <Select
              label="Sweep Parameter"
              placeholder="Select parameter to sweep"
              data={parameterOptions}
              searchable
              value={field.value}
              onChange={(v) => field.onChange(v ?? "")}
              error={errors.parameter_path?.message}
            />
          )}
        />
        <Group grow>
          <Controller
            name="start"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Start"
                value={field.value}
                onChange={(v) => field.onChange(typeof v === "number" ? v : 0)}
                error={errors.start?.message}
              />
            )}
          />
          <Controller
            name="end"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="End"
                value={field.value}
                onChange={(v) => field.onChange(typeof v === "number" ? v : 100)}
                error={errors.end?.message}
              />
            )}
          />
          <Controller
            name="steps"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Steps"
                min={2}
                max={200}
                value={field.value}
                onChange={(v) => field.onChange(typeof v === "number" ? v : 50)}
                error={errors.steps?.message}
              />
            )}
          />
        </Group>
        <Button type="submit" loading={loading} disabled={disabled}>
          Run Sweep
        </Button>
      </Stack>
    </form>
  );
}
