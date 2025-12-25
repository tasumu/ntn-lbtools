import { Alert, Card, Flex, Group, ScrollArea, Stack, Text, Button, Tabs, Progress } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { CalculationRequest, CalculationResponse } from "../../api/schemas";
import { request } from "../../api/client";
import { CalculationForm } from "./CalculationForm";
import { ScenarioSaveModal } from "../scenarios/ScenarioSaveModal";
import { CalculationResultChart } from "./CalculationResultChart";
import { LinkBudgetWaterfall } from "./LinkBudgetWaterfall";

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : null;
};
const formatDb = (value?: number | null) => {
  const n = toNumber(value);
  return n === null ? "-" : n.toFixed(2);
};
const formatHz = (value?: number | null) => {
  const n = toNumber(value);
  return n === null
    ? "-"
    : `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} Hz`;
};
const formatDeg = (value?: number | null) => {
  const n = toNumber(value);
  return n === null ? "-" : n.toFixed(2);
};
const formatModcod = (
  modcod: CalculationResponse["modcod_selected"] | undefined,
  direction?: "uplink" | "downlink"
) => {
  if (!modcod) return "-";
  const target =
    "uplink" in modcod || "downlink" in modcod
      ? (direction ? (modcod as any)[direction] : (modcod as any).downlink || (modcod as any).uplink)
      : modcod;
  if (!target) return "-";
  const parts = [target.modulation, target.code_rate].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : target.id ?? "-";
};

const formatApplied = (flag?: boolean) => (flag ? "Applied" : "Not applied");

export function CalculationView() {
  const client = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const [lastRequest, setLastRequest] = useState<CalculationRequest | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<CalculationRequest | null>(null);
  const satellitesQuery = useQuery<any[]>({
    queryKey: ["satellites"],
    queryFn: () => request({ method: "GET", url: "/assets/satellites" }),
  });
  const earthStationsQuery = useQuery<any[]>({
    queryKey: ["earth-stations"],
    queryFn: () => request({ method: "GET", url: "/assets/earth-stations" }),
  });
  const modcodTablesQuery = useQuery<any[]>({
    queryKey: ["modcod-tables"],
    queryFn: () => request({ method: "GET", url: "/assets/modcod-tables" }),
  });
  const scenariosQuery = useQuery<any[]>({
    queryKey: ["scenarios"],
    queryFn: () => request({ method: "GET", url: "/scenarios" }),
  });
  const scenarioDetailQuery = useQuery<any>({
    queryKey: ["scenario-detail", selectedScenarioId],
    queryFn: () => request({ method: "GET", url: `/scenarios/${selectedScenarioId}` }),
    enabled: Boolean(selectedScenarioId),
  });
  const deleteScenario = useMutation<void, any, string>({
    mutationFn: (scenarioId) => request({ method: "DELETE", url: `/scenarios/${scenarioId}` }),
    onSuccess: (_, scenarioId) => {
      client.invalidateQueries({ queryKey: ["scenarios"] });
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(null);
        setPrefill(null);
      }
    },
  });
  const deletingScenarioId = deleteScenario.variables as string | undefined;

  const modcodOptions = (modcodTablesQuery.data ?? []).map((t: any) => ({
    value: t.id,
    label: `${t.waveform} v${t.version}`,
    waveform: t.waveform,
  }));
  const satelliteOptions = (satellitesQuery.data ?? []).map((s: any) => ({ value: s.id, label: s.name }));
  const earthStationOptions = (earthStationsQuery.data ?? []).map((e: any) => ({ value: e.id, label: e.name }));
  const refetchOptions = () =>
    Promise.all([satellitesQuery.refetch(), earthStationsQuery.refetch(), modcodTablesQuery.refetch()]);

  const optionsErrors = [modcodTablesQuery.error, satellitesQuery.error, earthStationsQuery.error].filter(Boolean);
  const scenarioErrors = [scenariosQuery.error, scenarioDetailQuery.error, deleteScenario.error].filter(Boolean);
  const formatError = (error: unknown) => {
    if (!error) return "";
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    const detail = (error as any).detail;
    if (detail) {
      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (item && typeof item === "object" && "msg" in item) {
              const loc = Array.isArray((item as any).loc) ? (item as any).loc.join(" → ") : "";
              return `${loc}: ${(item as any).msg}`;
            }
            try {
              return JSON.stringify(item);
            } catch {
              return String(item);
            }
          })
          .join("; ");
      }
      if (typeof detail === "object") {
        try {
          return JSON.stringify(detail);
        } catch {
          return "Unknown error";
        }
      }
      return String(detail);
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  };
  const optionsErrorMessage = optionsErrors.map((err) => formatError(err)).join("; ");
  const scenarioErrorMessage = scenarioErrors.map((err) => formatError(err)).join("; ");

  const mutation = useMutation<CalculationResponse, any, CalculationRequest>({
    mutationFn: (payload) => {
      const elevUl = payload.runtime?.uplink?.elevation_deg ?? null;
      const elevDl = payload.runtime?.downlink?.elevation_deg ?? null;
      if ((elevUl != null && elevUl <= 0) || (elevDl != null && elevDl <= 0)) {
        return Promise.reject({ detail: "Satellite is below the horizon (elevation ≤ 0)." });
      }
      return request<CalculationResponse>({
        method: "POST",
        url: "/link-budgets/calculate",
        data: { ...payload, include_snapshot: true },
      });
    },
  });
  const elevationError =
    mutation.data &&
    ((mutation.data.runtime_echo?.uplink?.elevation_deg ?? 0) < 0 ||
      (mutation.data.runtime_echo?.downlink?.elevation_deg ?? 0) < 0);
  const loadScenario = (scenario: any): CalculationRequest | null => {
    if (!scenario) return null;
    const runtime = scenario.payload_snapshot?.runtime;
    const meta = scenario.payload_snapshot?.metadata || {};
    const entity = scenario.payload_snapshot?.entity || {};
    const staticSnapshot = scenario.payload_snapshot?.static || {};
    const fallbackRuntime = {
      uplink: {
        frequency_hz: 14.25e9,
        bandwidth_hz: 36e6,
        rain_rate_mm_per_hr: 10,
        ground_lat_deg: runtime?.uplink?.ground_lat_deg ?? 0,
        ground_lon_deg: runtime?.uplink?.ground_lon_deg ?? 0,
        ground_alt_m: runtime?.uplink?.ground_alt_m ?? 0,
      },
      downlink: {
        frequency_hz: 12e9,
        bandwidth_hz: 36e6,
        rain_rate_mm_per_hr: 10,
        ground_lat_deg: runtime?.downlink?.ground_lat_deg ?? 0,
        ground_lon_deg: runtime?.downlink?.ground_lon_deg ?? 0,
        ground_alt_m: runtime?.downlink?.ground_alt_m ?? 0,
      },
    };
    const normalizeScenarioInterference = (block: any) =>
      block
        ? {
            adjacent_sat_ci_db: block.adjacent_sat_ci_db ?? undefined,
            cross_polar_ci_db: block.cross_polar_ci_db ?? undefined,
            other_carrier_ci_db: block.other_carrier_ci_db ?? undefined,
            applied: block.applied ?? false,
            notes: block.notes,
          }
        : {
            adjacent_sat_ci_db: undefined,
            cross_polar_ci_db: undefined,
            other_carrier_ci_db: undefined,
            applied: false,
          };
    const pickDirection = (dir: any, fallback: any) => ({
      frequency_hz: dir?.frequency_hz ?? fallback.frequency_hz,
      bandwidth_hz: dir?.bandwidth_hz ?? fallback.bandwidth_hz,
      // Always let backend recompute elevation from geometry to avoid stale/negative values
      elevation_deg: undefined,
      rain_rate_mm_per_hr: dir?.rain_rate_mm_per_hr ?? fallback.rain_rate_mm_per_hr,
      temperature_k: dir?.temperature_k ?? undefined,
      pressure_hpa: dir?.pressure_hpa ?? undefined,
      water_vapor_density: dir?.water_vapor_density ?? undefined,
      ground_lat_deg: dir?.ground_lat_deg ?? fallback.ground_lat_deg ?? 0,
      ground_lon_deg: dir?.ground_lon_deg ?? fallback.ground_lon_deg ?? 0,
      ground_alt_m: dir?.ground_alt_m ?? fallback.ground_alt_m ?? 0,
      interference: normalizeScenarioInterference(dir?.interference),
    });
    const sharedBandwidth =
      runtime?.bandwidth_hz ??
      runtime?.uplink?.bandwidth_hz ??
      runtime?.downlink?.bandwidth_hz ??
      fallbackRuntime.uplink.bandwidth_hz;
    const satelliteId =
      scenario.satellite_id ||
      meta.satellite_id ||
      entity?.satellite?.id ||
      runtime?.satellite_id ||
      undefined;
    const modcodId =
      scenario.modcod_table_id ||
      staticSnapshot.modcod_table_id ||
      meta.modcod_table_id ||
      runtime?.modcod_table_id ||
      undefined;
    const uplinkModcodId =
      staticSnapshot.uplink_modcod_table_id ||
      meta.uplink_modcod_table_id ||
      scenario.uplink_modcod_table_id ||
      modcodId ||
      undefined;
    const downlinkModcodId =
      staticSnapshot.downlink_modcod_table_id ||
      meta.downlink_modcod_table_id ||
      scenario.downlink_modcod_table_id ||
      modcodId ||
      undefined;

    return {
      waveform_strategy: scenario.waveform_strategy || "DVB_S2X",
      transponder_type: scenario.transponder_type || "TRANSPARENT",
      modcod_table_id: modcodId,
      uplink_modcod_table_id: uplinkModcodId,
      downlink_modcod_table_id: downlinkModcodId,
      satellite_id: satelliteId,
      earth_station_tx_id:
        meta.earth_station_tx_id ||
        entity.earth_station_tx_id ||
        entity.earth_station_tx?.id ||
        scenario.earth_station_tx_id ||
        undefined,
      earth_station_rx_id:
        meta.earth_station_rx_id ||
        entity.earth_station_rx_id ||
        entity.earth_station_rx?.id ||
        scenario.earth_station_rx_id ||
        undefined,
      runtime: {
        bandwidth_hz: sharedBandwidth,
        uplink: pickDirection(runtime?.uplink, fallbackRuntime.uplink),
        downlink: pickDirection(runtime?.downlink, fallbackRuntime.downlink),
        sat_longitude_deg: runtime?.sat_longitude_deg ?? entity?.satellite?.longitude_deg ?? meta?.sat_longitude_deg,
        intermodulation: runtime?.intermodulation ?? {
          input_backoff_db: undefined,
          output_backoff_db: undefined,
          saturation_power_dbw: undefined,
          composite_carriers: undefined,
          reference_bandwidth_hz: undefined,
          applied: false,
        },
      },
      overrides: undefined,
    };
  };

  useEffect(() => {
    if (scenarioDetailQuery.data) {
      setPrefill(loadScenario(scenarioDetailQuery.data));
    }
  }, [scenarioDetailQuery.data]);

  const modcodSelected = mutation.data?.modcod_selected;
  const transponderType =
    mutation.data?.strategy?.transponder_type || mutation.data?.payload_snapshot?.strategy?.transponder_type || lastRequest?.transponder_type;
  const modcodSummary =
    modcodSelected && ("uplink" in (modcodSelected as any) || "downlink" in (modcodSelected as any))
      ? `UL ${formatModcod(modcodSelected, "uplink")} | DL ${formatModcod(modcodSelected, "downlink")}`
      : formatModcod(modcodSelected);
  const isDirectionalModcod = Boolean(
    transponderType === "REGENERATIVE" &&
      modcodSelected &&
      ("uplink" in (modcodSelected as any) || "downlink" in (modcodSelected as any))
  );
  const channelBandwidth =
    mutation.data?.runtime_echo?.bandwidth_hz ??
    mutation.data?.results.downlink.bandwidth_hz ??
    mutation.data?.results.uplink.bandwidth_hz;
  const allWarnings = [
    ...(mutation.data?.results?.uplink?.warnings ?? []),
    ...(mutation.data?.results?.downlink?.warnings ?? []),
  ];

  return (
    <Stack gap="md">
      <Card shadow="sm" withBorder>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>Inputs</Text>
            <Button variant="light" size="xs" onClick={refetchOptions} loading={satellitesQuery.isFetching || earthStationsQuery.isFetching || modcodTablesQuery.isFetching}>
              Reload
            </Button>
          </Group>
          {optionsErrors.length > 0 && (
            <Alert color="red" title="Failed to load selectors">
              {optionsErrorMessage}
            </Alert>
          )}
          <Flex gap="lg" direction={{ base: "column", md: "row" }}>
            <div style={{ flex: 2, minWidth: 0 }}>
              <CalculationForm
                initialValues={prefill ?? undefined}
                onSubmit={(data) => {
                  setLastRequest(data);
                  mutation.mutate(data);
                }}
                loading={mutation.isPending}
                modcodOptions={modcodOptions}
                satelliteOptions={satelliteOptions}
                earthStationOptions={earthStationOptions}
                modcodLoading={modcodTablesQuery.isLoading}
                satelliteLoading={satellitesQuery.isLoading}
                earthStationLoading={earthStationsQuery.isLoading}
              />
            </div>
            <Card shadow="xs" withBorder style={{ flex: 1, minWidth: 260 }}>
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text fw={600}>Saved Scenarios</Text>
                  {scenariosQuery.isLoading && <Text size="xs">Loading...</Text>}
                </Group>
                {scenarioErrors.length > 0 && (
                  <Alert color="red" title="Scenario load error">
                    {scenarioErrorMessage}
                  </Alert>
                )}
                <ScrollArea h={670} type="auto" offsetScrollbars>
                  <Stack gap="sm" pr="xs">
                    {(scenariosQuery.data ?? []).map((s) => (
                      <Card
                        key={s.id}
                        withBorder
                        padding="sm"
                        style={{
                          borderColor: selectedScenarioId === s.id ? "#1c7ed6" : undefined,
                        }}
                      >
                        <Group justify="space-between" align="flex-start" gap="sm">
                          <div>
                            <Text fw={600} size="sm">
                              {s.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {s.description || "No description"}
                            </Text>
                          </div>
                          <Group gap="xs">
                            <Button
                              size="xs"
                              variant="light"
                              loading={selectedScenarioId === s.id && scenarioDetailQuery.isFetching}
                              onClick={() => {
                                setSelectedScenarioId(s.id);
                                setPrefill(loadScenario(s));
                              }}
                            >
                              Load
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="subtle"
                              loading={deleteScenario.isPending && deletingScenarioId === s.id}
                              onClick={() => {
                                if (!window.confirm("Delete this scenario?")) return;
                                deleteScenario.mutate(s.id);
                              }}
                            >
                              Delete
                            </Button>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                    {(scenariosQuery.data?.length ?? 0) === 0 && !scenariosQuery.isLoading && (
                      <Text size="sm" c="dimmed">
                        No scenarios saved yet
                      </Text>
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Card>
          </Flex>
        </Stack>
      </Card>

      {mutation.error && (
        <Alert color="red">Calculation failed: {formatError(mutation.error)}</Alert>
      )}

      {mutation.data && (
        <Stack gap="md">
          {elevationError && (
            <Alert color="red" title="Elevation below horizon">
              Results may be invalid because the satellite is below the horizon (negative elevation).
            </Alert>
          )}
          {allWarnings.length > 0 && (
            <Alert color="yellow" title="Interference/Intermod warnings">
              <Stack gap={4}>
                {allWarnings.map((w, idx) => (
                  <Text key={idx} size="sm">
                    {w}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}
          <Flex gap="md" direction={{ base: "column", md: "row" }}>
            <Card shadow="sm" withBorder style={{ flex: 1 }}>
              <Group justify="space-between">
                <Text fw={600}>Result (Uplink)</Text>
              </Group>
              <Stack gap={4} mt="sm">
                <Text size="sm">
                  Elevation: {formatDeg(mutation.data.runtime_echo?.uplink?.elevation_deg)} deg
                </Text>
                <Text size="sm">Tx EIRP: {formatDb(mutation.data.results.uplink.eirp_dbw)} dBW</Text>
                <Text size="sm">Rx G/T: {formatDb(mutation.data.results.uplink.gt_db_per_k)} dB/K</Text>
                <Text size="sm">Pointing Loss: {formatDb(mutation.data.results.uplink.antenna_pointing_loss_db)} dB</Text>
                <Text size="sm">FSPL: {formatDb(mutation.data.results.uplink.fspl_db)} dB</Text>
                <Text size="sm">Rain loss: {formatDb(mutation.data.results.uplink.rain_loss_db)} dB</Text>
                <Text size="sm">Gas loss: {formatDb(mutation.data.results.uplink.gas_loss_db)} dB</Text>
                <Text size="sm">
                  C/N0: {formatDb(mutation.data.results.uplink.cn0_dbhz)} dB-Hz | C/N:{" "}
                  {formatDb(mutation.data.results.uplink.cn_db)} dB
                </Text>
                <Text size="sm">
                  C/(N+I): {formatDb(mutation.data.results.uplink.cni_db)} dB | C/IM:{" "}
                  {formatDb(mutation.data.results.uplink.c_im_db)} dB ({formatApplied(mutation.data.results.uplink.interference_applied)} /{" "}
                  {formatApplied(mutation.data.results.uplink.intermod_applied)})
                </Text>
                {transponderType === "REGENERATIVE" && (
                  <Text size="sm">Link margin: {formatDb(mutation.data.results.uplink.link_margin_db)} dB</Text>
                )}
                {isDirectionalModcod && <Text size="sm">ModCod: {formatModcod(modcodSelected, "uplink")}</Text>}
              </Stack>
            </Card>

            <Card shadow="sm" withBorder style={{ flex: 1 }}>
              <Group justify="space-between">
                <Text fw={600}>Result (Downlink)</Text>
              </Group>
              <Stack gap={4} mt="sm">
                <Text size="sm">
                  Elevation: {formatDeg(mutation.data.runtime_echo?.downlink?.elevation_deg)} deg
                </Text>
                <Text size="sm">Tx EIRP: {formatDb(mutation.data.results.downlink.eirp_dbw)} dBW</Text>
                <Text size="sm">Rx G/T: {formatDb(mutation.data.results.downlink.gt_db_per_k)} dB/K</Text>
                <Text size="sm">Pointing Loss: {formatDb(mutation.data.results.downlink.antenna_pointing_loss_db)} dB</Text>
                <Text size="sm">FSPL: {formatDb(mutation.data.results.downlink.fspl_db)} dB</Text>
                <Text size="sm">Rain loss: {formatDb(mutation.data.results.downlink.rain_loss_db)} dB</Text>
                <Text size="sm">Gas loss: {formatDb(mutation.data.results.downlink.gas_loss_db)} dB</Text>
                <Text size="sm">
                  C/N0: {formatDb(mutation.data.results.downlink.cn0_dbhz)} dB-Hz | C/N:{" "}
                  {formatDb(mutation.data.results.downlink.cn_db)} dB
                </Text>
                <Text size="sm">
                  C/(N+I): {formatDb(mutation.data.results.downlink.cni_db)} dB | C/IM:{" "}
                  {formatDb(mutation.data.results.downlink.c_im_db)} dB ({formatApplied(mutation.data.results.downlink.interference_applied)} /{" "}
                  {formatApplied(mutation.data.results.downlink.intermod_applied)})
                </Text>
                {transponderType === "REGENERATIVE" && (
                  <Text size="sm">Link margin: {formatDb(mutation.data.results.downlink.link_margin_db)} dB</Text>
                )}
                {isDirectionalModcod && <Text size="sm">ModCod: {formatModcod(modcodSelected, "downlink")}</Text>}
              </Stack>
            </Card>

            <Card shadow="sm" withBorder style={{ flex: 0.8 }}>
              <Text fw={600}>Total</Text>
              <Stack gap={6} mt="sm">
                <Text size="sm">
                  Clean margin: {formatDb(
                    mutation.data.results?.combined?.clean_link_margin_db ??
                      (transponderType === "REGENERATIVE" &&
                      mutation.data.results.uplink.clean_link_margin_db != null &&
                      mutation.data.results.downlink.clean_link_margin_db != null
                        ? Math.min(
                            mutation.data.results.uplink.clean_link_margin_db,
                            mutation.data.results.downlink.clean_link_margin_db,
                          )
                        : null),
                  )}{" "}
                  dB
                </Text>
                <Text size="sm">
                  End-to-end margin:{" "}
                  {formatDb(
                    mutation.data.combined_link_margin_db ??
                      mutation.data.results?.combined?.link_margin_db ??
                      Math.min(
                        mutation.data.results.uplink.link_margin_db,
                        mutation.data.results.downlink.link_margin_db,
                      ),
                  )}{" "}
                  dB
                </Text>
                <Text size="sm">
                  C/(N+I): {formatDb(mutation.data.results?.combined?.cni_db)} dB | C/IM:{" "}
                  {formatDb(mutation.data.results?.combined?.c_im_db)}
                </Text>
                {transponderType === "REGENERATIVE" && (
                  <>
                    <Text size="sm">
                      Uplink margin: {formatDb(mutation.data.results.uplink.link_margin_db)} dB
                    </Text>
                    <Text size="sm">
                      Downlink margin: {formatDb(mutation.data.results.downlink.link_margin_db)} dB
                    </Text>
                  </>
                )}
                {!isDirectionalModcod && <Text size="sm">Selected ModCod: {modcodSummary}</Text>}
                <Text size="sm">Channel BW: {formatHz(channelBandwidth)}</Text>
                <Text size="sm" fw={600} mt="xs">
                  C/N Balance
                </Text>
                {(() => {
                  const ul = mutation.data.results.uplink;
                  const dl = mutation.data.results.downlink;
                  const cm = mutation.data.results.combined;

                  const ulDegraded = ul.cn_db;
                  const ulClean = ul.clean_cn_db ?? ulDegraded;
                  const ulDegradation = Math.max(0, ulClean - ulDegraded);

                  const dlDegraded = dl.cn_db;
                  const dlClean = dl.clean_cn_db ?? dlDegraded;
                  const dlDegradation = Math.max(0, dlClean - dlDegraded);

                  let totalDegraded = 0;
                  let totalClean = 0;
                  let totalDegradation = 0;

                  if (transponderType === "REGENERATIVE") {
                    totalDegraded = Math.min(ulDegraded, dlDegraded);
                    totalClean = Math.min(ulClean, dlClean);
                    totalDegradation = Math.max(0, totalClean - totalDegraded);
                  } else {
                    totalDegraded = cm?.cn_db ?? 0;
                    totalClean = cm?.clean_cn_db ?? totalDegraded;
                    totalDegradation = Math.max(0, totalClean - totalDegraded);
                  }

                  const maxVal = Math.max(20, Math.max(ulClean, dlClean, totalClean) + 5);

                  const renderBar = (
                    label: string,
                    degraded: number,
                    degradation: number,
                    color: string,
                  ) => {
                    const clean = degraded + degradation;
                    const degPercent = Math.min(100, Math.max(0, (degraded / maxVal) * 100));
                    const cleanPercent = Math.min(100, Math.max(0, (degradation / maxVal) * 100));

                    return (
                      <Group gap="xs" align="center" key={label}>
                        <Text size="xs" w={60}>
                          {label}
                        </Text>
                        <Progress.Root size="sm" style={{ flex: 1 }}>
                          <Progress.Section value={degPercent} color={color} />
                          <Progress.Section
                            value={cleanPercent}
                            color={color}
                            style={{ opacity: 0.3 }}
                          />
                        </Progress.Root>
                        <Text size="xs" w={90} ta="right">
                          {formatDb(degraded)} / {formatDb(clean)} dB
                        </Text>
                      </Group>
                    );
                  };

                  return (
                    <Stack gap={4}>
                      {renderBar("Uplink", ulDegraded, ulDegradation, "teal")}
                      {renderBar("Downlink", dlDegraded, dlDegradation, "blue")}
                      {renderBar("Total", totalDegraded, totalDegradation, "grape")}
                    </Stack>
                  );
                })()}
                <Button mt="xs" onClick={() => setSaveOpen(true)}>
                  Save as scenario
                </Button>
              </Stack>
            </Card>
          </Flex>

          <Card shadow="sm" withBorder>
            <Tabs defaultValue="waterfall">
              <Tabs.List>
                <Tabs.Tab value="waterfall">Link Budget Waterfall</Tabs.Tab>
                <Tabs.Tab value="metrics">Detailed Metrics</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="waterfall" pt="md">
                <LinkBudgetWaterfall
                  uplink={mutation.data.results.uplink}
                  downlink={mutation.data.results.downlink}
                />
              </Tabs.Panel>

              <Tabs.Panel value="metrics" pt="md">
                <CalculationResultChart
                  uplink={mutation.data.results.uplink}
                  downlink={mutation.data.results.downlink}
                />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Stack>
      )}
      {mutation.data && (
        <ScenarioSaveModal
          opened={saveOpen}
          onClose={() => setSaveOpen(false)}
          payload_snapshot={mutation.data.payload_snapshot as Record<string, unknown>}
          metadata={{
            waveform_strategy:
              mutation.data.payload_snapshot?.strategy?.waveform_strategy || lastRequest?.waveform_strategy || "DVB_S2X",
            transponder_type:
              mutation.data.payload_snapshot?.strategy?.transponder_type || lastRequest?.transponder_type || "TRANSPARENT",
            modcod_table_id:
              mutation.data.payload_snapshot?.metadata?.modcod_table_id ||
              mutation.data.payload_snapshot?.metadata?.downlink_modcod_table_id ||
              lastRequest?.modcod_table_id ||
              lastRequest?.downlink_modcod_table_id ||
              lastRequest?.uplink_modcod_table_id ||
              "",
            satellite_id: mutation.data.payload_snapshot?.metadata?.satellite_id || lastRequest?.satellite_id,
            earth_station_tx_id:
              mutation.data.payload_snapshot?.metadata?.earth_station_tx_id || lastRequest?.earth_station_tx_id,
            earth_station_rx_id:
              mutation.data.payload_snapshot?.metadata?.earth_station_rx_id || lastRequest?.earth_station_rx_id,
          }}
        />
      )}
      </Stack>
  );
}
