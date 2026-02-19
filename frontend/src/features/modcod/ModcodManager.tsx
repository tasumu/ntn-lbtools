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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import type { ModcodTableAsset } from "../../api/types";
import { formatError } from "../../lib/formatters";

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
  waveform: z.string().default("DVB_S2X"),
  version: z.string().min(1),
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
  const handleConfirmDelete = useCallback(
    (id: string, mutate: (id: string) => void) => {
      mutate(id);
      setConfirmingDeleteId(null);
    },
    [],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      waveform: "DVB_S2X",
      version: "1.0.0",
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
        waveform: selected.waveform,
        version: selected.version,
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
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.modcodTables.all });
      if (selected?.id) setSelected(null);
    },
  });
  const deletingId = deleteMutation.variables as string | undefined;

  const {
    data = [],
    isLoading,
    error: queryError,
  } = useQuery<ModcodTableAsset[]>({
    queryKey: queryKeys.modcodTables.all,
    queryFn: () => request({ method: "GET", url: "/assets/modcod-tables" }),
  });

  return (
    <Stack gap="md">
      <Group grow align="flex-start" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 360 }}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <Stack>
              <Group grow>
                <TextInput label="Waveform" {...form.register("waveform")} />
                <TextInput label="Version" {...form.register("version")} />
              </Group>
              <Textarea
                label="Description"
                minRows={2}
                {...form.register("description")}
              />
              <Group justify="space-between" align="center">
                <Text size="sm" fw={600}>
                  Entries
                </Text>
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
              <Button type="submit" loading={mutation.isPending}>
                {selected ? "Save as new version" : "Save ModCod table"}
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
                  <Text fw={600}>{table.waveform}</Text>
                  <Text size="sm" c="dimmed">
                    {table.version}
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
                  {confirmingDeleteId === table.id ? (
                    <Group gap={4}>
                      <Button
                        size="xs"
                        color="red"
                        variant="filled"
                        loading={
                          deleteMutation.isPending && deletingId === table.id
                        }
                        onClick={() =>
                          handleConfirmDelete(table.id, deleteMutation.mutate)
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
                      onClick={() => setConfirmingDeleteId(table.id)}
                    >
                      Delete
                    </Button>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
          {data.length === 0 && (
            <Text size="sm" c="dimmed">
              No ModCod tables saved yet
            </Text>
          )}
        </Stack>
      </Group>
    </Stack>
  );
}
