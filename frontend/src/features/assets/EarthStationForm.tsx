import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { request } from "../../api/client";

const optionalNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.number().optional(),
);

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  antenna_diameter_m: optionalNumber,
  antenna_gain_tx_db: optionalNumber,
  antenna_gain_rx_db: optionalNumber,
  noise_temperature_k: optionalNumber,
  eirp_dbw: optionalNumber,
  tx_power_dbw: optionalNumber,
  gt_db_per_k: optionalNumber,
  polarization: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  initial?: (FormValues & { id?: string }) | null;
  onSaved?: () => void;
  onCancelEdit?: () => void;
};

export function EarthStationForm({ initial, onSaved, onCancelEdit }: Props) {
  const client = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(
    initial?.id ?? null,
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      antenna_diameter_m: undefined,
      antenna_gain_tx_db: undefined,
      antenna_gain_rx_db: undefined,
      noise_temperature_k: undefined,
      eirp_dbw: undefined,
      tx_power_dbw: undefined,
      gt_db_per_k: undefined,
      polarization: "",
      notes: "",
    },
  });

  useEffect(() => {
    setEditingId(initial?.id ?? null);
    if (initial) {
      const { id: _ignore, ...rest } = initial;
      form.reset({
        name: rest.name ?? "",
        description: (rest as any).description ?? "",
        antenna_diameter_m: rest.antenna_diameter_m,
        antenna_gain_tx_db: rest.antenna_gain_tx_db,
        antenna_gain_rx_db: rest.antenna_gain_rx_db,
        noise_temperature_k: rest.noise_temperature_k,
        eirp_dbw: rest.eirp_dbw,
        tx_power_dbw: rest.tx_power_dbw,
        gt_db_per_k: rest.gt_db_per_k,
        polarization: rest.polarization,
        notes: rest.notes,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        antenna_diameter_m: undefined,
        antenna_gain_tx_db: undefined,
        antenna_gain_rx_db: undefined,
        noise_temperature_k: undefined,
        eirp_dbw: undefined,
        tx_power_dbw: undefined,
        gt_db_per_k: undefined,
        polarization: "",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, form.reset]);

  const mutation = useMutation({
    mutationFn: ({ values, id }: { values: FormValues; id?: string | null }) =>
      id
        ? request({
            method: "PUT",
            url: `/assets/earth-stations/${id}`,
            data: values,
          })
        : request({
            method: "POST",
            url: "/assets/earth-stations",
            data: values,
          }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["earth-stations"] });
      setEditingId(null);
      onSaved?.();
      form.reset({
        name: "",
        description: "",
        antenna_diameter_m: undefined,
        antenna_gain_tx_db: undefined,
        antenna_gain_rx_db: undefined,
        noise_temperature_k: undefined,
        eirp_dbw: undefined,
        tx_power_dbw: undefined,
        gt_db_per_k: undefined,
        polarization: "",
        notes: "",
      });
    },
    onError: () => {
      // keep form values for user correction
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        mutation.mutate({ values, id: editingId }),
      )}
    >
      <Stack>
        {mutation.error && (
          <Alert color="red">
            Save failed:{" "}
            {String((mutation.error as any)?.detail ?? mutation.error)}
          </Alert>
        )}
        <TextInput
          label="Name"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
        />
        <Textarea
          label="Description"
          minRows={2}
          {...form.register("description")}
          error={form.formState.errors.description?.message}
        />
        <Group grow>
          <Controller
            name="antenna_diameter_m"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Dish diameter (m)"
                description="For interference/beamwidth calc"
                {...field}
              />
            )}
          />
          <Controller
            name="noise_temperature_k"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Noise Temp (K)"
                description="System Noise Temp (for G/T calc)"
                {...field}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="antenna_gain_tx_db"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Tx Gain (dBi)"
                description="Used for EIRP fallback"
                {...field}
              />
            )}
          />
          <Controller
            name="antenna_gain_rx_db"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Rx Gain (dBi)"
                description="Used for G/T fallback"
                {...field}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="eirp_dbw"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="EIRP (dBW)"
                description="If empty, computed from Power+TxGain"
                {...field}
              />
            )}
          />
          <Controller
            name="tx_power_dbw"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="TX power (dBW)"
                description="Used for EIRP fallback"
                {...field}
              />
            )}
          />
          <Controller
            name="gt_db_per_k"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="G/T (dB/K)"
                description="If empty, computed from RxGain-10log(T)"
                {...field}
              />
            )}
          />
        </Group>
        <Group grow>
          <TextInput
            label="Polarization"
            description="For cross-pol interference check"
            {...form.register("polarization")}
          />
          <Textarea label="Notes" minRows={2} {...form.register("notes")} />
        </Group>
        <Group justify="flex-start" gap="sm">
          <Button type="submit" loading={mutation.isPending}>
            {editingId ? "Update earth station" : "Save earth station"}
          </Button>
          {editingId && (
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setEditingId(null);
                onCancelEdit?.();
                form.reset({
                  name: "",
                  description: "",
                  antenna_diameter_m: undefined,
                  antenna_gain_tx_db: undefined,
                  antenna_gain_rx_db: undefined,
                  noise_temperature_k: undefined,
                  eirp_dbw: undefined,
                  tx_power_dbw: undefined,
                  gt_db_per_k: undefined,
                  polarization: "",
                  notes: "",
                });
              }}
            >
              Cancel
            </Button>
          )}
        </Group>
      </Stack>
    </form>
  );
}
