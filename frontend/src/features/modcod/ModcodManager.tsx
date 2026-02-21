import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  NumberInput,
} from "@mantine/core";
import { IconTable } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { notifications } from "@mantine/notifications";

import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import type { ModcodTableAsset, PaginatedResponse } from "../../api/types";
import { formatError } from "../../lib/formatters";
import { DeleteConfirmModal } from "../../components/DeleteConfirmModal";
import { EmptyState } from "../../components/EmptyState";
import { PresetSelector } from "./PresetSelector";
import type { ModcodPreset } from "../../data/dvbs2xPresets";

const entrySchema = z
  .object({
    id: z.string(),
    modulation: z.string(),
    code_rate: z.string(),
    required_cn0_dbhz: z.number().optional(),
    required_ebno_db: z.number().optional(),
    info_bits_per_symbol: z.number().positive(),
  })
  .refine(
    (v) =>
      v.required_cn0_dbhz !== undefined || v.required_ebno_db !== undefined,
    { message: "Required C/N0 or Eb/N0 is needed" },
  );
const schema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must not exceed 255 characters"),
  waveform: z.string().default("DVB_S2X"),
  description: z.string().optional(),
  entries: z.array(entrySchema).nonempty(),
});

type FormValues = z.infer<typeof schema>;

export function ModcodManager() {
  const client = useQueryClient();
  const [selected, setSelected] = useState<ModcodTableAsset | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      waveform: "DVB_S2X",
      entries: [
        {
          id: "qpsk-1/4",
          modulation: "QPSK",
          code_rate: "1/4",
          required_cn0_dbhz: 65,
          info_bits_per_symbol: 0.5,
        },
      ],
    },
  });
  const entriesArray = useFieldArray({
    control: form.control,
    name: "entries",
  });

  useEffect(() => {
    if (selected) {
      form.reset({
        name: selected.name,
        waveform: selected.waveform,
        description: selected.description ?? "",
        entries: selected.entries ?? [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, form.reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      request({ method: "POST", url: "/assets/modcod-tables", data: values }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.modcodTables.all });
      setSelected(null);
    },
  });

  const deleteMutation = useMutation<void, unknown, string>({
    mutationFn: (id) =>
      request({ method: "DELETE", url: `/assets/modcod-tables/${id}` }),
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: queryKeys.modcodTables.all });
      if (selected?.id) setSelected(null);
      const tableName = data.find((t) => t.id === id)?.name ?? "ModCod table";
      notifications.show({
        title: "ModCod table deleted",
        message: `'${tableName}' removed successfully`,
        color: "green",
      });
    },
  });

  const handleConfirmDelete = useCallback(() => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId);
    setConfirmingDeleteId(null);
  }, [confirmingDeleteId, deleteMutation]);

  const {
    data: paginatedData,
    isLoading,
    error: queryError,
  } = useQuery<PaginatedResponse<ModcodTableAsset>>({
    queryKey: queryKeys.modcodTables.all,
    queryFn: () =>
      request({ method: "GET", url: "/assets/modcod-tables?limit=100" }),
  });
  const data = paginatedData?.items ?? [];

  const deleteModalItemName = data.find(
    (t) => t.id === confirmingDeleteId,
  )?.name;

  return (
    <Stack gap="md">
      <Group grow align="flex-start" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 360 }}>
          <form
            aria-label="ModCod table editor"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <Stack>
              <TextInput label="Name" {...form.register("name")} />
              <TextInput label="Waveform" {...form.register("waveform")} />
              <Textarea
                label="Description"
                minRows={2}
                {...form.register("description")}
              />
              <Group justify="space-between" align="center">
                <Text size="sm" fw={600}>
                  Entries
                </Text>
                <Group gap="xs">
                  <PresetSelector
                    onSelect={(preset: ModcodPreset) => {
                      form.reset({
                        name: form.getValues("name"),
                        waveform: form.getValues("waveform"),
                        description: form.getValues("description"),
                        entries: preset.entries.map((e) => ({
                          ...e,
                          required_cn0_dbhz: undefined,
                        })),
                      });
                    }}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() =>
                      entriesArray.append({
                        id: `entry-${entriesArray.fields.length + 1}`,
                        modulation: "",
                        code_rate: "",
                        required_cn0_dbhz: undefined,
                        required_ebno_db: undefined,
                        info_bits_per_symbol: 0,
                      })
                    }
                  >
                    Add entry
                  </Button>
                </Group>
              </Group>
              <Stack gap="sm">
                {entriesArray.fields.map((field, idx) => (
                  <Card key={field.id} withBorder padding="sm">
                    <Group gap="sm" align="flex-end" wrap="wrap">
                      <TextInput
                        label="ID"
                        w={140}
                        {...form.register(`entries.${idx}.id`)}
                      />
                      <TextInput
                        label="Modulation"
                        w={140}
                        {...form.register(`entries.${idx}.modulation`)}
                      />
                      <TextInput
                        label="Code rate"
                        w={120}
                        {...form.register(`entries.${idx}.code_rate`)}
                      />
                      <Controller
                        name={`entries.${idx}.info_bits_per_symbol`}
                        control={form.control}
                        render={({ field }) => (
                          <NumberInput
                            label="Info bits / symbol"
                            w={150}
                            value={field.value ?? undefined}
                            onChange={(value) =>
                              field.onChange(value ?? undefined)
                            }
                          />
                        )}
                      />
                      <Controller
                        name={`entries.${idx}.required_ebno_db`}
                        control={form.control}
                        render={({ field }) => (
                          <NumberInput
                            label="Required Eb/N0 (dB)"
                            description="Fallback when C/N0 is empty."
                            w={170}
                            {...field}
                          />
                        )}
                      />
                      <Controller
                        name={`entries.${idx}.required_cn0_dbhz`}
                        control={form.control}
                        render={({ field }) => (
                          <NumberInput
                            label="Required C/N0 (dB-Hz)"
                            description="Preferred threshold when provided."
                            w={170}
                            {...field}
                          />
                        )}
                      />
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        disabled={entriesArray.fields.length === 1}
                        onClick={() => entriesArray.remove(idx)}
                      >
                        Remove
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
              <Button
                type="submit"
                loading={mutation.isPending}
                aria-busy={mutation.isPending}
              >
                {selected ? "Save as new table" : "Save ModCod table"}
              </Button>
            </Stack>
          </form>
        </div>

        <Stack flex={1} gap="sm" style={{ minWidth: 320 }}>
          <Group justify="space-between" align="center">
            <Text fw={600}>Saved ModCod Tables</Text>
          </Group>
          {queryError && (
            <Alert color="red">Failed to load: {formatError(queryError)}</Alert>
          )}
          {mutation.error && (
            <Alert color="red">
              Save failed: {formatError(mutation.error)}
            </Alert>
          )}
          {deleteMutation.error != null && (
            <Alert color="red">
              Delete failed: {formatError(deleteMutation.error)}
            </Alert>
          )}
          {isLoading && (
            <Text size="sm" c="dimmed">
              Loading...
            </Text>
          )}
          {data.map((table) => (
            <Card key={table.id} withBorder>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={600}>{table.name}</Text>
                  <Text size="sm" c="dimmed">
                    {table.waveform}
                  </Text>
                  {table.description && (
                    <Text size="sm" c="dimmed">
                      {table.description}
                    </Text>
                  )}
                </div>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => setSelected(table)}
                  >
                    Load
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={() => setConfirmingDeleteId(table.id)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
          {data.length === 0 && !isLoading && (
            <EmptyState
              icon={<IconTable size={24} />}
              title="No ModCod tables saved yet"
              description="Create a ModCod table using the editor on the left."
            />
          )}
        </Stack>
      </Group>
      <DeleteConfirmModal
        opened={confirmingDeleteId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
        message={
          deleteModalItemName
            ? `Are you sure you want to delete '${deleteModalItemName}'? This action cannot be undone.`
            : "Are you sure you want to delete this ModCod table? This action cannot be undone."
        }
        loading={deleteMutation.isPending}
      />
    </Stack>
  );
}
