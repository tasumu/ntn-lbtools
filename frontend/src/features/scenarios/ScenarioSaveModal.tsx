import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Modal,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { notifications } from "@mantine/notifications";

import { ScenarioPayload } from "../../api/schemas";
import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { formatError } from "../../lib/formatters";

const scenarioSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof scenarioSchema>;

type ScenarioMetadata = {
  waveform_strategy: string;
  transponder_type: string;
  modcod_table_id: string;
  satellite_id?: string;
  earth_station_tx_id?: string;
  earth_station_rx_id?: string;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  payload_snapshot: ScenarioPayload | Record<string, unknown>;
  metadata: ScenarioMetadata;
  mitigation?: {
    uplink_db?: number;
    downlink_db?: number;
    notes?: string;
  };
};

export function ScenarioSaveModal({
  opened,
  onClose,
  payload_snapshot,
  metadata,
}: Props) {
  const client = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      request({
        method: "POST",
        url: "/scenarios",
        data: {
          ...metadata,
          ...values,
          schema_version: "1.1.0",
          status: "Saved",
          payload_snapshot: {
            ...payload_snapshot,
            metadata: {
              ...("metadata" in payload_snapshot
                ? (payload_snapshot.metadata as Record<string, unknown>)
                : {}),
              schema_version: "1.1.0",
            },
          },
        },
      }),
    onSuccess: () => {
      notifications.show({
        title: "Scenario saved",
        message: "Scenario saved successfully",
        color: "green",
      });
      onClose();
      client.invalidateQueries({ queryKey: queryKeys.scenarios.all });
      form.reset();
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Save Scenario">
      <form
        aria-label="Save scenario"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <Stack>
          {mutation.error != null && (
            <Alert color="red">
              Save failed: {formatError(mutation.error)}
            </Alert>
          )}
          <TextInput
            label="Name"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Textarea
            label="Description"
            minRows={3}
            {...form.register("description")}
            error={form.formState.errors.description?.message}
          />
          <Button
            type="submit"
            loading={mutation.isPending}
            aria-busy={mutation.isPending}
          >
            Save
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
