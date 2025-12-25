import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Group, Loader, NumberInput, Select, Stack, Text, Switch, Divider, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, FieldErrors } from "react-hook-form";

import {
  CalculationRequest,
  calculationRequestSchema,
  transponderTypeSchema,
  waveformStrategySchema,
} from "../../api/schemas";

type Props = {
  onSubmit: (data: CalculationRequest) => void;
  loading?: boolean;
  modcodOptions?: { value: string; label: string; waveform?: string }[];
  satelliteOptions?: { value: string; label: string }[];
  earthStationOptions?: { value: string; label: string }[];
  modcodLoading?: boolean;
  satelliteLoading?: boolean;
  earthStationLoading?: boolean;
};

const formSchema = calculationRequestSchema.refine(
  (data) => Boolean(data.earth_station_tx_id || data.earth_station_rx_id),
  { message: "Select at least one Earth Station", path: ["earth_station_tx_id"] }
);

export function CalculationForm({
      onSubmit,
      loading,
      modcodOptions = [],
      satelliteOptions = [],
      earthStationOptions = [],
  modcodLoading = false,
  satelliteLoading = false,
  earthStationLoading = false,
  initialValues,
}: Props & { initialValues?: CalculationRequest | null }) {
  const [uplinkMitigationDb, setUplinkMitigationDb] = useState<number | undefined>(undefined);
  const [downlinkMitigationDb, setDownlinkMitigationDb] = useState<number | undefined>(undefined);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const { handleSubmit, control, formState: { errors }, reset, setValue } = useForm<CalculationRequest>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      waveform_strategy: waveformStrategySchema.enum.DVB_S2X,
      transponder_type: transponderTypeSchema.enum.TRANSPARENT,
      modcod_table_id: undefined,
      uplink_modcod_table_id: undefined,
      downlink_modcod_table_id: undefined,
      satellite_id: "",
      earth_station_tx_id: undefined,
      earth_station_rx_id: undefined,
      runtime: {
        bandwidth_hz: 36e6,
        rolloff: 0.2,
        uplink: {
          frequency_hz: 14.25e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0,
          ground_lon_deg: 0,
          ground_alt_m: 0,
          interference: {
            adjacent_sat_ci_db: undefined,
            cross_polar_ci_db: undefined,
            other_carrier_ci_db: undefined,
            applied: false,
          },
        },
        downlink: {
          frequency_hz: 12e9,
          bandwidth_hz: 36e6,
          rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0,
          ground_lon_deg: 0,
          ground_alt_m: 0,
          interference: {
            adjacent_sat_ci_db: undefined,
            cross_polar_ci_db: undefined,
            other_carrier_ci_db: undefined,
            applied: false,
          },
        },
        intermodulation: {
          input_backoff_db: undefined,
          output_backoff_db: undefined,
          saturation_power_dbw: undefined,
          composite_carriers: undefined,
          reference_bandwidth_hz: undefined,
          applied: false,
        },
      },
    },
  });
  const transponderType = useWatch({ control, name: "transponder_type" });
  const selectedWaveform = useWatch({ control, name: "waveform_strategy" });

  const availableWaveforms = Array.from(new Set(modcodOptions.map((o) => o.waveform).filter(Boolean))) as string[];
  const defaultWaveforms = ["DVB_S2X", "5G_NR"];
  const waveformOptions = Array.from(new Set([...defaultWaveforms, ...availableWaveforms])).map((w) => ({
    value: w,
    label: w.replace("_", "-"),
  }));

  const filteredModcodOptions = modcodOptions.filter(
    (o) => !o.waveform || !selectedWaveform || o.waveform === selectedWaveform
  );
  const sharedBandwidth = useWatch({ control, name: "runtime.bandwidth_hz" });
  const uplinkBandwidth = useWatch({ control, name: "runtime.uplink.bandwidth_hz" });
  const downlinkBandwidth = useWatch({ control, name: "runtime.downlink.bandwidth_hz" });

  useEffect(() => {
    if (transponderType === transponderTypeSchema.enum.TRANSPARENT && sharedBandwidth) {
      setValue("runtime.uplink.bandwidth_hz", sharedBandwidth);
      setValue("runtime.downlink.bandwidth_hz", sharedBandwidth);
    }
  }, [sharedBandwidth, setValue, transponderType]);
  useEffect(() => {
    if (transponderType === transponderTypeSchema.enum.TRANSPARENT && !sharedBandwidth) {
      const candidate = uplinkBandwidth || downlinkBandwidth;
      if (candidate) {
        setValue("runtime.bandwidth_hz", candidate);
      }
    }
  }, [downlinkBandwidth, sharedBandwidth, setValue, transponderType, uplinkBandwidth]);
  useEffect(() => {
    if (initialValues) {
      reset({
        ...initialValues,
        runtime: {
          ...initialValues.runtime,
          uplink: {
            ...initialValues.runtime.uplink,
            ground_lat_deg: initialValues.runtime?.uplink?.ground_lat_deg ?? 0,
            ground_lon_deg: initialValues.runtime?.uplink?.ground_lon_deg ?? 0,
            ground_alt_m: initialValues.runtime?.uplink?.ground_alt_m ?? 0,
          },
          downlink: {
            ...initialValues.runtime.downlink,
            ground_lat_deg: initialValues.runtime?.downlink?.ground_lat_deg ?? 0,
            ground_lon_deg: initialValues.runtime?.downlink?.ground_lon_deg ?? 0,
            ground_alt_m: initialValues.runtime?.downlink?.ground_alt_m ?? 0,
          },
        },
      });
    }
  }, [initialValues, reset]);

  const firstErrorMessage = (errObj: FieldErrors<CalculationRequest>): string | null => {
    const stack: Array<{ path: string; node: any }> = [{ path: "", node: errObj }];
    const seen = new Set<any>();
    while (stack.length) {
      const { path, node } = stack.shift()!;
      if (!node || seen.has(node)) continue;
      seen.add(node);
      if (typeof node === "object" && "message" in node && node.message) {
        const loc = path ? `${path}: ` : "";
        return `${loc}${node.message as string}`;
      }
      if (Array.isArray(node)) {
        node.forEach((v, idx) => stack.push({ path: `${path}[${idx}]`, node: v }));
      } else if (typeof node === "object") {
        Object.entries(node).forEach(([k, v]) => stack.push({ path: path ? `${path}.${k}` : k, node: v }));
      }
    }
    return null;
  };

  const prepareData = (values: CalculationRequest) => {
    const normalizeInterference = (
      block?: CalculationRequest["runtime"]["uplink"]["interference"],
      mitigationDb?: number | undefined,
    ) => {
      if (!block) return undefined;
      const hasCi = [
        block.adjacent_sat_ci_db,
        block.cross_polar_ci_db,
        block.other_carrier_ci_db,
      ].some((value) => value !== undefined && value !== null);
      const applied = block.applied || hasCi;
      const applyMitigation = (value?: number | null) => {
        if (value === undefined || value === null) return undefined;
        return value + (mitigationDb ?? 0);
      };
      return {
        ...block,
        adjacent_sat_ci_db: applyMitigation(block.adjacent_sat_ci_db),
        cross_polar_ci_db: applyMitigation(block.cross_polar_ci_db),
        other_carrier_ci_db: applyMitigation(block.other_carrier_ci_db),
        applied,
      };
    };
    const normalizeIntermod = (block?: CalculationRequest["runtime"]["intermodulation"]) => {
      if (!block) return undefined;
      const applied =
        block.applied ||
        (block.input_backoff_db ?? 0) > 0 ||
        (block.output_backoff_db ?? 0) > 0 ||
        (block.composite_carriers ?? 0) > 0;
      return { ...block, applied };
    };
    const prepared: CalculationRequest = {
      ...values,
      modcod_table_id: values.modcod_table_id || undefined,
      uplink_modcod_table_id: values.uplink_modcod_table_id || undefined,
      downlink_modcod_table_id: values.downlink_modcod_table_id || undefined,
      earth_station_tx_id: values.earth_station_tx_id || undefined,
      earth_station_rx_id: values.earth_station_rx_id || undefined,
      runtime: {
        ...values.runtime,
        bandwidth_hz:
          values.transponder_type === transponderTypeSchema.enum.TRANSPARENT
            ? values.runtime.bandwidth_hz
            : undefined,
        uplink: {
          ...values.runtime.uplink,
          bandwidth_hz:
            values.transponder_type === transponderTypeSchema.enum.TRANSPARENT
              ? values.runtime.bandwidth_hz
              : values.runtime.uplink.bandwidth_hz,
        },
        downlink: {
          ...values.runtime.downlink,
          bandwidth_hz:
            values.transponder_type === transponderTypeSchema.enum.TRANSPARENT
              ? values.runtime.bandwidth_hz
              : values.runtime.downlink.bandwidth_hz,
        },
        intermodulation: normalizeIntermod(values.runtime.intermodulation),
      },
    };
    prepared.runtime.uplink.interference = normalizeInterference(
      values.runtime.uplink.interference,
      uplinkMitigationDb,
    );
    prepared.runtime.downlink.interference = normalizeInterference(
      values.runtime.downlink.interference,
      downlinkMitigationDb,
    );
    if (prepared.transponder_type === transponderTypeSchema.enum.TRANSPARENT) {
      prepared.uplink_modcod_table_id = undefined;
      prepared.downlink_modcod_table_id = undefined;
    }
    if (prepared.transponder_type === transponderTypeSchema.enum.REGENERATIVE && !prepared.modcod_table_id) {
      prepared.modcod_table_id = prepared.uplink_modcod_table_id || prepared.downlink_modcod_table_id;
    }
    const cleanObject = (obj?: Record<string, unknown>) => {
      if (!obj) return undefined;
      const entries = Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== "");
      return entries.length ? Object.fromEntries(entries) : undefined;
    };
    const overrides = { satellite: cleanObject(values.overrides?.satellite as any) };
    prepared.overrides = overrides.satellite ? overrides : undefined;
    return prepared;
  };

  const handleError = (formErrors: FieldErrors<CalculationRequest>) => {
    setValidationMessage(firstErrorMessage(formErrors) || "Please check the input.");
  };

  return (
    <form onSubmit={handleSubmit((values) => { setValidationMessage(null); onSubmit(prepareData(values)); }, handleError)}>
      <Stack>
        {validationMessage && (
          <Alert color="red" title="Input Error">
            {validationMessage}
          </Alert>
        )}
        <Group grow>
          <Controller
            name="waveform_strategy"
            control={control}
            render={({ field }) => (
              <Select
                label="Waveform"
                data={waveformOptions}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? "")}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.waveform_strategy?.message}
              />
            )}
          />
          <Controller
            name="transponder_type"
            control={control}
            render={({ field }) => (
              <Select
                label="Transponder"
                data={[
                  { value: "TRANSPARENT", label: "Transparent" },
                  { value: "REGENERATIVE", label: "Regenerative" },
                ]}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? undefined)}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.transponder_type?.message}
              />
            )}
          />
        </Group>
        <Group grow>
          {transponderType === transponderTypeSchema.enum.TRANSPARENT && (
            <Controller
              name="modcod_table_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="ModCod Table"
                  placeholder={modcodLoading ? "Loading..." : "Select"}
                  data={filteredModcodOptions}
                  searchable
                  disabled={modcodLoading}
                  rightSection={modcodLoading ? <Loader size="xs" /> : undefined}
                  nothingFoundMessage={modcodLoading ? "Loading..." : "No ModCod tables found"}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errors.modcod_table_id?.message}
                />
              )}
            />
          )}
          <Controller
            name="satellite_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Satellite"
                placeholder={satelliteLoading ? "Loading..." : "Select"}
                data={satelliteOptions}
                searchable
                disabled={satelliteLoading}
                rightSection={satelliteLoading ? <Loader size="xs" /> : undefined}
                nothingFoundMessage={satelliteLoading ? "Loading..." : "No satellites found"}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? "")}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.satellite_id?.message}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="earth_station_tx_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Earth Station (TX)"
                placeholder={earthStationLoading ? "Loading..." : "Select"}
                data={earthStationOptions}
                searchable
                disabled={earthStationLoading}
                rightSection={earthStationLoading ? <Loader size="xs" /> : undefined}
                nothingFoundMessage={earthStationLoading ? "Loading..." : "No earth stations found"}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? undefined)}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.earth_station_tx_id?.message}
              />
            )}
          />
          <Controller
            name="earth_station_rx_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Earth Station (RX)"
                placeholder={earthStationLoading ? "Loading..." : "Select"}
                data={earthStationOptions}
                searchable
                disabled={earthStationLoading}
                rightSection={earthStationLoading ? <Loader size="xs" /> : undefined}
                nothingFoundMessage={earthStationLoading ? "Loading..." : "No earth stations found"}
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? undefined)}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.earth_station_rx_id?.message}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.rolloff"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Rolloff (alpha)"
                min={0}
                max={1}
                step={0.01}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.rolloff?.message}
              />
            )}
          />
        </Group>
        {transponderType === transponderTypeSchema.enum.TRANSPARENT && (
          <Group grow>
            <Controller
              name="runtime.bandwidth_hz"
              control={control}
            render={({ field }) => (
              <NumberInput
                label="Channel bandwidth (Hz)"
                description="Required"
                withAsterisk
                thousandSeparator=","
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.bandwidth_hz?.message}
              />
            )}
          />
        </Group>
        )}
        <Text size="sm" fw={600}>
          Uplink (earth → satellite)
        </Text>
        <Group grow>
          <Controller
            name="runtime.uplink.frequency_hz"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Uplink frequency (Hz)"
                description="Required"
                withAsterisk
                thousandSeparator=","
                {...field}
                error={errors.runtime?.uplink?.frequency_hz?.message}
              />
            )}
          />
          {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
            <Controller
              name="uplink_modcod_table_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Uplink ModCod Table"
                  placeholder={modcodLoading ? "Loading..." : "Select"}
                  data={filteredModcodOptions}
                  searchable
                  disabled={modcodLoading}
                  rightSection={modcodLoading ? <Loader size="xs" /> : undefined}
                  nothingFoundMessage={modcodLoading ? "Loading..." : "No ModCod tables found"}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errors.uplink_modcod_table_id?.message}
                />
              )}
            />
          )}
          {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
            <Controller
              name="runtime.uplink.bandwidth_hz"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label="Uplink bandwidth (Hz)"
                  description="Required"
                  withAsterisk
                  thousandSeparator=","
                  value={field.value ?? undefined}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  error={errors.runtime?.uplink?.bandwidth_hz?.message}
                />
              )}
            />
          )}
        </Group>
        <Group grow>
          <Controller
            name="runtime.uplink.ground_lat_deg"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Uplink ground latitude (deg)"
                description="Required"
                withAsterisk
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.uplink?.ground_lat_deg?.message}
              />
            )}
          />
          <Controller
            name="runtime.uplink.ground_lon_deg"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Uplink ground longitude (deg)"
                description="Required"
                withAsterisk
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.uplink?.ground_lon_deg?.message}
              />
            )}
          />
          <Controller
            name="runtime.uplink.ground_alt_m"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Uplink altitude (m)"
                description="Optional (defaults to 0)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.uplink?.ground_alt_m?.message}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.uplink.rain_rate_mm_per_hr"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Uplink rain rate (mm/hr)"
                description="Optional (defaults to 0)"
                {...field}
                error={errors.runtime?.uplink?.rain_rate_mm_per_hr?.message}
              />
            )}
          />
        </Group>
        <Text size="sm" fw={600}>
          Downlink (satellite → earth)
        </Text>
        <Group grow>
          <Controller
            name="runtime.downlink.frequency_hz"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Downlink frequency (Hz)"
                description="Required"
                withAsterisk
                thousandSeparator=","
                {...field}
                error={errors.runtime?.downlink?.frequency_hz?.message}
              />
            )}
          />
          {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
            <Controller
              name="downlink_modcod_table_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Downlink ModCod Table"
                  placeholder={modcodLoading ? "Loading..." : "Select"}
                  data={filteredModcodOptions}
                  searchable
                  disabled={modcodLoading}
                  rightSection={modcodLoading ? <Loader size="xs" /> : undefined}
                  nothingFoundMessage={modcodLoading ? "Loading..." : "No ModCod tables found"}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  name={field.name}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={errors.downlink_modcod_table_id?.message}
                />
              )}
            />
          )}
          {transponderType === transponderTypeSchema.enum.REGENERATIVE && (
            <Controller
              name="runtime.downlink.bandwidth_hz"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label="Downlink bandwidth (Hz)"
                  description="Required"
                  withAsterisk
                  thousandSeparator=","
                  value={field.value ?? undefined}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  error={errors.runtime?.downlink?.bandwidth_hz?.message}
                />
              )}
            />
          )}
        </Group>
        <Group grow>
          <Controller
            name="runtime.downlink.ground_lat_deg"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Downlink ground latitude (deg)"
                description="Required"
                withAsterisk
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.downlink?.ground_lat_deg?.message}
              />
            )}
          />
          <Controller
            name="runtime.downlink.ground_lon_deg"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Downlink ground longitude (deg)"
                description="Required"
                withAsterisk
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.downlink?.ground_lon_deg?.message}
              />
            )}
          />
          <Controller
            name="runtime.downlink.ground_alt_m"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Downlink altitude (m)"
                description="Optional (defaults to 0)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.downlink?.ground_alt_m?.message}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.downlink.rain_rate_mm_per_hr"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Downlink rain rate (mm/hr)"
                description="Optional (defaults to 0)"
                {...field}
                error={errors.runtime?.downlink?.rain_rate_mm_per_hr?.message}
              />
            )}
          />
        </Group>
        <Group grow>
        </Group>
        <Divider label="Interference (Uplink)" />
        <Group grow>
          <Controller
            name="runtime.uplink.interference.applied"
            control={control}
            render={({ field }) => (
              <Switch label="Apply uplink interference" checked={field.value || false} onChange={(event) => field.onChange(event.currentTarget.checked)} />
            )}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Mitigation (dB, improve uplink C/I)"
            min={0}
            value={uplinkMitigationDb ?? undefined}
            onChange={(value) => setUplinkMitigationDb(value === "" ? undefined : (value as number | undefined))}
          />
          <Controller
            name="runtime.uplink.interference.notes"
            control={control}
            render={({ field }) => (
              <TextInput
                label="Notes"
                placeholder="e.g., improved pointing"
                value={field.value || ""}
                onChange={(event) => field.onChange(event.currentTarget.value)}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.uplink.interference.adjacent_sat_ci_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Adjacent Satellite Interference C/I (dB)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.uplink?.interference?.adjacent_sat_ci_db?.message}
              />
            )}
          />
          <Controller
            name="runtime.uplink.interference.cross_polar_ci_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Cross-Polarization Interference C/I (dB)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.uplink?.interference?.cross_polar_ci_db?.message}
              />
            )}
          />
          <Controller
            name="runtime.uplink.interference.other_carrier_ci_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Other interference C/I (dB)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.uplink?.interference?.other_carrier_ci_db?.message}
              />
            )}
          />
        </Group>
        <Divider label="Interference (Downlink)" />
        <Group grow>
          <Controller
            name="runtime.downlink.interference.applied"
            control={control}
            render={({ field }) => (
              <Switch label="Apply downlink interference" checked={field.value || false} onChange={(event) => field.onChange(event.currentTarget.checked)} />
            )}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Mitigation (dB, improve downlink C/I)"
            min={0}
            value={downlinkMitigationDb ?? undefined}
            onChange={(value) => setDownlinkMitigationDb(value === "" ? undefined : (value as number | undefined))}
          />
          <Controller
            name="runtime.downlink.interference.notes"
            control={control}
            render={({ field }) => (
              <TextInput
                label="Notes"
                placeholder="e.g., cross-pol isolation improvement"
                value={field.value || ""}
                onChange={(event) => field.onChange(event.currentTarget.value)}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.downlink.interference.adjacent_sat_ci_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Adjacent Satellite Interference C/I (dB)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.downlink?.interference?.adjacent_sat_ci_db?.message}
              />
            )}
          />
          <Controller
            name="runtime.downlink.interference.cross_polar_ci_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Cross-Polarization Interference C/I (dB)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.downlink?.interference?.cross_polar_ci_db?.message}
              />
            )}
          />
          <Controller
            name="runtime.downlink.interference.other_carrier_ci_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Other interference C/I (dB)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.downlink?.interference?.other_carrier_ci_db?.message}
              />
            )}
          />
        </Group>
        <Divider label="Intermodulation (Transparent transponder)" />
        <Group grow>
          <Controller
            name="runtime.intermodulation.applied"
            control={control}
            render={({ field }) => (
              <Switch label="Apply intermodulation" checked={field.value || false} onChange={(event) => field.onChange(event.currentTarget.checked)} />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.intermodulation.input_backoff_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Input back-off (dB)"
                min={0}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.intermodulation?.input_backoff_db?.message}
              />
            )}
          />
          <Controller
            name="runtime.intermodulation.output_backoff_db"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Output back-off (dB)"
                min={0}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.intermodulation?.output_backoff_db?.message}
              />
            )}
          />
          <Controller
            name="runtime.intermodulation.composite_carriers"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Composite carriers"
                min={1}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.intermodulation?.composite_carriers?.message}
              />
            )}
          />
        </Group>
        <Group grow>
          <Controller
            name="runtime.intermodulation.reference_bandwidth_hz"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Reference bandwidth (Hz)"
                min={0}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.intermodulation?.reference_bandwidth_hz?.message}
              />
            )}
          />
          <Controller
            name="runtime.intermodulation.saturation_power_dbw"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Saturation power (dBW)"
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value === "" ? undefined : value)}
                error={errors.runtime?.intermodulation?.saturation_power_dbw?.message}
              />
            )}
          />
        </Group>
        <Group mt="md">
          <Button type="submit" loading={loading}>
            Calculate
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
