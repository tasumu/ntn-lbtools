import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { notifications } from "@mantine/notifications";

import { request } from "../../api/client";
import { queryKeys } from "../../api/queryKeys";
import { optionalNumber } from "../../api/schemas";
import { formatError } from "../../lib/formatters";

const optionalString = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.string().optional(),
);

const schema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    orbit_type: z.string().default("GEO"),
    longitude_deg: optionalNumber,
    inclination_deg: optionalNumber,
    altitude_km: optionalNumber,
    tle_line1: optionalString,
    tle_line2: optionalString,
    transponder_bandwidth_mhz: optionalNumber,
    eirp_dbw: optionalNumber,
    gt_db_per_k: optionalNumber,
    frequency_band: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.orbit_type === "LEO" || data.orbit_type === "HAPS") &&
      (data.altitude_km === undefined || data.altitude_km === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Altitude is required for LEO/HAPS",
        path: ["altitude_km"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const SATELLITE_DEFAULTS: FormValues = {
  name: "",
  description: "",
  orbit_type: "GEO",
  frequency_band: "Ku",
  longitude_deg: undefined,
  inclination_deg: undefined,
  altitude_km: undefined,
  tle_line1: undefined,
  tle_line2: undefined,
  transponder_bandwidth_mhz: undefined,
  eirp_dbw: undefined,
  gt_db_per_k: undefined,
};

type Props = {
  initial?: (FormValues & { id?: string }) | null;
  onSaved?: () => void;
  onCancelEdit?: () => void;
};

export function SatelliteForm({ initial, onSaved, onCancelEdit }: Props) {
  const client = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(
    initial?.id ?? null,
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: SATELLITE_DEFAULTS,
  });

  const orbitType = useWatch({ control: form.control, name: "orbit_type" });
  const isNonGeo = orbitType === "LEO" || orbitType === "HAPS";

  useEffect(() => {
    setEditingId(initial?.id ?? null);
    if (initial) {
      const { id: _ignored, ...rest } = initial;
      form.reset({
        name: rest.name ?? "",
        description: rest.description,
        orbit_type: rest.orbit_type ?? "GEO",
        longitude_deg: rest.longitude_deg,
        inclination_deg: rest.inclination_deg,
        altitude_km: rest.altitude_km,
        tle_line1: rest.tle_line1,
        tle_line2: rest.tle_line2,
        transponder_bandwidth_mhz: rest.transponder_bandwidth_mhz,
        eirp_dbw: rest.eirp_dbw,
        gt_db_per_k: rest.gt_db_per_k,
        frequency_band: rest.frequency_band ?? "Ku",
      });
    } else {
      form.reset(SATELLITE_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, form.reset]);

  const mutation = useMutation({
    mutationFn: ({ values, id }: { values: FormValues; id?: string | null }) =>
      id
        ? request({
            method: "PUT",
            url: `/assets/satellites/${id}`,
            data: values,
          })
        : request({ method: "POST", url: "/assets/satellites", data: values }),
    onSuccess: () => {
      notifications.show({
        title: "Satellite saved",
        message: editingId
          ? "Satellite updated successfully"
          : "Satellite created successfully",
        color: "green",
      });
      client.invalidateQueries({ queryKey: queryKeys.satellites.all });
      setEditingId(null);
      onSaved?.();
      form.reset(SATELLITE_DEFAULTS);
    },
    onError: () => {
      // keep form values for user correction
    },
  });

  return (
    <form
      aria-label="Satellite details"
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
        <Textarea label="Description" {...form.register("description")} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Controller
            name="orbit_type"
            control={form.control}
            render={({ field }) => (
              <Select label="Orbit" data={["GEO", "HAPS", "LEO"]} {...field} />
            )}
          />
          <TextInput
            label="Frequency band"
            {...form.register("frequency_band")}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Controller
            name="longitude_deg"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Longitude (deg)"
                description={
                  orbitType === "GEO"
                    ? "Required for GEO"
                    : "Reference value (overridden by TLE at runtime)"
                }
                {...field}
              />
            )}
          />
          <Controller
            name="inclination_deg"
            control={form.control}
            render={({ field }) => (
              <NumberInput label="Inclination (deg)" {...field} />
            )}
          />
          <Controller
            name="altitude_km"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Altitude (km)"
                description={
                  isNonGeo
                    ? "Required for LEO/HAPS"
                    : "Default: 35786 km for GEO"
                }
                withAsterisk={isNonGeo}
                error={form.formState.errors.altitude_km?.message}
                {...field}
              />
            )}
          />
        </SimpleGrid>
        {isNonGeo && (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="TLE Line 1"
              description="Two-Line Element set for orbit propagation"
              placeholder="1 25544U 98067A ..."
              {...form.register("tle_line1")}
            />
            <TextInput
              label="TLE Line 2"
              description="Both lines required for propagation"
              placeholder="2 25544 ..."
              {...form.register("tle_line2")}
            />
          </SimpleGrid>
        )}
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Controller
            name="transponder_bandwidth_mhz"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Bandwidth (MHz)"
                description="Physical limit for validation"
                {...field}
              />
            )}
          />
          <Controller
            name="eirp_dbw"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="EIRP (dBW)"
                description="Default value. Required if not overridden."
                {...field}
              />
            )}
          />
          <Controller
            name="gt_db_per_k"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="Receive G/T (dB/K)"
                description="Default value. Required if not overridden."
                {...field}
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
            {editingId ? "Update satellite" : "Save satellite"}
          </Button>
          {editingId && (
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setEditingId(null);
                onCancelEdit?.();
                form.reset(SATELLITE_DEFAULTS);
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
