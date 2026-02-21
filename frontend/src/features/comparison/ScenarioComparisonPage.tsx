import { Alert, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import type {
  CalculationRequest,
  CalculationResponse,
} from "../../api/schemas";
import type { PaginatedResponse, ScenarioSummary } from "../../api/types";
import { formatError } from "../../lib/formatters";
import { loadScenario } from "../../lib/scenarioMapper";
import { useCalculationAssets } from "../../hooks/useCalculationAssets";
import {
  diffParameters,
  diffResults,
  extractParameters,
  extractResultSummary,
  resolveAssetNames,
} from "./comparisonUtils";
import type { AssetNameMap } from "./comparisonUtils";
import { ParameterDiffTable } from "./ParameterDiffTable";
import { ResultComparisonTable } from "./ResultComparisonTable";
import { ScenarioSelector } from "./ScenarioSelector";

interface ComparisonState {
  scenarioA: ScenarioSummary;
  scenarioB: ScenarioSummary;
  responseA: CalculationResponse;
  responseB: CalculationResponse;
}

export function ScenarioComparisonPage() {
  const [comparison, setComparison] = useState<ComparisonState | null>(null);

  const {
    data: paginatedScenarios,
    isLoading: scenariosLoading,
    error: scenariosError,
  } = useQuery<PaginatedResponse<ScenarioSummary>>({
    queryKey: queryKeys.scenarios.all,
    queryFn: () => request({ method: "GET", url: "/scenarios?limit=100" }),
  });

  const scenarios = paginatedScenarios?.items ?? [];

  const { satellites, earthStations } = useCalculationAssets();
  const assetMap: AssetNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of satellites) m.set(s.id, s.name);
    for (const e of earthStations) m.set(e.id, e.name);
    return m;
  }, [satellites, earthStations]);

  const compareMutation = useMutation({
    mutationFn: async ({ idA, idB }: { idA: string; idB: string }) => {
      const scenarioA = scenarios.find((s) => s.id === idA);
      const scenarioB = scenarios.find((s) => s.id === idB);
      if (!scenarioA || !scenarioB) {
        throw new Error("Scenario not found");
      }

      const reqA = loadScenario(scenarioA);
      const reqB = loadScenario(scenarioB);
      if (!reqA || !reqB) {
        throw new Error("Failed to convert scenario to calculation request");
      }

      const [responseA, responseB] = await Promise.all([
        request<CalculationResponse>({
          method: "POST",
          url: "/link-budgets/calculate",
          data: reqA as CalculationRequest,
        }),
        request<CalculationResponse>({
          method: "POST",
          url: "/link-budgets/calculate",
          data: reqB as CalculationRequest,
        }),
      ]);

      return { scenarioA, scenarioB, responseA, responseB };
    },
    onSuccess: (data) => setComparison(data),
  });

  const handleCompare = useCallback(
    (idA: string, idB: string) => {
      compareMutation.mutate({ idA, idB });
    },
    [compareMutation],
  );

  const scenarioOptions = scenarios.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <Container size="lg" py="md">
      <Stack>
        <Title order={2}>Scenario Comparison</Title>
        {scenariosError && (
          <Alert color="red">
            Failed to load scenarios: {formatError(scenariosError)}
          </Alert>
        )}
        <ScenarioSelector
          scenarios={scenarioOptions}
          loading={scenariosLoading || compareMutation.isPending}
          onCompare={handleCompare}
        />
        {compareMutation.isPending && (
          <Stack align="center" py="md">
            <Loader size="md" />
            <Text c="dimmed">Calculating both scenarios...</Text>
          </Stack>
        )}
        {compareMutation.error && (
          <Alert color="red">
            Comparison failed: {formatError(compareMutation.error)}
          </Alert>
        )}
        {comparison && (
          <>
            <Title order={3}>Parameter Differences</Title>
            <ParameterDiffTable
              rows={resolveAssetNames(
                diffParameters(
                  extractParameters(comparison.scenarioA),
                  extractParameters(comparison.scenarioB),
                ),
                assetMap,
              )}
              nameA={comparison.scenarioA.name}
              nameB={comparison.scenarioB.name}
            />
            <Title order={3}>Results Comparison</Title>
            <ResultComparisonTable
              rows={diffResults(
                extractResultSummary(comparison.responseA),
                extractResultSummary(comparison.responseB),
              )}
              nameA={comparison.scenarioA.name}
              nameB={comparison.scenarioB.name}
            />
          </>
        )}
      </Stack>
    </Container>
  );
}
