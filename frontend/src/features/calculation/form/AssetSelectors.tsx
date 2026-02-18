import { Group, Loader, Select } from "@mantine/core";
import { Controller } from "react-hook-form";

import { transponderTypeSchema } from "../../../api/schemas";
import type { FormSectionProps } from "./types";

type Props = FormSectionProps & {
  transponderType: string;
  waveformOptions: { value: string; label: string }[];
  filteredModcodOptions: { value: string; label: string }[];
  satelliteOptions: { value: string; label: string }[];
  earthStationOptions: { value: string; label: string }[];
  modcodLoading: boolean;
  satelliteLoading: boolean;
  earthStationLoading: boolean;
};

export function AssetSelectors({
  control,
  errors,
  transponderType,
  waveformOptions,
  filteredModcodOptions,
  satelliteOptions,
  earthStationOptions,
  modcodLoading,
  satelliteLoading,
  earthStationLoading,
}: Props) {
  return (
    <>
      <Group grow>
        <Controller
          name="waveform_strategy"
          control={control}
          render={({ field }) => (
            <Select
              label="Waveform"
              data={waveformOptions}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? "")}
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
              error={errors.waveform_strategy?.message}
            />
          )}
        />
        <Controller
          name="transponder_type"
          control={control}
          render={({ field }) => (
            <Select
              label="Transponder"
              data={[
                { value: "TRANSPARENT", label: "Transparent" },
                { value: "REGENERATIVE", label: "Regenerative" },
              ]}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? undefined)}
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
              error={errors.transponder_type?.message}
            />
          )}
        />
      </Group>
      <Group grow>
        {transponderType === transponderTypeSchema.enum.TRANSPARENT && (
          <Controller
            name="modcod_table_id"
            control={control}
            render={({ field }) => (
              <Select
                label="ModCod Table"
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
                error={errors.modcod_table_id?.message}
              />
            )}
          />
        )}
        <Controller
          name="satellite_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Satellite"
              placeholder={satelliteLoading ? "Loading..." : "Select"}
              data={satelliteOptions}
              searchable
              disabled={satelliteLoading}
              rightSection={satelliteLoading ? <Loader size="xs" /> : undefined}
              nothingFoundMessage={satelliteLoading ? "Loading..." : "No satellites found"}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? "")}
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
              error={errors.satellite_id?.message}
            />
          )}
        />
      </Group>
      <Group grow>
        <Controller
          name="earth_station_tx_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Earth Station (TX)"
              placeholder={earthStationLoading ? "Loading..." : "Select"}
              data={earthStationOptions}
              searchable
              disabled={earthStationLoading}
              rightSection={earthStationLoading ? <Loader size="xs" /> : undefined}
              nothingFoundMessage={earthStationLoading ? "Loading..." : "No earth stations found"}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? undefined)}
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
              error={errors.earth_station_tx_id?.message}
            />
          )}
        />
        <Controller
          name="earth_station_rx_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Earth Station (RX)"
              placeholder={earthStationLoading ? "Loading..." : "Select"}
              data={earthStationOptions}
              searchable
              disabled={earthStationLoading}
              rightSection={earthStationLoading ? <Loader size="xs" /> : undefined}
              nothingFoundMessage={earthStationLoading ? "Loading..." : "No earth stations found"}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? undefined)}
              name={field.name}
              onBlur={field.onBlur}
              ref={field.ref}
              error={errors.earth_station_rx_id?.message}
            />
          )}
        />
      </Group>
    </>
  );
}
