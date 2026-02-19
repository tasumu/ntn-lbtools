import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { request } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import type {
  EarthStationAsset,
  ModcodTableAsset,
  PaginatedResponse,
  SatelliteAsset,
} from "../api/types";

export function useCalculationAssets() {
  const satellitesQuery = useQuery<PaginatedResponse<SatelliteAsset>>({
    queryKey: queryKeys.satellites.all,
    queryFn: () =>
      request({ method: "GET", url: "/assets/satellites?limit=100" }),
  });
  const earthStationsQuery = useQuery<PaginatedResponse<EarthStationAsset>>({
    queryKey: queryKeys.earthStations.all,
    queryFn: () =>
      request({ method: "GET", url: "/assets/earth-stations?limit=100" }),
  });
  const modcodTablesQuery = useQuery<PaginatedResponse<ModcodTableAsset>>({
    queryKey: queryKeys.modcodTables.all,
    queryFn: () =>
      request({ method: "GET", url: "/assets/modcod-tables?limit=100" }),
  });

  const satellites = satellitesQuery.data?.items ?? [];
  const earthStations = earthStationsQuery.data?.items ?? [];
  const modcodTables = modcodTablesQuery.data?.items ?? [];

  const modcodOptions = useMemo(
    () =>
      modcodTables.map((t) => ({
        value: t.id,
        label: `${t.waveform} v${t.version}`,
        waveform: t.waveform,
      })),
    [modcodTables],
  );
  const satelliteOptions = useMemo(
    () =>
      satellites.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [satellites],
  );
  const earthStationOptions = useMemo(
    () =>
      earthStations.map((e) => ({
        value: e.id,
        label: e.name,
      })),
    [earthStations],
  );

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
    satellites,
    earthStations,
    modcodLoading: modcodTablesQuery.isLoading,
    satelliteLoading: satellitesQuery.isLoading,
    earthStationLoading: earthStationsQuery.isLoading,
    isFetching,
    errors,
    refetch,
  };
}
