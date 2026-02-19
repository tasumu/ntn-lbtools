import {
  Alert,
  Card,
  Flex,
  Group,
  Stack,
  Text,
  Button,
  Tabs,
} from "@mantine/core";
import { IconCalculator } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { notifications } from "@mantine/notifications";

import { CalculationRequest, CalculationResponse } from "../../api/schemas";
import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import type { PaginatedResponse, ScenarioSummary } from "../../api/types";
import { formatModcod, formatError } from "../../lib/formatters";
import { loadScenario } from "../../lib/scenarioMapper";
import { useCalculationAssets } from "../../hooks/useCalculationAssets";
import { EmptyState } from "../../components/EmptyState";
import { CalculationForm } from "./CalculationForm";
import { ScenarioList } from "./ScenarioList";
import { DirectionResultCard } from "./results/DirectionResultCard";
import { CombinedResultCard } from "./results/CombinedResultCard";
import { ScenarioSaveModal } from "../scenarios/ScenarioSaveModal";
import { CalculationResultChart } from "./CalculationResultChart";
import { LinkBudgetWaterfall } from "./LinkBudgetWaterfall";

type CalculationViewProps = {
  initialScenarioId?: string;
};

export function CalculationView({ initialScenarioId }: CalculationViewProps) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [saveOpen, setSaveOpen] = useState(false);
  const [lastRequest, setLastRequest] = useState<CalculationRequest | null>(
    null,
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    initialScenarioId ?? null,
  );
  const [prefill, setPrefill] = useState<CalculationRequest | null>(null);

  const assets = useCalculationAssets();

  const scenariosQuery = useQuery<PaginatedResponse<ScenarioSummary>>({
    queryKey: queryKeys.scenarios.all,
    queryFn: () => request({ method: "GET", url: "/scenarios?limit=100" }),
  });
  const scenarioDetailQuery = useQuery<ScenarioSummary>({
    queryKey: queryKeys.scenarios.detail(selectedScenarioId),
    queryFn: () =>
      request({ method: "GET", url: `/scenarios/${selectedScenarioId}` }),
    enabled: Boolean(selectedScenarioId),
  });
  const deleteScenario = useMutation<void, unknown, string>({
    mutationFn: (scenarioId) =>
      request({ method: "DELETE", url: `/scenarios/${scenarioId}` }),
    onSuccess: (_, scenarioId) => {
      client.invalidateQueries({ queryKey: queryKeys.scenarios.all });
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(null);
        setPrefill(null);
        navigate("/", { replace: true });
      }
      notifications.show({
        title: "Scenario deleted",
        message: "Scenario removed successfully",
        color: "green",
      });
    },
  });

  const scenarioErrors = [
    scenariosQuery.error,
    scenarioDetailQuery.error,
    deleteScenario.error,
  ].filter(Boolean);
  const scenarioErrorMessage = scenarioErrors
    .map((err) => formatError(err))
    .join("; ");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const mutation = useMutation<
    CalculationResponse,
    unknown,
    CalculationRequest
  >({
    mutationFn: (payload) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const elevUl = payload.runtime?.uplink?.elevation_deg ?? null;
      const elevDl = payload.runtime?.downlink?.elevation_deg ?? null;
      if ((elevUl != null && elevUl <= 0) || (elevDl != null && elevDl <= 0)) {
        return Promise.reject({
          detail: "Satellite is below the horizon (elevation ≤ 0).",
        });
      }
      return request<CalculationResponse>({
        method: "POST",
        url: "/link-budgets/calculate",
        data: { ...payload, include_snapshot: true },
        signal: abortRef.current.signal,
      });
    },
    onSuccess: () => {
      notifications.show({
        title: "Calculation complete",
        message: "Link budget calculated successfully",
        color: "green",
      });
    },
  });

  const elevationError =
    mutation.data &&
    ((mutation.data.runtime_echo?.uplink?.elevation_deg ?? 0) < 0 ||
      (mutation.data.runtime_echo?.downlink?.elevation_deg ?? 0) < 0);

  useEffect(() => {
    if (scenarioDetailQuery.data)
      setPrefill(loadScenario(scenarioDetailQuery.data));
  }, [scenarioDetailQuery.data]);

  const modcodSelected = mutation.data?.modcod_selected;
  const transponderType =
    mutation.data?.strategy?.transponder_type ||
    mutation.data?.payload_snapshot?.strategy?.transponder_type ||
    lastRequest?.transponder_type;
  const isDirectionalModcod = Boolean(
    transponderType === "REGENERATIVE" &&
    modcodSelected &&
    typeof modcodSelected === "object" &&
    ("uplink" in modcodSelected || "downlink" in modcodSelected),
  );
  const modcodSummary = isDirectionalModcod
    ? `UL ${formatModcod(modcodSelected, "uplink")} | DL ${formatModcod(modcodSelected, "downlink")}`
    : formatModcod(modcodSelected);
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
            <Button
              variant="light"
              size="xs"
              onClick={assets.refetch}
              loading={assets.isFetching}
            >
              Reload
            </Button>
          </Group>
          {assets.errors.length > 0 && (
            <Alert color="red" title="Failed to load selectors">
              {assets.errors.map((err) => formatError(err)).join("; ")}
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
                modcodOptions={assets.modcodOptions}
                satelliteOptions={assets.satelliteOptions}
                earthStationOptions={assets.earthStationOptions}
                modcodLoading={assets.modcodLoading}
                satelliteLoading={assets.satelliteLoading}
                earthStationLoading={assets.earthStationLoading}
                satellites={assets.satellites}
                earthStations={assets.earthStations}
              />
            </div>
            <ScenarioList
              scenarios={scenariosQuery.data?.items ?? []}
              isLoading={scenariosQuery.isLoading}
              errorMessage={scenarioErrorMessage}
              selectedScenarioId={selectedScenarioId}
              detailFetching={scenarioDetailQuery.isFetching}
              deletePending={deleteScenario.isPending}
              deletingId={deleteScenario.variables as string | undefined}
              onSelect={(id, pf) => {
                setSelectedScenarioId(id);
                setPrefill(pf);
                navigate(id ? `/scenarios/${id}` : "/", { replace: true });
              }}
              onDelete={(id) => deleteScenario.mutate(id)}
            />
          </Flex>
        </Stack>
      </Card>

      {mutation.error != null && (
        <Alert color="red">
          Calculation failed: {formatError(mutation.error)}
        </Alert>
      )}

      {!mutation.data && !mutation.isPending && !mutation.error && (
        <Card shadow="sm" withBorder>
          <EmptyState
            icon={<IconCalculator size={24} />}
            title="No results yet"
            description="Fill in the parameters above and click Calculate to see link budget results."
          />
        </Card>
      )}

      {mutation.data && (
        <Stack gap="md">
          {elevationError && (
            <Alert color="red" title="Elevation below horizon">
              Results may be invalid because the satellite is below the horizon
              (negative elevation).
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
            <DirectionResultCard
              direction="uplink"
              result={mutation.data.results.uplink}
              elevationDeg={mutation.data.runtime_echo?.uplink?.elevation_deg}
              transponderType={transponderType}
              isDirectionalModcod={isDirectionalModcod}
              modcodSelected={modcodSelected}
            />
            <DirectionResultCard
              direction="downlink"
              result={mutation.data.results.downlink}
              elevationDeg={mutation.data.runtime_echo?.downlink?.elevation_deg}
              transponderType={transponderType}
              isDirectionalModcod={isDirectionalModcod}
              modcodSelected={modcodSelected}
            />
            <CombinedResultCard
              results={mutation.data.results}
              combinedLinkMarginDb={mutation.data.combined_link_margin_db}
              modcodSelected={modcodSelected}
              transponderType={transponderType}
              isDirectionalModcod={isDirectionalModcod}
              modcodSummary={modcodSummary}
              channelBandwidth={channelBandwidth}
              onSave={() => setSaveOpen(true)}
            />
          </Flex>

          <Card shadow="sm" withBorder>
            <Tabs defaultValue="waterfall" aria-label="Result visualization">
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
          payload_snapshot={
            mutation.data.payload_snapshot as Record<string, unknown>
          }
          metadata={{
            waveform_strategy:
              mutation.data.payload_snapshot?.strategy?.waveform_strategy ||
              lastRequest?.waveform_strategy ||
              "DVB_S2X",
            transponder_type:
              mutation.data.payload_snapshot?.strategy?.transponder_type ||
              lastRequest?.transponder_type ||
              "TRANSPARENT",
            modcod_table_id:
              mutation.data.payload_snapshot?.metadata?.modcod_table_id ||
              mutation.data.payload_snapshot?.metadata
                ?.downlink_modcod_table_id ||
              lastRequest?.modcod_table_id ||
              lastRequest?.downlink_modcod_table_id ||
              lastRequest?.uplink_modcod_table_id ||
              "",
            satellite_id:
              mutation.data.payload_snapshot?.metadata?.satellite_id ||
              lastRequest?.satellite_id,
            earth_station_tx_id:
              mutation.data.payload_snapshot?.metadata?.earth_station_tx_id ||
              lastRequest?.earth_station_tx_id,
            earth_station_rx_id:
              mutation.data.payload_snapshot?.metadata?.earth_station_rx_id ||
              lastRequest?.earth_station_rx_id,
          }}
        />
      )}
    </Stack>
  );
}
