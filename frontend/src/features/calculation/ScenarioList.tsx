import {
  Alert,
  Button,
  Card,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconBookmark } from "@tabler/icons-react";
import { useState } from "react";

import type { CalculationRequest } from "../../api/schemas";
import type { ScenarioSummary } from "../../api/types";
import { DeleteConfirmModal } from "../../components/DeleteConfirmModal";
import { EmptyState } from "../../components/EmptyState";
import { loadScenario } from "../../lib/scenarioMapper";

type Props = {
  scenarios: ScenarioSummary[];
  isLoading: boolean;
  errorMessage: string;
  selectedScenarioId: string | null;
  detailFetching: boolean;
  deletePending: boolean;
  deletingId: string | undefined;
  duplicatePending?: boolean;
  duplicatingId?: string | undefined;
  onSelect: (id: string, prefill: CalculationRequest | null) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
};

export function ScenarioList({
  scenarios,
  isLoading,
  errorMessage,
  selectedScenarioId,
  detailFetching,
  deletePending,
  deletingId,
  duplicatePending,
  duplicatingId,
  onSelect,
  onDelete,
  onDuplicate,
}: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const deleteModalItemName = scenarios.find(
    (s) => s.id === confirmingId,
  )?.name;

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
                    {onDuplicate && (
                      <Button
                        size="xs"
                        variant="subtle"
                        loading={duplicatePending && duplicatingId === s.id}
                        onClick={() => onDuplicate(s.id)}
                      >
                        Duplicate
                      </Button>
                    )}
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() => setConfirmingId(s.id)}
                    >
                      Delete
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
            {scenarios.length === 0 && !isLoading && (
              <EmptyState
                icon={<IconBookmark size={24} />}
                title="No scenarios saved yet"
                description="Run a calculation and save the results as a scenario."
              />
            )}
          </Stack>
        </ScrollArea>
      </Stack>
      <DeleteConfirmModal
        opened={confirmingId !== null}
        onConfirm={() => {
          if (confirmingId) {
            onDelete(confirmingId);
            setConfirmingId(null);
          }
        }}
        onCancel={() => setConfirmingId(null)}
        message={
          deleteModalItemName
            ? `Are you sure you want to delete scenario '${deleteModalItemName}'? This action cannot be undone.`
            : "Are you sure you want to delete this scenario? This action cannot be undone."
        }
        loading={deletePending && deletingId === confirmingId}
      />
    </Card>
  );
}
