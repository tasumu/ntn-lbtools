export interface SatelliteAsset {
  id: string;
  name: string;
  description?: string;
  orbit_type: string;
  longitude_deg?: number;
  inclination_deg?: number;
  transponder_bandwidth_mhz?: number;
  eirp_dbw?: number;
  gt_db_per_k?: number;
  frequency_band?: string;
  notes?: string;
}

export interface EarthStationAsset {
  id: string;
  name: string;
  description?: string;
  antenna_diameter_m?: number;
  antenna_gain_tx_db?: number;
  antenna_gain_rx_db?: number;
  noise_temperature_k?: number;
  eirp_dbw?: number;
  tx_power_dbw?: number;
  gt_db_per_k?: number;
  polarization?: string;
  notes?: string;
}

export interface ModcodTableAsset {
  id: string;
  waveform: string;
  version: string;
  description?: string;
  entries?: unknown[];
  published_at?: string;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  description?: string;
  waveform_strategy?: string;
  transponder_type?: string;
  satellite_id?: string;
  modcod_table_id?: string;
  earth_station_tx_id?: string;
  earth_station_rx_id?: string;
  payload_snapshot?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}
