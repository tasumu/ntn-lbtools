import { Group, Loader, NumberInput, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { Controller } from "react-hook-form";

import { transponderTypeSchema } from "../../../api/schemas";
import { FrequencyInput, FREQUENCY_UNITS, BANDWIDTH_UNITS } from "../../../components/FrequencyInput";
import { LabelWithTooltip } from "../../../components/FieldTooltip";
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
            <FrequencyInput
              label={<LabelWithTooltip label={`${label} frequency`} fieldKey={`${direction}_frequency`} />}
              description="Required"
              withAsterisk
              value={field.value}
              onChange={(val) => field.onChange(val ?? undefined)}
              error={dirErrors?.frequency_hz?.message}
              units={FREQUENCY_UNITS}
              defaultUnit="GHz"
            />
          )}
        />
        {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
          <Controller
            name={modcodFieldName}
            control={control}
            render={({ field }) => (
              <Select
                label={<LabelWithTooltip label={`${label} ModCod Table`} fieldKey={`${direction}_modcod`} />}
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
              <FrequencyInput
                label={<LabelWithTooltip label={`${label} bandwidth`} fieldKey={`${direction}_bandwidth`} />}
                description="Required"
                withAsterisk
                value={field.value ?? undefined}
                onChange={(val) => field.onChange(val ?? undefined)}
                error={dirErrors?.bandwidth_hz?.message}
                units={BANDWIDTH_UNITS}
                defaultUnit="MHz"
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
              label={<LabelWithTooltip label={`${label} ground latitude (deg)`} fieldKey={`${direction}_ground_lat`} />}
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
              label={<LabelWithTooltip label={`${label} ground longitude (deg)`} fieldKey={`${direction}_ground_lon`} />}
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
              label={<LabelWithTooltip label={`${label} altitude (m)`} fieldKey={`${direction}_ground_alt`} />}
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
              label={<LabelWithTooltip label={`${label} rain rate (mm/hr)`} fieldKey={`${direction}_rain_rate`} />}
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
