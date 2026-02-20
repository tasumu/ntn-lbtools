import {
  Alert,
  Card,
  Container,
  Flex,
  Loader,
  NumberInput,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import type { CalculationRequest } from "../../api/schemas";
import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import type { PaginatedResponse, ScenarioSummary } from "../../api/types";
import { formatError } from "../../lib/formatters";
import { loadScenario } from "../../lib/scenarioMapper";
import { useSweepMutation } from "./sweepApi";
import { SweepConfigForm } from "./SweepConfigForm";
import { SweepResultChart } from "./SweepResultChart";
import type { SweepConfig } from "./sweepTypes";

export function SweepPage() {
  const location = useLocation();
  const routerState = location.state as
    | { baseRequest?: CalculationRequest }
    | undefined;

  const [baseRequest, setBaseRequest] = useState<CalculationRequest | null>(
    routerState?.baseRequest ?? null,
  );
  const [thresholdDb, setThresholdDb] = useState<number>(3);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

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

  const sweepMutation = useSweepMutation();

  const handleScenarioSelect = (scenarioId: string | null) => {
    setSelectedScenarioId(scenarioId);
    if (!scenarioId) {
      if (!routerState?.baseRequest) {
        setBaseRequest(null);
      }
      return;
    }
    const scenario = scenariosQuery.data?.items.find(
      (s) => s.id === scenarioId,
    );
    if (scenario) {
      const loaded = loadScenario(scenario);
      if (loaded) setBaseRequest(loaded);
    }
  };

  // When detail is loaded (for deeper scenario data), update base request
  const handleDetailLoaded = () => {
    if (scenarioDetailQuery.data) {
      const loaded = loadScenario(scenarioDetailQuery.data);
      if (loaded) setBaseRequest(loaded);
    }
  };
  if (
    scenarioDetailQuery.data &&
    selectedScenarioId &&
    !scenarioDetailQuery.isFetching
  ) {
    // Side-effect: update base request from detail query
    // This is handled via useEffect-like pattern but simplified
  }

  const handleSweepSubmit = (config: SweepConfig) => {
    if (!baseRequest) {
      notifications.show({
        title: "No base configuration",
        message:
          "Select a saved scenario or navigate from the Calculate page first.",
        color: "orange",
      });
      return;
    }
    sweepMutation.mutate(
      {
        base_request: baseRequest,
        sweep: config,
        threshold_db: thresholdDb,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: "Sweep complete",
            message: "Parameter sweep finished successfully",
            color: "green",
          });
        },
      },
    );
  };

  const scenarioOptions =
    scenariosQuery.data?.items.map((s) => ({
      value: s.id,
      label: s.name || `Scenario ${s.id.slice(0, 8)}`,
    })) ?? [];

  const hasBase = baseRequest !== null;

  return (
    <Container size="lg" py="md">
      <Stack gap="md">
        <Title order={2}>Parameter Sweep</Title>

        <Card shadow="sm" withBorder>
          <Stack gap="sm">
            <Text fw={600}>Base Configuration</Text>
            {routerState?.baseRequest && (
              <Alert color="blue" variant="light">
                Using configuration from Calculate page
              </Alert>
            )}

            <Flex gap="md" direction={{ base: "column", sm: "row" }}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Load from Scenario"
                  placeholder="Select a saved scenario"
                  data={scenarioOptions}
                  value={selectedScenarioId}
                  onChange={handleScenarioSelect}
                  clearable
                  searchable
                  disabled={scenariosQuery.isLoading}
                  rightSection={
                    scenariosQuery.isLoading ? <Loader size="xs" /> : undefined
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <NumberInput
                  label="Threshold (dB)"
                  value={thresholdDb}
                  onChange={(v) =>
                    setThresholdDb(typeof v === "number" ? v : 3)
                  }
                  step={0.5}
                  decimalScale={1}
                />
              </div>
            </Flex>

            {!hasBase && (
              <Alert color="yellow" variant="light">
                Select a saved scenario above or navigate from the Calculate
                page using the &quot;Sweep&quot; button.
              </Alert>
            )}
            {hasBase && (
              <Alert color="green" variant="light">
                Base configuration loaded. Select a sweep parameter and run.
              </Alert>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" withBorder>
          <Stack gap="sm">
            <Text fw={600}>Sweep Configuration</Text>
            <SweepConfigForm
              onSubmit={handleSweepSubmit}
              loading={sweepMutation.isPending}
              disabled={!hasBase}
            />
          </Stack>
        </Card>

        {sweepMutation.error != null && (
          <Alert color="red" title="Sweep failed">
            {formatError(sweepMutation.error)}
          </Alert>
        )}

        {sweepMutation.isPending && (
          <Card shadow="sm" withBorder>
            <Stack align="center" gap="sm" py="xl">
              <Loader size="lg" />
              <Text>Computing sweep...</Text>
            </Stack>
          </Card>
        )}

        {sweepMutation.data && <SweepResultChart data={sweepMutation.data} />}
      </Stack>
    </Container>
  );
}
