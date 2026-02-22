import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useWatch } from "react-hook-form";

import type { CalculationRequest } from "../../../api/schemas";
import type { EarthStationAsset, SatelliteAsset } from "../../../api/types";
import type { FormSectionProps } from "./types";

type Props = FormSectionProps & {
  satellites: SatelliteAsset[];
  earthStations: EarthStationAsset[];
};

function Spec({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value == null) return null;
  return (
    <Text size="xs">
      <Text span c="dimmed">{label}: </Text>
      {value}
    </Text>
  );
}

function SatelliteColumn({ satellite }: { satellite: SatelliteAsset }) {
  return (
    <Stack gap={2}>
      <Text size="xs" fw={600}>Satellite</Text>
      <Text size="sm" fw={500}>{satellite.name}</Text>
      <Spec label="Orbit" value={satellite.orbit_type} />
      <Spec label="Longitude" value={satellite.longitude_deg != null ? `${satellite.longitude_deg}°E` : undefined} />
      <Spec label="Altitude" value={satellite.altitude_km != null ? `${satellite.altitude_km} km` : undefined} />
      <Spec label="TLE" value={satellite.tle_line1 ? "Available" : undefined} />
      <Spec label="Band" value={satellite.frequency_band} />
      <Spec label="EIRP" value={satellite.eirp_dbw != null ? `${satellite.eirp_dbw} dBW` : undefined} />
      <Spec label="G/T" value={satellite.gt_db_per_k != null ? `${satellite.gt_db_per_k} dB/K` : undefined} />
      <Spec label="BW" value={satellite.transponder_bandwidth_mhz != null ? `${satellite.transponder_bandwidth_mhz} MHz` : undefined} />
    </Stack>
  );
}

function EarthStationColumn({ station, role }: { station: EarthStationAsset; role: "TX" | "RX" }) {
  return (
    <Stack gap={2}>
      <Text size="xs" fw={600}>Earth Station ({role})</Text>
      <Text size="sm" fw={500}>{station.name}</Text>
      <Spec label="Antenna" value={station.antenna_diameter_m != null ? `${station.antenna_diameter_m}m` : undefined} />
      <Spec label="EIRP" value={station.eirp_dbw != null ? `${station.eirp_dbw} dBW` : undefined} />
      <Spec label="G/T" value={station.gt_db_per_k != null ? `${station.gt_db_per_k} dB/K` : undefined} />
      <Spec label="TX Power" value={station.tx_power_dbw != null ? `${station.tx_power_dbw} dBW` : undefined} />
      <Spec label="Polarization" value={station.polarization} />
    </Stack>
  );
}

export function AssetSummaryCard({ control, satellites, earthStations }: Props) {
  const satelliteId = useWatch<CalculationRequest, "satellite_id">({ control, name: "satellite_id" });
  const txId = useWatch<CalculationRequest, "earth_station_tx_id">({ control, name: "earth_station_tx_id" });
  const rxId = useWatch<CalculationRequest, "earth_station_rx_id">({ control, name: "earth_station_rx_id" });

  const satelliteMap = useMemo(
    () => new Map(satellites.map((s) => [s.id, s])),
    [satellites],
  );
  const earthStationMap = useMemo(
    () => new Map(earthStations.map((e) => [e.id, e])),
    [earthStations],
  );

  const sat = satelliteId ? satelliteMap.get(satelliteId) : undefined;
  const tx = txId ? earthStationMap.get(txId) : undefined;
  const rx = rxId ? earthStationMap.get(rxId) : undefined;

  if (!sat && !tx && !rx) return null;

  return (
    <Paper withBorder p="xs" radius="sm">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {sat && <SatelliteColumn satellite={sat} />}
        {tx && <EarthStationColumn station={tx} role="TX" />}
        {rx && <EarthStationColumn station={rx} role="RX" />}
      </SimpleGrid>
    </Paper>
  );
}
