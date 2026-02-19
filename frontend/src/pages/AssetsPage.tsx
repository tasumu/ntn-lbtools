import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Pagination,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBuildingBroadcastTower,
  IconSatellite,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { notifications } from "@mantine/notifications";

import { request } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import type {
  EarthStationAsset,
  PaginatedResponse,
  SatelliteAsset,
} from "../api/types";
import { formatError } from "../lib/formatters";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { EarthStationForm } from "../features/assets/EarthStationForm";
import { SatelliteForm } from "../features/assets/SatelliteForm";
import { ModcodManager } from "../features/modcod/ModcodManager";

const PAGE_SIZE = 20;

export function AssetsPage() {
  const client = useQueryClient();
  const [satPage, setSatPage] = useState(1);
  const [esPage, setEsPage] = useState(1);

  const satOffset = (satPage - 1) * PAGE_SIZE;
  const esOffset = (esPage - 1) * PAGE_SIZE;

  const satellitesQuery = useQuery<PaginatedResponse<SatelliteAsset>>({
    queryKey: queryKeys.satellites.list({ limit: PAGE_SIZE, offset: satOffset }),
    queryFn: () =>
      request({
        method: "GET",
        url: `/assets/satellites?limit=${PAGE_SIZE}&offset=${satOffset}`,
      }),
  });
  const earthStationsQuery = useQuery<PaginatedResponse<EarthStationAsset>>({
    queryKey: queryKeys.earthStations.list({
      limit: PAGE_SIZE,
      offset: esOffset,
    }),
    queryFn: () =>
      request({
        method: "GET",
        url: `/assets/earth-stations?limit=${PAGE_SIZE}&offset=${esOffset}`,
      }),
  });

  const satellites = satellitesQuery.data?.items ?? [];
  const satTotal = satellitesQuery.data?.total ?? 0;
  const earthStations = earthStationsQuery.data?.items ?? [];
  const esTotal = earthStationsQuery.data?.total ?? 0;

  const [selectedSatellite, setSelectedSatellite] =
    useState<SatelliteAsset | null>(null);
  const [selectedEarthStation, setSelectedEarthStation] =
    useState<EarthStationAsset | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<
    "satellite" | "earth-station" | null
  >(null);

  const deleteSatellite = useMutation<void, unknown, string>({
    mutationFn: (id) =>
      request({ method: "DELETE", url: `/assets/satellites/${id}` }),
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: queryKeys.satellites.all });
      if (selectedSatellite?.id === id) setSelectedSatellite(null);
      const name = satellites.find((s) => s.id === id)?.name ?? "Satellite";
      notifications.show({
        title: "Satellite deleted",
        message: `'${name}' removed successfully`,
        color: "green",
      });
    },
  });

  const deleteEarthStation = useMutation<void, unknown, string>({
    mutationFn: (id) =>
      request({ method: "DELETE", url: `/assets/earth-stations/${id}` }),
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: queryKeys.earthStations.all });
      if (selectedEarthStation?.id === id) setSelectedEarthStation(null);
      const name =
        earthStations.find((e) => e.id === id)?.name ?? "Earth station";
      notifications.show({
        title: "Earth station deleted",
        message: `'${name}' removed successfully`,
        color: "green",
      });
    },
  });

  const openDeleteModal = useCallback(
    (id: string, type: "satellite" | "earth-station") => {
      setConfirmingDeleteId(id);
      setDeleteTarget(type);
    },
    [],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!confirmingDeleteId || !deleteTarget) return;
    if (deleteTarget === "satellite") {
      deleteSatellite.mutate(confirmingDeleteId);
    } else {
      deleteEarthStation.mutate(confirmingDeleteId);
    }
    setConfirmingDeleteId(null);
    setDeleteTarget(null);
  }, [confirmingDeleteId, deleteTarget, deleteSatellite, deleteEarthStation]);

  const deleteModalItemName = (() => {
    if (!confirmingDeleteId || !deleteTarget) return "";
    if (deleteTarget === "satellite") {
      return satellites.find((s) => s.id === confirmingDeleteId)?.name ?? "";
    }
    return earthStations.find((e) => e.id === confirmingDeleteId)?.name ?? "";
  })();

  const isDeletePending =
    deleteTarget === "satellite"
      ? deleteSatellite.isPending
      : deleteEarthStation.isPending;

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        Assets
      </Title>
      <Tabs defaultValue="satellites" aria-label="Asset management">
        <Tabs.List>
          <Tabs.Tab value="satellites">Satellites</Tabs.Tab>
          <Tabs.Tab value="earth-stations">Earth Stations</Tabs.Tab>
          <Tabs.Tab value="modcod">ModCod Tables</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="satellites" pt="md">
          <Stack gap="md">
            <Group grow align="flex-start">
              <div style={{ flex: 1 }}>
                <SatelliteForm
                  initial={selectedSatellite}
                  onSaved={() => setSelectedSatellite(null)}
                  onCancelEdit={() => setSelectedSatellite(null)}
                />
              </div>
              <Stack flex={1} gap="sm">
                {deleteSatellite.isError && (
                  <Alert color="red" title="Failed to delete satellite">
                    {formatError(deleteSatellite.error)}
                  </Alert>
                )}
                {satellites.map((sat) => (
                  <Card key={sat.id} withBorder>
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600}>{sat.name}</Text>
                        <Text size="xs" c="dimmed">
                          {sat.orbit_type}{" "}
                          {sat.frequency_band ? `| ${sat.frequency_band}` : ""}
                        </Text>
                      </div>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => setSelectedSatellite(sat)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => openDeleteModal(sat.id, "satellite")}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Group>
                  </Card>
                ))}
                {satellites.length === 0 && !satellitesQuery.isLoading && (
                  <EmptyState
                    icon={<IconSatellite size={24} />}
                    title="No satellites yet"
                    description="Add your first satellite using the form on the left."
                  />
                )}
                {satTotal > PAGE_SIZE && (
                  <Pagination
                    total={Math.ceil(satTotal / PAGE_SIZE)}
                    value={satPage}
                    onChange={setSatPage}
                  />
                )}
              </Stack>
            </Group>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="earth-stations" pt="md">
          <Stack gap="md">
            <Group grow align="flex-start">
              <div style={{ flex: 1 }}>
                <EarthStationForm
                  initial={selectedEarthStation}
                  onSaved={() => setSelectedEarthStation(null)}
                  onCancelEdit={() => setSelectedEarthStation(null)}
                />
              </div>
              <Stack flex={1} gap="sm">
                {deleteEarthStation.isError && (
                  <Alert color="red" title="Failed to delete earth station">
                    {formatError(deleteEarthStation.error)}
                  </Alert>
                )}
                {earthStations.map((es) => (
                  <Card key={es.id} withBorder>
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600}>{es.name}</Text>
                        <Text size="xs" c="dimmed">
                          {[
                            es.eirp_dbw != null
                              ? `EIRP ${es.eirp_dbw} dBW`
                              : null,
                            es.gt_db_per_k != null
                              ? `G/T ${es.gt_db_per_k} dB/K`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </Text>
                        {(es.antenna_gain_tx_db != null ||
                          es.antenna_gain_rx_db != null) && (
                          <Text size="xs" c="dimmed">
                            {[
                              es.antenna_gain_tx_db != null
                                ? `Tx Gain: ${es.antenna_gain_tx_db} dBi`
                                : null,
                              es.antenna_gain_rx_db != null
                                ? `Rx Gain: ${es.antenna_gain_rx_db} dBi`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" | ")}
                          </Text>
                        )}
                        {es.noise_temperature_k != null && (
                          <Text size="xs" c="dimmed">
                            Noise Temp: {es.noise_temperature_k} K
                          </Text>
                        )}
                        {es.antenna_diameter_m != null && (
                          <Text size="xs" c="dimmed">
                            Diameter: {es.antenna_diameter_m} m
                          </Text>
                        )}
                        {es.polarization && (
                          <Text size="xs" c="dimmed">
                            Pol: {es.polarization}
                          </Text>
                        )}
                      </div>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => setSelectedEarthStation(es)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() =>
                            openDeleteModal(es.id, "earth-station")
                          }
                        >
                          Delete
                        </Button>
                      </Group>
                    </Group>
                  </Card>
                ))}
                {earthStations.length === 0 &&
                  !earthStationsQuery.isLoading && (
                    <EmptyState
                      icon={<IconBuildingBroadcastTower size={24} />}
                      title="No earth stations yet"
                      description="Add your first earth station using the form on the left."
                    />
                  )}
                {esTotal > PAGE_SIZE && (
                  <Pagination
                    total={Math.ceil(esTotal / PAGE_SIZE)}
                    value={esPage}
                    onChange={setEsPage}
                  />
                )}
              </Stack>
            </Group>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="modcod" pt="md">
          <ModcodManager />
        </Tabs.Panel>
      </Tabs>
      <DeleteConfirmModal
        opened={confirmingDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmingDeleteId(null);
          setDeleteTarget(null);
        }}
        message={
          deleteModalItemName
            ? `Are you sure you want to delete '${deleteModalItemName}'? This action cannot be undone.`
            : "Are you sure you want to delete this item? This action cannot be undone."
        }
        loading={isDeletePending}
      />
    </Container>
  );
}
