import { z } from "zod";

export type SweepableParameter = {
  path: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  defaultStart: number;
  defaultEnd: number;
  defaultSteps: number;
};

export const SWEEPABLE_PARAMETERS: SweepableParameter[] = [
  {
    path: "runtime.uplink.rain_rate_mm_per_hr",
    label: "Uplink Rain Rate",
    unit: "mm/hr",
    min: 0,
    max: 200,
    defaultStart: 0,
    defaultEnd: 100,
    defaultSteps: 50,
  },
  {
    path: "runtime.downlink.rain_rate_mm_per_hr",
    label: "Downlink Rain Rate",
    unit: "mm/hr",
    min: 0,
    max: 200,
    defaultStart: 0,
    defaultEnd: 100,
    defaultSteps: 50,
  },
  {
    path: "runtime.uplink.frequency_hz",
    label: "Uplink Frequency",
    unit: "Hz",
    min: 1e6,
    max: 100e9,
    defaultStart: 10e9,
    defaultEnd: 50e9,
    defaultSteps: 40,
  },
  {
    path: "runtime.downlink.frequency_hz",
    label: "Downlink Frequency",
    unit: "Hz",
    min: 1e6,
    max: 100e9,
    defaultStart: 10e9,
    defaultEnd: 50e9,
    defaultSteps: 40,
  },
  {
    path: "runtime.bandwidth_hz",
    label: "Channel Bandwidth",
    unit: "Hz",
    min: 1e3,
    max: 1e9,
    defaultStart: 1e6,
    defaultEnd: 500e6,
    defaultSteps: 50,
  },
  {
    path: "runtime.uplink.elevation_deg",
    label: "Uplink Elevation",
    unit: "deg",
    min: 0,
    max: 90,
    defaultStart: 5,
    defaultEnd: 90,
    defaultSteps: 50,
  },
  {
    path: "runtime.downlink.elevation_deg",
    label: "Downlink Elevation",
    unit: "deg",
    min: 0,
    max: 90,
    defaultStart: 5,
    defaultEnd: 90,
    defaultSteps: 50,
  },
  {
    path: "runtime.uplink.ground_lat_deg",
    label: "Uplink Ground Latitude",
    unit: "deg",
    min: -90,
    max: 90,
    defaultStart: -60,
    defaultEnd: 60,
    defaultSteps: 50,
  },
  {
    path: "runtime.downlink.ground_lat_deg",
    label: "Downlink Ground Latitude",
    unit: "deg",
    min: -90,
    max: 90,
    defaultStart: -60,
    defaultEnd: 60,
    defaultSteps: 50,
  },
  {
    path: "runtime.sat_longitude_deg",
    label: "Satellite Longitude",
    unit: "deg",
    min: -180,
    max: 180,
    defaultStart: -180,
    defaultEnd: 180,
    defaultSteps: 50,
  },
  {
    path: "overrides.satellite.eirp_dbw",
    label: "Satellite EIRP",
    unit: "dBW",
    min: 0,
    max: 100,
    defaultStart: 30,
    defaultEnd: 70,
    defaultSteps: 40,
  },
  {
    path: "overrides.satellite.gt_db_per_k",
    label: "Satellite G/T",
    unit: "dB/K",
    min: -30,
    max: 50,
    defaultStart: -10,
    defaultEnd: 30,
    defaultSteps: 40,
  },
];

export const sweepConfigSchema = z.object({
  parameter_path: z.string().min(1, "Select a parameter"),
  start: z.number({ required_error: "Start value is required" }),
  end: z.number({ required_error: "End value is required" }),
  steps: z.number().int().min(2, "At least 2 steps").max(200, "Maximum 200 steps"),
});

export type SweepConfig = z.infer<typeof sweepConfigSchema>;

export type SweepPoint = {
  sweep_value: number;
  combined_link_margin_db: number | null;
  combined_cn_db: number | null;
  combined_cn0_dbhz: number | null;
  uplink_cn_db: number | null;
  uplink_rain_loss_db: number | null;
  uplink_link_margin_db: number | null;
  downlink_cn_db: number | null;
  downlink_rain_loss_db: number | null;
  downlink_link_margin_db: number | null;
  modcod_id: string | null;
  modcod_label: string | null;
  viable: boolean;
  warnings: string[];
};

export type SweepResponse = {
  sweep_parameter: string;
  sweep_label: string;
  threshold_db: number | null;
  points: SweepPoint[];
  crossover_value: number | null;
  strategy: {
    waveform_strategy: string;
    transponder_type: string;
  };
};

export const OUTPUT_METRICS = [
  { key: "combined_link_margin_db", label: "Combined Link Margin", unit: "dB" },
  { key: "uplink_cn_db", label: "Uplink C/N", unit: "dB" },
  { key: "downlink_cn_db", label: "Downlink C/N", unit: "dB" },
  { key: "combined_cn_db", label: "Combined C/N", unit: "dB" },
  { key: "uplink_rain_loss_db", label: "Uplink Rain Loss", unit: "dB" },
  { key: "downlink_rain_loss_db", label: "Downlink Rain Loss", unit: "dB" },
] as const;

export type OutputMetricKey = (typeof OUTPUT_METRICS)[number]["key"];
