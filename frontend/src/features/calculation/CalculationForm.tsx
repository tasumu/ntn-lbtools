import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Group, NumberInput, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, FieldErrors } from "react-hook-form";

import {
  CalculationRequest,
  calculationRequestSchema,
  transponderTypeSchema,
  waveformStrategySchema,
} from "../../api/schemas";
import { AssetSelectors } from "./form/AssetSelectors";
import { LinkSection } from "./form/LinkSection";
import { InterferenceSection } from "./form/InterferenceSection";
import { IntermodulationSection } from "./form/IntermodulationSection";

type Props = {
  onSubmit: (data: CalculationRequest) => void;
  loading?: boolean;
  modcodOptions?: { value: string; label: string; waveform?: string }[];
  satelliteOptions?: { value: string; label: string }[];
  earthStationOptions?: { value: string; label: string }[];
  modcodLoading?: boolean;
  satelliteLoading?: boolean;
  earthStationLoading?: boolean;
  initialValues?: CalculationRequest | null;
};

const formSchema = calculationRequestSchema.refine(
  (data) => Boolean(data.earth_station_tx_id || data.earth_station_rx_id),
  { message: "Select at least one Earth Station", path: ["earth_station_tx_id"] },
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
}: Props) {
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
          frequency_hz: 14.25e9, bandwidth_hz: 36e6, rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0, ground_lon_deg: 0, ground_alt_m: 0,
          interference: { adjacent_sat_ci_db: undefined, cross_polar_ci_db: undefined, other_carrier_ci_db: undefined, applied: false },
        },
        downlink: {
          frequency_hz: 12e9, bandwidth_hz: 36e6, rain_rate_mm_per_hr: 10,
          ground_lat_deg: 0, ground_lon_deg: 0, ground_alt_m: 0,
          interference: { adjacent_sat_ci_db: undefined, cross_polar_ci_db: undefined, other_carrier_ci_db: undefined, applied: false },
        },
        intermodulation: {
          input_backoff_db: undefined, output_backoff_db: undefined, saturation_power_dbw: undefined,
          composite_carriers: undefined, reference_bandwidth_hz: undefined, applied: false,
        },
      },
    },
  });

  const transponderType = useWatch({ control, name: "transponder_type" });
  const selectedWaveform = useWatch({ control, name: "waveform_strategy" });
  const sharedBandwidth = useWatch({ control, name: "runtime.bandwidth_hz" });
  const uplinkBandwidth = useWatch({ control, name: "runtime.uplink.bandwidth_hz" });
  const downlinkBandwidth = useWatch({ control, name: "runtime.downlink.bandwidth_hz" });

  const availableWaveforms = Array.from(new Set(modcodOptions.map((o) => o.waveform).filter(Boolean))) as string[];
  const waveformOptions = Array.from(new Set(["DVB_S2X", "5G_NR", ...availableWaveforms])).map((w) => ({
    value: w,
    label: w.replace("_", "-"),
  }));
  const filteredModcodOptions = modcodOptions.filter(
    (o) => !o.waveform || !selectedWaveform || o.waveform === selectedWaveform,
  );

  useEffect(() => {
    if (transponderType === transponderTypeSchema.enum.TRANSPARENT && sharedBandwidth) {
      setValue("runtime.uplink.bandwidth_hz", sharedBandwidth);
      setValue("runtime.downlink.bandwidth_hz", sharedBandwidth);
    }
  }, [sharedBandwidth, setValue, transponderType]);

  useEffect(() => {
    if (transponderType === transponderTypeSchema.enum.TRANSPARENT && !sharedBandwidth) {
      const candidate = uplinkBandwidth || downlinkBandwidth;
      if (candidate) setValue("runtime.bandwidth_hz", candidate);
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
    const stack: Array<{ path: string; node: unknown }> = [{ path: "", node: errObj }];
    const seen = new Set<unknown>();
    while (stack.length) {
      const { path, node } = stack.shift()!;
      if (!node || seen.has(node)) continue;
      seen.add(node);
      if (typeof node === "object" && "message" in node && node.message) {
        return `${path ? `${path}: ` : ""}${node.message as string}`;
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
      mitigationDb?: number,
    ) => {
      if (!block) return undefined;
      const hasCi = [block.adjacent_sat_ci_db, block.cross_polar_ci_db, block.other_carrier_ci_db]
        .some((v) => v !== undefined && v !== null);
      const applied = block.applied || hasCi;
      const applyMitigation = (value?: number | null) =>
        value === undefined || value === null ? undefined : value + (mitigationDb ?? 0);
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
      const applied = block.applied || (block.input_backoff_db ?? 0) > 0 || (block.output_backoff_db ?? 0) > 0 || (block.composite_carriers ?? 0) > 0;
      return { ...block, applied };
    };
    const isTransparent = values.transponder_type === transponderTypeSchema.enum.TRANSPARENT;
    const prepared: CalculationRequest = {
      ...values,
      modcod_table_id: values.modcod_table_id || undefined,
      uplink_modcod_table_id: values.uplink_modcod_table_id || undefined,
      downlink_modcod_table_id: values.downlink_modcod_table_id || undefined,
      earth_station_tx_id: values.earth_station_tx_id || undefined,
      earth_station_rx_id: values.earth_station_rx_id || undefined,
      runtime: {
        ...values.runtime,
        bandwidth_hz: isTransparent ? values.runtime.bandwidth_hz : undefined,
        uplink: {
          ...values.runtime.uplink,
          bandwidth_hz: isTransparent ? values.runtime.bandwidth_hz : values.runtime.uplink.bandwidth_hz,
        },
        downlink: {
          ...values.runtime.downlink,
          bandwidth_hz: isTransparent ? values.runtime.bandwidth_hz : values.runtime.downlink.bandwidth_hz,
        },
        intermodulation: normalizeIntermod(values.runtime.intermodulation),
      },
    };
    prepared.runtime.uplink.interference = normalizeInterference(values.runtime.uplink.interference, uplinkMitigationDb);
    prepared.runtime.downlink.interference = normalizeInterference(values.runtime.downlink.interference, downlinkMitigationDb);
    if (isTransparent) {
      prepared.uplink_modcod_table_id = undefined;
      prepared.downlink_modcod_table_id = undefined;
    }
    if (prepared.transponder_type === transponderTypeSchema.enum.REGENERATIVE && !prepared.modcod_table_id) {
      prepared.modcod_table_id = prepared.uplink_modcod_table_id || prepared.downlink_modcod_table_id;
    }
    const cleanObject = (obj?: Record<string, unknown>) => {
      if (!obj) return undefined;
      const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "");
      return entries.length ? Object.fromEntries(entries) : undefined;
    };
    const overrides = { satellite: cleanObject(values.overrides?.satellite as Record<string, unknown> | undefined) };
    prepared.overrides = overrides.satellite ? overrides : undefined;
    return prepared;
  };

  return (
    <form
      onSubmit={handleSubmit((values) => { setValidationMessage(null); onSubmit(prepareData(values)); },
        (formErrors) => setValidationMessage(firstErrorMessage(formErrors) || "Please check the input."))}
    >
      <Stack>
        {validationMessage && (
          <Alert color="red" title="Input Error">{validationMessage}</Alert>
        )}
        <AssetSelectors
          control={control}
          errors={errors}
          transponderType={transponderType}
          waveformOptions={waveformOptions}
          filteredModcodOptions={filteredModcodOptions}
          satelliteOptions={satelliteOptions}
          earthStationOptions={earthStationOptions}
          modcodLoading={modcodLoading}
          satelliteLoading={satelliteLoading}
          earthStationLoading={earthStationLoading}
        />
        <Group grow>
          <Controller
            name="runtime.rolloff"
            control={control}
            render={({ field }) => (
              <NumberInput label="Rolloff (alpha)" min={0} max={1} step={0.01}
                value={field.value ?? undefined} onChange={(value) => field.onChange(value ?? undefined)}
                error={errors.runtime?.rolloff?.message} />
            )}
          />
        </Group>
        {transponderType === transponderTypeSchema.enum.TRANSPARENT && (
          <Group grow>
            <Controller
              name="runtime.bandwidth_hz"
              control={control}
              render={({ field }) => (
                <NumberInput label="Channel bandwidth (Hz)" description="Required" withAsterisk thousandSeparator=","
                  value={field.value ?? undefined} onChange={(value) => field.onChange(value ?? undefined)}
                  error={errors.runtime?.bandwidth_hz?.message} />
              )}
            />
          </Group>
        )}
        <LinkSection control={control} errors={errors} direction="uplink"
          transponderType={transponderType} filteredModcodOptions={filteredModcodOptions} modcodLoading={modcodLoading} />
        <LinkSection control={control} errors={errors} direction="downlink"
          transponderType={transponderType} filteredModcodOptions={filteredModcodOptions} modcodLoading={modcodLoading} />
        <InterferenceSection control={control} errors={errors} direction="uplink"
          mitigationDb={uplinkMitigationDb} onMitigationChange={setUplinkMitigationDb} />
        <InterferenceSection control={control} errors={errors} direction="downlink"
          mitigationDb={downlinkMitigationDb} onMitigationChange={setDownlinkMitigationDb} />
        <IntermodulationSection control={control} errors={errors} />
        <Group mt="md">
          <Button type="submit" loading={loading}>Calculate</Button>
        </Group>
      </Stack>
    </form>
  );
}
