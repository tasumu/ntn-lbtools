import { useQuery } from "@tanstack/react-query";
import { request } from "../api/client";
import type { EarthStationAsset, ModcodTableAsset, SatelliteAsset } from "../api/types";

export function useCalculationAssets() {
  const satellitesQuery = useQuery<SatelliteAsset[]>({
    queryKey: ["satellites"],
    queryFn: () => request({ method: "GET", url: "/assets/satellites" }),
  });
  const earthStationsQuery = useQuery<EarthStationAsset[]>({
    queryKey: ["earth-stations"],
    queryFn: () => request({ method: "GET", url: "/assets/earth-stations" }),
  });
  const modcodTablesQuery = useQuery<ModcodTableAsset[]>({
    queryKey: ["modcod-tables"],
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
    modcodLoading: modcodTablesQuery.isLoading,
    satelliteLoading: satellitesQuery.isLoading,
    earthStationLoading: earthStationsQuery.isLoading,
    isFetching,
    errors,
    refetch,
  };
}
