import { Group, Loader, NumberInput, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { Controller } from "react-hook-form";

import { transponderTypeSchema } from "../../../api/schemas";
import type { FormSectionProps } from "./types";

type Props = FormSectionProps & {
  direction: "uplink" | "downlink";
  transponderType: string;
  filteredModcodOptions: { value: string; label: string }[];
  modcodLoading: boolean;
};

export function LinkSection({
  control,
  errors,
  direction,
  transponderType,
  filteredModcodOptions,
  modcodLoading,
}: Props) {
  const isUplink = direction === "uplink";
  const label = isUplink ? "Uplink" : "Downlink";
  const dirLabel = isUplink ? "earth \u2192 satellite" : "satellite \u2192 earth";
  const dirErrors = isUplink ? errors.runtime?.uplink : errors.runtime?.downlink;
  const modcodFieldName = isUplink ? "uplink_modcod_table_id" as const : "downlink_modcod_table_id" as const;
  const modcodError = isUplink ? errors.uplink_modcod_table_id : errors.downlink_modcod_table_id;

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>
        {label} ({dirLabel})
      </Text>
      <Group grow>
        <Controller
          name={`runtime.${direction}.frequency_hz`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label={`${label} frequency (Hz)`}
              description="Required"
              withAsterisk
              thousandSeparator=","
              {...field}
              error={dirErrors?.frequency_hz?.message}
            />
          )}
        />
        {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
          <Controller
            name={modcodFieldName}
            control={control}
            render={({ field }) => (
              <Select
                label={`${label} ModCod Table`}
                placeholder={modcodLoading ? "Loading..." : "Select"}
                data={filteredModcodOptions}
                searchable
                disabled={modcodLoading}
                rightSection={modcodLoading ? <Loader size="xs" /> : undefined}
                nothingFoundMessage={modcodLoading ? "Loading..." : "No ModCod tables found"}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? undefined)}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                error={modcodError?.message}
              />
            )}
          />
        )}
        {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
          <Controller
            name={`runtime.${direction}.bandwidth_hz`}
            control={control}
            render={({ field }) => (
              <NumberInput
                label={`${label} bandwidth (Hz)`}
                description="Required"
                withAsterisk
                thousandSeparator=","
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={dirErrors?.bandwidth_hz?.message}
              />
            )}
          />
        )}
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Controller
          name={`runtime.${direction}.ground_lat_deg`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label={`${label} ground latitude (deg)`}
              description="Required"
              withAsterisk
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? undefined)}
              error={dirErrors?.ground_lat_deg?.message}
            />
          )}
        />
        <Controller
          name={`runtime.${direction}.ground_lon_deg`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label={`${label} ground longitude (deg)`}
              description="Required"
              withAsterisk
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? undefined)}
              error={dirErrors?.ground_lon_deg?.message}
            />
          )}
        />
        <Controller
          name={`runtime.${direction}.ground_alt_m`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label={`${label} altitude (m)`}
              description="Optional (defaults to 0)"
              value={field.value ?? undefined}
              onChange={(value) => field.onChange(value ?? undefined)}
              error={dirErrors?.ground_alt_m?.message}
            />
          )}
        />
      </SimpleGrid>
      <Group grow>
        <Controller
          name={`runtime.${direction}.rain_rate_mm_per_hr`}
          control={control}
          render={({ field }) => (
            <NumberInput
              label={`${label} rain rate (mm/hr)`}
              description="Optional (defaults to 0)"
              {...field}
              error={dirErrors?.rain_rate_mm_per_hr?.message}
            />
          )}
        />
      </Group>
    </Stack>
  );
}
