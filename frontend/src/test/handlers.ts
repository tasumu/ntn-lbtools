import { http, HttpResponse } from "msw";

const API_BASE = "*/api/v1";

export const mockSatellite = {
  id: "sat-001",
  name: "Test Satellite",
  description: "A test GEO satellite",
  orbit_type: "GEO",
  longitude_deg: 128.0,
  inclination_deg: 0,
  transponder_bandwidth_mhz: 36,
  eirp_dbw: 51,
  gt_db_per_k: 2.5,
  frequency_band: "Ku",
};

export const mockEarthStation = {
  id: "es-001",
  name: "Test Earth Station",
  description: "A test earth station",
  antenna_diameter_m: 3.7,
  antenna_gain_tx_db: 45,
  antenna_gain_rx_db: 44,
  noise_temperature_k: 120,
  eirp_dbw: 65,
  tx_power_dbw: 20,
  gt_db_per_k: 23.2,
  polarization: "Circular",
};

export const mockModcodTable = {
  id: "mc-001",
  waveform: "DVB_S2X",
  version: "1.0.0",
  description: "Test ModCod table",
  entries: [
    {
      id: "qpsk-1/4",
      modulation: "QPSK",
      code_rate: "1/4",
      required_cn0_dbhz: 65,
      info_bits_per_symbol: 0.5,
    },
  ],
};

export const mockScenario = {
  id: "sc-001",
  name: "Test Scenario",
  description: "A test scenario",
  waveform_strategy: "DVB_S2X",
  transponder_type: "TRANSPARENT",
  satellite_id: "sat-001",
  modcod_table_id: "mc-001",
  earth_station_tx_id: "es-001",
  earth_station_rx_id: "es-001",
  payload_snapshot: {},
  created_at: "2026-01-01T00:00:00Z",
};

const makeDirectionResult = (direction: string) => ({
  direction,
  fspl_db: 205.5,
  rain_loss_db: 1.2,
  gas_loss_db: 0.3,
  cloud_loss_db: 0.1,
  atm_loss_db: 1.6,
  antenna_pointing_loss_db: 0.5,
  gt_db_per_k: 23.2,
  cn_db: 12.5,
  cn0_dbhz: 88.1,
  link_margin_db: 3.5,
  clean_link_margin_db: 4.0,
  clean_cn_db: 13.0,
  modcod_selected: "QPSK 1/4",
  eirp_dbw: 51,
  bandwidth_hz: 36e6,
  cni_db: 11.8,
  cni0_dbhz: 87.4,
  c_im_db: 25.0,
  interference_applied: false,
  intermod_applied: false,
  warnings: [],
});

export const mockCalculationResponse = {
  schema_version: "1.1.0",
  strategy: {
    waveform_strategy: "DVB_S2X",
    transponder_type: "TRANSPARENT",
  },
  results: {
    uplink: makeDirectionResult("uplink"),
    downlink: makeDirectionResult("downlink"),
    combined: {
      cn_db: 9.5,
      cn0_dbhz: 85.1,
      cni_db: 9.0,
      cni0_dbhz: 84.6,
      c_im_db: 22.0,
      link_margin_db: 2.0,
      clean_link_margin_db: 2.5,
      clean_cn_db: 10.0,
    },
  },
  combined_link_margin_db: 2.0,
  combined_cn_db: 9.5,
  combined_cn0_dbhz: 85.1,
  modcod_selected: {
    id: "qpsk-1/4",
    modulation: "QPSK",
    code_rate: "1/4",
    required_cn0_dbhz: 65,
    info_bits_per_symbol: 0.5,
  },
  runtime_echo: {
    bandwidth_hz: 36e6,
    uplink: {
      frequency_hz: 14.25e9,
      bandwidth_hz: 36e6,
      rain_rate_mm_per_hr: 10,
      ground_lat_deg: 35,
      ground_lon_deg: 139,
      elevation_deg: 48.5,
    },
    downlink: {
      frequency_hz: 12e9,
      bandwidth_hz: 36e6,
      rain_rate_mm_per_hr: 10,
      ground_lat_deg: 35,
      ground_lon_deg: 139,
      elevation_deg: 48.5,
    },
  },
  payload_snapshot: null,
};

function paginate<T>(items: T[]) {
  return { items, total: items.length, limit: 20, offset: 0 };
}

export const handlers = [
  http.get(`${API_BASE}/assets/satellites`, () =>
    HttpResponse.json(paginate([mockSatellite])),
  ),
  http.post(`${API_BASE}/assets/satellites`, () =>
    HttpResponse.json(mockSatellite, { status: 201 }),
  ),
  http.put(`${API_BASE}/assets/satellites/:id`, () =>
    HttpResponse.json(mockSatellite),
  ),
  http.delete(`${API_BASE}/assets/satellites/:id`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),

  http.get(`${API_BASE}/assets/earth-stations`, () =>
    HttpResponse.json(paginate([mockEarthStation])),
  ),
  http.post(`${API_BASE}/assets/earth-stations`, () =>
    HttpResponse.json(mockEarthStation, { status: 201 }),
  ),
  http.put(`${API_BASE}/assets/earth-stations/:id`, () =>
    HttpResponse.json(mockEarthStation),
  ),
  http.delete(`${API_BASE}/assets/earth-stations/:id`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),

  http.get(`${API_BASE}/assets/modcod-tables`, () =>
    HttpResponse.json(paginate([mockModcodTable])),
  ),
  http.post(`${API_BASE}/assets/modcod-tables`, () =>
    HttpResponse.json(mockModcodTable, { status: 201 }),
  ),
  http.delete(`${API_BASE}/assets/modcod-tables/:id`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),

  http.get(`${API_BASE}/scenarios`, () =>
    HttpResponse.json(paginate([mockScenario])),
  ),
  http.post(`${API_BASE}/scenarios`, () =>
    HttpResponse.json(mockScenario, { status: 201 }),
  ),
  http.get(`${API_BASE}/scenarios/:id`, () => HttpResponse.json(mockScenario)),
  http.delete(`${API_BASE}/scenarios/:id`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),

  http.post(`${API_BASE}/link-budgets/calculate`, () =>
    HttpResponse.json(mockCalculationResponse),
  ),
];
