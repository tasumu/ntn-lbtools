import { z } from "zod";

export const optionalNumber = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.number().optional(),
);

export const waveformStrategySchema = z.enum(["DVB_S2X"]);
export const transponderTypeSchema = z.enum(["TRANSPARENT", "REGENERATIVE"]);

const interferenceSchema = z.object({
  adjacent_sat_ci_db: z.number().optional().nullable(),
  cross_polar_ci_db: z.number().optional().nullable(),
  other_carrier_ci_db: z.number().optional().nullable(),
  applied: z.boolean().default(false),
  notes: z
    .preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.string().optional(),
    )
    .optional()
    .nullable(),
});

const intermodulationSchema = z.object({
  input_backoff_db: z.number().min(0).optional().nullable(),
  output_backoff_db: z.number().min(0).optional().nullable(),
  saturation_power_dbw: z.number().optional().nullable(),
  composite_carriers: z.number().int().min(1).optional().nullable(),
  reference_bandwidth_hz: z.number().positive().optional().nullable(),
  applied: z.boolean().default(false),
  notes: z
    .preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.string().optional(),
    )
    .optional()
    .nullable(),
});

const directionRuntimeParametersSchema = z.object({
  frequency_hz: z.number().positive(),
  bandwidth_hz: z.number().positive().optional().nullable(),
  elevation_deg: z.number().min(-90).max(90).optional().nullable(),
  rain_rate_mm_per_hr: z.number().min(0),
  temperature_k: z.number().positive().optional().default(290),
  pressure_hpa: z.number().positive().optional(),
  water_vapor_density: z.number().min(0).optional(),
  ground_lat_deg: z.number(),
  ground_lon_deg: z.number(),
  ground_alt_m: z.number().optional().nullable(),
  interference: interferenceSchema.optional().nullable(),
});

export const runtimeParametersSchema = z.object({
  sat_longitude_deg: z.number().min(-180).max(180).optional().nullable(),
  bandwidth_hz: z.number().positive().optional().nullable(),
  rolloff: z.number().min(0).optional().nullable(),
  uplink: directionRuntimeParametersSchema,
  downlink: directionRuntimeParametersSchema,
  intermodulation: intermodulationSchema.optional().nullable(),
});

const satelliteOverridesSchema = z
  .object({
    eirp_dbw: z.number().optional().nullable(),
    gt_db_per_k: z.number().optional().nullable(),
  })
  .optional();

const calculationOverridesSchema = z
  .object({
    satellite: satelliteOverridesSchema,
  })
  .optional()
  .nullable();

const calculationResultSchema = z.object({
  direction: z.string(),
  fspl_db: z.number(),
  rain_loss_db: z.number(),
  gas_loss_db: z.number(),
  cloud_loss_db: z.number(),
  atm_loss_db: z.number(),
  antenna_pointing_loss_db: z.number(),
  gt_db_per_k: z.number(),
  cn_db: z.number(),
  cn0_dbhz: z.number(),
  link_margin_db: z.number(),
  clean_link_margin_db: z.number().nullable().optional(),
  clean_cn_db: z.number().nullable().optional(),
  modcod_selected: z.string().nullable().optional(),
  eirp_dbw: z.number().nullable().optional(),
  bandwidth_hz: z.number().nullable().optional(),
  cni_db: z.number().nullable().optional(),
  cni0_dbhz: z.number().nullable().optional(),
  c_im_db: z.number().nullable().optional(),
  interference_applied: z.boolean().optional(),
  intermod_applied: z.boolean().optional(),
  warnings: z.array(z.string()).optional().nullable(),
});

const combinedCalculationResultSchema = z.object({
  cn_db: z.number(),
  cn0_dbhz: z.number(),
  cni_db: z.number().nullable().optional(),
  cni0_dbhz: z.number().nullable().optional(),
  c_im_db: z.number().nullable().optional(),
  link_margin_db: z.number().nullable().optional(),
  clean_link_margin_db: z.number().nullable().optional(),
  clean_cn_db: z.number().nullable().optional(),
});

const calculationResultsSchema = z.object({
  uplink: calculationResultSchema,
  downlink: calculationResultSchema,
  combined: combinedCalculationResultSchema.optional(),
});

const modcodEntrySchema = z.object({
  id: z.string(),
  modulation: z.string(),
  code_rate: z.string(),
  required_ebno_db: z.number().optional(),
  required_cn0_dbhz: z.number().optional(),
  info_bits_per_symbol: z.number().positive(),
  rolloff: z.number().optional(),
  pilots: z.boolean().optional(),
});

const satelliteSnapshotSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  orbit_type: z.string().optional().nullable(),
  longitude_deg: z.number().optional().nullable(),
  inclination_deg: z.number().optional().nullable(),
  transponder_bandwidth_mhz: z.number().optional().nullable(),
  eirp_dbw: z.number().optional().nullable(),
  gt_db_per_k: z.number().optional().nullable(),
  frequency_band: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const earthStationSnapshotSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  antenna_diameter_m: z.number().optional().nullable(),
  antenna_gain_tx_db: z.number().optional().nullable(),
  antenna_gain_rx_db: z.number().optional().nullable(),
  noise_temperature_k: z.number().optional().nullable(),
  eirp_dbw: z.number().optional().nullable(),
  tx_power_dbw: z.number().optional().nullable(),
  gt_db_per_k: z.number().optional().nullable(),
  polarization: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const entitySnapshotSchema = z.object({
  satellite: satelliteSnapshotSchema.optional().nullable(),
  earth_station_tx: earthStationSnapshotSchema.optional().nullable(),
  earth_station_rx: earthStationSnapshotSchema.optional().nullable(),
});

const staticSnapshotSchema = z.object({
  modcod_table_id: z.string().uuid().optional().nullable(),
  modcod_table_version: z.string().optional().nullable(),
  modcod_entries: z.array(modcodEntrySchema).optional().nullable(),
  uplink_modcod_table_id: z.string().uuid().optional().nullable(),
  uplink_modcod_table_version: z.string().optional().nullable(),
  uplink_modcod_entries: z.array(modcodEntrySchema).optional().nullable(),
  downlink_modcod_table_id: z.string().uuid().optional().nullable(),
  downlink_modcod_table_version: z.string().optional().nullable(),
  downlink_modcod_entries: z.array(modcodEntrySchema).optional().nullable(),
  itu_constants: z.record(z.any()).default({}),
});

const strategySnapshotSchema = z.object({
  waveform_strategy: waveformStrategySchema,
  transponder_type: transponderTypeSchema,
});

const scenarioMetadataSchema = z.object({
  schema_version: z.string().default("1.1.0"),
  computed_at: z.string().datetime().optional().nullable(),
  modcod_table_id: z.string().uuid().optional().nullable(),
  modcod_table_version: z.string().optional().nullable(),
  uplink_modcod_table_id: z.string().uuid().optional().nullable(),
  downlink_modcod_table_id: z.string().uuid().optional().nullable(),
  satellite_id: z.string().uuid().optional().nullable(),
  earth_station_tx_id: z.string().uuid().optional().nullable(),
  earth_station_rx_id: z.string().uuid().optional().nullable(),
});

export const scenarioPayloadSchema = z
  .object({
    static: staticSnapshotSchema.default({}),
    entity: entitySnapshotSchema.default({}),
    runtime: runtimeParametersSchema,
    strategy: strategySnapshotSchema,
    metadata: scenarioMetadataSchema.default({}),
    overrides: calculationOverridesSchema,
  })
  .strict();

const cleanStringId = (value: unknown) =>
  value === null || value === "" ? undefined : value;

const calculationRequestBaseSchema = z.object({
  waveform_strategy: z.preprocess(
    (v) => (v === null ? undefined : v),
    waveformStrategySchema,
  ),
  transponder_type: z.preprocess(
    (v) => (v === null ? undefined : v),
    transponderTypeSchema,
  ),
  modcod_table_id: z.preprocess(cleanStringId, z.string().uuid().optional()),
  uplink_modcod_table_id: z.preprocess(
    cleanStringId,
    z.string().uuid().optional(),
  ),
  downlink_modcod_table_id: z.preprocess(
    cleanStringId,
    z.string().uuid().optional(),
  ),
  satellite_id: z.preprocess(cleanStringId, z.string().uuid()),
  earth_station_tx_id: z.preprocess(
    cleanStringId,
    z.string().uuid().optional(),
  ),
  earth_station_rx_id: z.preprocess(
    cleanStringId,
    z.string().uuid().optional(),
  ),
  runtime: runtimeParametersSchema,
  overrides: calculationOverridesSchema,
  include_snapshot: z.boolean().optional(),
});

const addCalcRequestRules = <T extends typeof calculationRequestBaseSchema>(
  schema: T,
) =>
  schema.superRefine((data, ctx) => {
    if (data.transponder_type === "TRANSPARENT") {
      if (!data.modcod_table_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ModCod table is required",
          path: ["modcod_table_id"],
        });
      }
      if (!data.runtime?.bandwidth_hz) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Channel bandwidth is required",
          path: ["runtime", "bandwidth_hz"],
        });
      }
    } else {
      if (!data.uplink_modcod_table_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Uplink ModCod table is required",
          path: ["uplink_modcod_table_id"],
        });
      }
      if (!data.downlink_modcod_table_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Downlink ModCod table is required",
          path: ["downlink_modcod_table_id"],
        });
      }
      if (!data.runtime?.uplink?.bandwidth_hz) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Uplink bandwidth is required",
          path: ["runtime", "uplink", "bandwidth_hz"],
        });
      }
      if (!data.runtime?.downlink?.bandwidth_hz) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Downlink bandwidth is required",
          path: ["runtime", "downlink", "bandwidth_hz"],
        });
      }
    }
  });

export const calculationRequestSchema = addCalcRequestRules(
  calculationRequestBaseSchema,
);

const selectedModcodSchema = z.object({
  id: z.string(),
  modulation: z.string().optional().nullable(),
  code_rate: z.string().optional().nullable(),
  required_ebno_db: z.number().optional().nullable(),
  required_cn0_dbhz: z.number().optional().nullable(),
  info_bits_per_symbol: z.number().optional().nullable(),
  effective_spectral_efficiency: z.number().optional().nullable(),
  rolloff: z.number().optional().nullable(),
  pilots: z.boolean().optional().nullable(),
});

const selectedModcodByDirectionSchema = z.object({
  uplink: selectedModcodSchema.nullable().optional(),
  downlink: selectedModcodSchema.nullable().optional(),
});

export const calculationResponseSchema = z.object({
  schema_version: z.string(),
  strategy: strategySnapshotSchema,
  results: calculationResultsSchema,
  combined_link_margin_db: z.number().nullable().optional(),
  combined_cn_db: z.number().nullable().optional(),
  combined_cn0_dbhz: z.number().nullable().optional(),
  modcod_selected: z
    .union([selectedModcodSchema, selectedModcodByDirectionSchema])
    .nullable(),
  runtime_echo: runtimeParametersSchema,
  payload_snapshot: scenarioPayloadSchema.optional().nullable(),
});

export type CalculationRequest = z.infer<typeof calculationRequestSchema>;
export type CalculationResponse = z.infer<typeof calculationResponseSchema>;
export type ScenarioPayload = z.infer<typeof scenarioPayloadSchema>;
