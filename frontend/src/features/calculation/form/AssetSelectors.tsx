import { Group, Loader, Select, SelectProps, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { Controller } from "react-hook-form";

import { transponderTypeSchema } from "../../../api/schemas";
import type { EarthStationAsset, SatelliteAsset } from "../../../api/types";
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
  satellites: SatelliteAsset[];
  earthStations: EarthStationAsset[];
};

function formatSatelliteSpec(sat: SatelliteAsset): string {
  const parts: string[] = [];
  if (sat.orbit_type) parts.push(sat.orbit_type);
  if (sat.longitude_deg != null) parts.push(`${sat.longitude_deg}°E`);
  if (sat.frequency_band) parts.push(sat.frequency_band);
  if (sat.eirp_dbw != null) parts.push(`EIRP ${sat.eirp_dbw} dBW`);
  return parts.join(" | ");
}

function formatEarthStationSpec(es: EarthStationAsset): string {
  const parts: string[] = [];
  if (es.antenna_diameter_m != null) parts.push(`${es.antenna_diameter_m}m`);
  if (es.eirp_dbw != null) parts.push(`EIRP ${es.eirp_dbw} dBW`);
  if (es.gt_db_per_k != null) parts.push(`G/T ${es.gt_db_per_k} dB/K`);
  if (es.polarization) parts.push(es.polarization);
  return parts.join(" | ");
}

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
  satellites,
  earthStations,
}: Props) {
  const satelliteMap = useMemo(
    () => new Map(satellites.map((s) => [s.id, s])),
    [satellites],
  );
  const earthStationMap = useMemo(
    () => new Map(earthStations.map((e) => [e.id, e])),
    [earthStations],
  );

  const renderSatelliteOption: SelectProps["renderOption"] = ({ option }) => {
    const sat = satelliteMap.get(option.value);
    const spec = sat ? formatSatelliteSpec(sat) : "";
    return (
      <Stack gap={0}>
        <Text size="sm">{option.label}</Text>
        {spec && (
          <Text size="xs" c="dimmed">
            {spec}
          </Text>
        )}
      </Stack>
    );
  };

  const renderEarthStationOption: SelectProps["renderOption"] = ({ option }) => {
    const es = earthStationMap.get(option.value);
    const spec = es ? formatEarthStationSpec(es) : "";
    return (
      <Stack gap={0}>
        <Text size="sm">{option.label}</Text>
        {spec && (
          <Text size="xs" c="dimmed">
            {spec}
          </Text>
        )}
      </Stack>
    );
  };

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
              renderOption={renderSatelliteOption}
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
              renderOption={renderEarthStationOption}
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
              renderOption={renderEarthStationOption}
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
