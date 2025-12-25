# API Reference

Base URL:
- API: `/api/v1`
- Health: `/health`

Authentication:
- None (no auth middleware is implemented).

All requests and responses are JSON.

## Health
`GET /health`

Response:
```json
{"status": "ok", "app_env": "development"}
```

## Link Budget Calculation
`POST /api/v1/link-budgets/calculate`

Request fields (top-level):
- `waveform_strategy` (required): `"DVB_S2X"` only.
- `transponder_type` (required): `"TRANSPARENT"` or `"REGENERATIVE"`.
- `modcod_table_id` (UUID): required for `TRANSPARENT`.
- `uplink_modcod_table_id`, `downlink_modcod_table_id` (UUID): required for `REGENERATIVE`.
- `satellite_id` (UUID, required).
- `earth_station_tx_id` (UUID, required for uplink EIRP).
- `earth_station_rx_id` (UUID, required for downlink G/T).
- `runtime` (required): see below.
- `overrides` (optional): currently only `overrides.satellite.eirp_dbw` and `overrides.satellite.gt_db_per_k`.
- `include_snapshot` (optional, default `false`): include `payload_snapshot` in the response.

`runtime` fields:
- `sat_longitude_deg` (float): required if the satellite asset has no `longitude_deg`.
- `bandwidth_hz` (float): required for `TRANSPARENT`; forbidden for `REGENERATIVE`.
- `rolloff` (float, optional).
- `uplink` and `downlink` (required):
  - `frequency_hz` (float > 0).
  - `bandwidth_hz` (float > 0): required for `REGENERATIVE`; injected from `runtime.bandwidth_hz` for `TRANSPARENT`.
  - `ground_lat_deg`, `ground_lon_deg` (float).
  - `ground_alt_m` (float, optional).
  - `rain_rate_mm_per_hr` (float >= 0).
  - `temperature_k`, `pressure_hpa`, `water_vapor_density` (optional).
  - `elevation_deg` (optional): computed from GEO geometry if omitted.
  - `interference` (optional): `adjacent_sat_ci_db`, `cross_polar_ci_db`, `other_carrier_ci_db`,
    `applied`, `notes`.
- `intermodulation` (optional): `input_backoff_db`, `output_backoff_db`, `composite_carriers`,
  `saturation_power_dbw`, `reference_bandwidth_hz`, `applied`, `notes`.
  Only the downlink uses this impairment in the current implementation.

Response fields (summary):
- `schema_version`: `"1.1.0"`.
- `strategy`: `waveform_strategy`, `transponder_type`.
- `results`: `uplink`, `downlink`, and (for `TRANSPARENT`) `combined`.
- `combined_link_margin_db`, `combined_cn_db`, `combined_cn0_dbhz` (transparent only).
- `modcod_selected`: object for transparent or `{uplink, downlink}` for regenerative.
- `runtime_echo`: sanitized runtime with computed elevation and normalized bandwidth.
- `payload_snapshot`: included when `include_snapshot=true`.

Errors:
- `400`: invalid runtime, bandwidth rules, missing EIRP/G/T, or invalid ModCod entries.
- `404`: missing satellite/earth station/modcod table.
- `422`: validation errors (e.g., malformed UUIDs).

## Assets
### Satellites
- `POST /api/v1/assets/satellites`
- `GET /api/v1/assets/satellites`
- `PUT /api/v1/assets/satellites/{id}`
- `DELETE /api/v1/assets/satellites/{id}`

Fields:
- `name` (required, unique).
- `orbit_type` (default `"GEO"`), `longitude_deg`, `inclination_deg`.
- `transponder_bandwidth_mhz` (> 0), `eirp_dbw`, `gt_db_per_k`, `frequency_band`.
- `description`, `notes`.

### Earth Stations
- `POST /api/v1/assets/earth-stations`
- `GET /api/v1/assets/earth-stations`
- `PUT /api/v1/assets/earth-stations/{id}`
- `DELETE /api/v1/assets/earth-stations/{id}`

Fields:
- `name` (required, unique).
- `antenna_diameter_m` (> 0), `antenna_gain_tx_db`, `antenna_gain_rx_db`.
- `noise_temperature_k` (> 0), `eirp_dbw`, `tx_power_dbw`, `gt_db_per_k`.
- `polarization`, `description`, `notes`.

Delete endpoints return `400` when the asset is referenced by a scenario.

## ModCod Tables
- `POST /api/v1/assets/modcod-tables`
- `GET /api/v1/assets/modcod-tables` (optional `?waveform=...`)
- `POST /api/v1/assets/modcod-tables/{id}/publish`
- `DELETE /api/v1/assets/modcod-tables/{id}`

Table fields:
- `waveform`, `version` (unique per waveform), `description`.
- `entries` (array).

Entry fields:
- `id`, `modulation`, `code_rate` (required).
- `info_bits_per_symbol` (required, > 0).
- `required_cn0_dbhz` or `required_ebno_db` (at least one required).
- `rolloff`, `pilots` (optional).

Create returns `409` if `(waveform, version)` already exists.

## Scenarios
- `POST /api/v1/scenarios`
- `GET /api/v1/scenarios` (most recent 50)
- `GET /api/v1/scenarios/{id}`
- `PUT /api/v1/scenarios/{id}`
- `DELETE /api/v1/scenarios/{id}`

Fields:
- `name`, `description`.
- `waveform_strategy`, `transponder_type`.
- `modcod_table_id` (required).
- `satellite_id`, `earth_station_tx_id`, `earth_station_rx_id` (optional).
- `schema_version` (default `"1.1.0"`), `status` (`Draft`, `Saved`, `Archived`).
- `payload_snapshot` (required; see `docs/data-model.md`).
