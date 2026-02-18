import {
  Alert,
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";

import type { CalculationRequest } from "../../api/schemas";
import type { ScenarioSummary } from "../../api/types";
import { loadScenario } from "../../lib/scenarioMapper";

type Props = {
  scenarios: ScenarioSummary[];
  isLoading: boolean;
  errorMessage: string;
  selectedScenarioId: string | null;
  detailFetching: boolean;
  deletePending: boolean;
  deletingId: string | undefined;
  onSelect: (id: string, prefill: CalculationRequest | null) => void;
  onDelete: (id: string) => void;
};

export function ScenarioList({
  scenarios,
  isLoading,
  errorMessage,
  selectedScenarioId,
  detailFetching,
  deletePending,
  deletingId,
  onSelect,
  onDelete,
}: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <Card shadow="xs" withBorder style={{ flex: 1, minWidth: 260 }}>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={600}>Saved Scenarios</Text>
          {isLoading && <Text size="xs">Loading...</Text>}
        </Group>
        {errorMessage && (
          <Alert color="red" title="Scenario load error">
            {errorMessage}
          </Alert>
        )}
        <ScrollArea h={670} type="auto" offsetScrollbars>
          <Stack gap="sm" pr="xs">
            {scenarios.map((s) => (
              <Card
                key={s.id}
                withBorder
                padding="sm"
                style={{
                  borderColor:
                    selectedScenarioId === s.id
                      ? "var(--mantine-color-downlink-7)"
                      : undefined,
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
                      loading={selectedScenarioId === s.id && detailFetching}
                      onClick={() => onSelect(s.id, loadScenario(s))}
                    >
                      Load
                    </Button>
                    {confirmingId === s.id ? (
                      <Group gap={4}>
                        <Button
                          size="xs"
                          color="red"
                          variant="filled"
                          loading={deletePending && deletingId === s.id}
                          onClick={() => {
                            onDelete(s.id);
                            setConfirmingId(null);
                          }}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </Button>
                      </Group>
                    ) : (
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={() => setConfirmingId(s.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            ))}
            {scenarios.length === 0 && !isLoading && (
              <Text size="sm" c="dimmed">
                No scenarios saved yet
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Card>
  );
}
