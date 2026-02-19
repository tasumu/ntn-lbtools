import { useQuery } from "@tanstack/react-query";
import { request } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import type {
  EarthStationAsset,
  ModcodTableAsset,
  SatelliteAsset,
} from "../api/types";

export function useCalculationAssets() {
  const satellitesQuery = useQuery<SatelliteAsset[]>({
    queryKey: queryKeys.satellites.all,
    queryFn: () => request({ method: "GET", url: "/assets/satellites" }),
  });
  const earthStationsQuery = useQuery<EarthStationAsset[]>({
    queryKey: queryKeys.earthStations.all,
    queryFn: () => request({ method: "GET", url: "/assets/earth-stations" }),
  });
  const modcodTablesQuery = useQuery<ModcodTableAsset[]>({
    queryKey: queryKeys.modcodTables.all,
    queryFn: () => request({ method: "GET", url: "/assets/modcod-tables" }),
  });

  const modcodOptions = (modcodTablesQuery.data ?? []).map((t) => ({
    value: t.id,
    label: `${t.waveform} v${t.version}`,
    waveform: t.waveform,
  }));
  const satelliteOptions = (satellitesQuery.data ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const earthStationOptions = (earthStationsQuery.data ?? []).map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const refetch = () =>
    Promise.all([
      satellitesQuery.refetch(),
      earthStationsQuery.refetch(),
      modcodTablesQuery.refetch(),
    ]);

  const errors = [
    modcodTablesQuery.error,
    satellitesQuery.error,
    earthStationsQuery.error,
  ].filter(Boolean);

  const isFetching =
    satellitesQuery.isFetching ||
    earthStationsQuery.isFetching ||
    modcodTablesQuery.isFetching;

  return {
    modcodOptions,
    satelliteOptions,
    earthStationOptions,
    satellites: satellitesQuery.data ?? [],
    earthStations: earthStationsQuery.data ?? [],
    modcodLoading: modcodTablesQuery.isLoading,
    satelliteLoading: satellitesQuery.isLoading,
    earthStationLoading: earthStationsQuery.isLoading,
    isFetching,
    errors,
    refetch,
  };
}
