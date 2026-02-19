import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { notifications } from "@mantine/notifications";

import { request } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import type { EarthStationAsset, SatelliteAsset } from "../api/types";
import { formatError } from "../lib/formatters";
import { EarthStationForm } from "../features/assets/EarthStationForm";
import { SatelliteForm } from "../features/assets/SatelliteForm";
import { ModcodManager } from "../features/modcod/ModcodManager";

export function AssetsPage() {
  const client = useQueryClient();
  const satellitesQuery = useQuery<SatelliteAsset[]>({
    queryKey: queryKeys.satellites.all,
    queryFn: () => request({ method: "GET", url: "/assets/satellites" }),
  });
  const earthStationsQuery = useQuery<EarthStationAsset[]>({
    queryKey: queryKeys.earthStations.all,
    queryFn: () => request({ method: "GET", url: "/assets/earth-stations" }),
  });

  const [selectedSatellite, setSelectedSatellite] =
    useState<SatelliteAsset | null>(null);
  const [selectedEarthStation, setSelectedEarthStation] =
    useState<EarthStationAsset | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  const confirmDelete = useCallback(
    (id: string, mutate: (id: string) => void) => {
      mutate(id);
      setConfirmingDeleteId(null);
    },
    [],
  );

  const deleteSatellite = useMutation<void, unknown, string>({
    mutationFn: (id) =>
      request({ method: "DELETE", url: `/assets/satellites/${id}` }),
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: queryKeys.satellites.all });
      if (selectedSatellite?.id === id) setSelectedSatellite(null);
      notifications.show({
        title: "Satellite deleted",
        message: "Satellite removed successfully",
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
      notifications.show({
        title: "Earth station deleted",
        message: "Earth station removed successfully",
        color: "green",
      });
    },
  });
  const deletingSatelliteId = deleteSatellite.variables as string | undefined;
  const deletingEarthStationId = deleteEarthStation.variables as
    | string
    | undefined;

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        Assets
      </Title>
      <Tabs defaultValue="satellites">
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
                {satellitesQuery.data?.map((sat) => (
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
                        {confirmingDeleteId === sat.id ? (
                          <Group gap={4}>
                            <Button
                              size="xs"
                              color="red"
                              variant="filled"
                              loading={
                                deleteSatellite.isPending &&
                                deletingSatelliteId === sat.id
                              }
                              onClick={() =>
                                confirmDelete(sat.id, deleteSatellite.mutate)
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() => setConfirmingDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </Group>
                        ) : (
                          <Button
                            size="xs"
                            color="red"
                            variant="subtle"
                            onClick={() => setConfirmingDeleteId(sat.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </Group>
                    </Group>
                  </Card>
                ))}
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
                {earthStationsQuery.data?.map((es) => (
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
                        {confirmingDeleteId === es.id ? (
                          <Group gap={4}>
                            <Button
                              size="xs"
                              color="red"
                              variant="filled"
                              loading={
                                deleteEarthStation.isPending &&
                                deletingEarthStationId === es.id
                              }
                              onClick={() =>
                                confirmDelete(es.id, deleteEarthStation.mutate)
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() => setConfirmingDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </Group>
                        ) : (
                          <Button
                            size="xs"
                            color="red"
                            variant="subtle"
                            onClick={() => setConfirmingDeleteId(es.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Group>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="modcod" pt="md">
          <ModcodManager />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
