import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { notifications } from "@mantine/notifications";

import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { optionalNumber } from "../../api/schemas";
import { formatError } from "../../lib/formatters";

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
  latitude_deg: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.number().min(-90).max(90).optional(),
  ),
  longitude_deg: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.number().min(-180).max(180).optional(),
  ),
  altitude_m: optionalNumber,
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const EARTH_STATION_DEFAULTS: FormValues = {
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
  latitude_deg: undefined,
  longitude_deg: undefined,
  altitude_m: undefined,
  notes: "",
};

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
    mode: "onBlur",
    defaultValues: EARTH_STATION_DEFAULTS,
  });

  useEffect(() => {
    setEditingId(initial?.id ?? null);
    if (initial) {
      const { id: _ignore, ...rest } = initial;
      form.reset({
        name: rest.name ?? "",
        description: rest.description ?? "",
        antenna_diameter_m: rest.antenna_diameter_m,
        antenna_gain_tx_db: rest.antenna_gain_tx_db,
        antenna_gain_rx_db: rest.antenna_gain_rx_db,
        noise_temperature_k: rest.noise_temperature_k,
        eirp_dbw: rest.eirp_dbw,
        tx_power_dbw: rest.tx_power_dbw,
        gt_db_per_k: rest.gt_db_per_k,
        polarization: rest.polarization,
        latitude_deg: rest.latitude_deg,
        longitude_deg: rest.longitude_deg,
        altitude_m: rest.altitude_m,
        notes: rest.notes,
      });
    } else {
      form.reset(EARTH_STATION_DEFAULTS);
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
      notifications.show({
        title: "Earth station saved",
        message: editingId
          ? "Earth station updated successfully"
          : "Earth station created successfully",
        color: "green",
      });
      client.invalidateQueries({ queryKey: queryKeys.earthStations.all });
      setEditingId(null);
      onSaved?.();
      form.reset(EARTH_STATION_DEFAULTS);
    },
    onError: () => {
      // keep form values for user correction
    },
  });

  return (
    <form
      aria-label="Earth station details"
      onSubmit={form.handleSubmit((values) =>
        mutation.mutate({ values, id: editingId }),
      )}
    >
      <Stack>
        {mutation.error && (
          <Alert color="red">Save failed: {formatError(mutation.error)}</Alert>
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
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
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
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
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
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
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
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Polarization"
            description="For cross-pol interference check"
            {...form.register("polarization")}
          />
          <Textarea label="Notes" minRows={2} {...form.register("notes")} />
        </SimpleGrid>
        <Text size="sm" fw={600} mt="xs">
          Default Location (optional)
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Controller
            name="latitude_deg"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Latitude (deg)"
                description="-90 to 90"
                min={-90}
                max={90}
                value={field.value ?? undefined}
                onChange={(value) =>
                  field.onChange(value === "" ? undefined : value)
                }
                error={form.formState.errors.latitude_deg?.message}
              />
            )}
          />
          <Controller
            name="longitude_deg"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Longitude (deg)"
                description="-180 to 180"
                min={-180}
                max={180}
                value={field.value ?? undefined}
                onChange={(value) =>
                  field.onChange(value === "" ? undefined : value)
                }
                error={form.formState.errors.longitude_deg?.message}
              />
            )}
          />
          <Controller
            name="altitude_m"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Altitude (m)"
                description="Above sea level"
                value={field.value ?? undefined}
                onChange={(value) =>
                  field.onChange(value === "" ? undefined : value)
                }
                error={form.formState.errors.altitude_m?.message}
              />
            )}
          />
        </SimpleGrid>
        <Group justify="flex-start" gap="sm">
          <Button
            type="submit"
            loading={mutation.isPending}
            aria-busy={mutation.isPending}
          >
            {editingId ? "Update earth station" : "Save earth station"}
          </Button>
          {editingId && (
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setEditingId(null);
                onCancelEdit?.();
                form.reset(EARTH_STATION_DEFAULTS);
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
