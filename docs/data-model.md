# Data Model

This document captures the current database schema and the scenario snapshot structure.

## Database Tables
### Satellites (`satellites`)
- `id` (UUID, PK)
- `name` (unique, required)
- `description`
- `orbit_type` (required)
- `longitude_deg` (range -180..180)
- `inclination_deg`
- `transponder_bandwidth_mhz` (> 0)
- `eirp_dbw`
- `gt_db_per_k`
- `frequency_band`
- `notes`
- `created_at`, `updated_at`

### Earth Stations (`earth_stations`)
- `id` (UUID, PK)
- `name` (unique, required)
- `description`
- `antenna_diameter_m` (> 0)
- `antenna_gain_tx_db`
- `antenna_gain_rx_db`
- `noise_temperature_k` (> 0)
- `eirp_dbw`
- `tx_power_dbw`
- `gt_db_per_k`
- `polarization`
- `notes`
- `created_at`, `updated_at`

Location (lat/lon/alt) is not stored on earth stations; it is supplied at runtime.

### ModCod Tables (`modcod_tables`)
- `id` (UUID, PK)
- `waveform` (required)
- `version` (required, unique per waveform)
- `description`
- `entries` (JSON array)
- `published_at`
- `created_at`

### Scenarios (`scenarios`)
- `id` (UUID, PK)
- `name` (required)
- `description`
- `waveform_strategy` (required)
- `transponder_type` (required)
- `modcod_table_id` (required, FK)
- `satellite_id` (optional, FK)
- `earth_station_tx_id` (optional, FK)
- `earth_station_rx_id` (optional, FK)
- `schema_version` (default `1.1.0`)
- `status` (`Draft`, `Saved`, `Archived`)
- `payload_snapshot` (JSONB)
- `created_at`, `updated_at`

Scenarios are listed in descending `created_at` order (most recent 50).
For regenerative links, per-direction ModCod IDs live inside `payload_snapshot.static`.

## Seed Data (Migrations)
Migrations insert:
- A sample ModCod table (`DVB_S2X`, version `sample-1.0.0`).
- Sample satellite and earth station assets.
- A sample scenario that references those assets and the sample ModCod table.

## Scenario `payload_snapshot`
The snapshot stores the calculation inputs and resolved assets for replay.

Top-level keys:
- `static`: ModCod table IDs and entries used at calculation time.
- `entity`: snapshots of satellite, earth_station_tx, earth_station_rx.
- `runtime`: normalized runtime parameters (including computed elevation).
- `strategy`: waveform strategy and transponder type.
- `metadata`: schema version, computation timestamp, and asset IDs.
- `overrides`: currently supports satellite overrides only.

`static` fields (examples):
- `modcod_table_id`, `modcod_table_version`, `modcod_entries`
- `uplink_modcod_table_id`, `uplink_modcod_table_version`, `uplink_modcod_entries`
- `downlink_modcod_table_id`, `downlink_modcod_table_version`, `downlink_modcod_entries`
- `itu_constants` (currently empty)

`runtime` fields:
- `sat_longitude_deg`, `bandwidth_hz` (transparent only), `rolloff`
- `uplink`, `downlink` each include frequency, bandwidth, elevation, rain rate,
  temperature, pressure, water vapor, ground lat/lon/alt, and interference
- `intermodulation`

The backend backfills older snapshots by:
- Normalizing ModCod entry fields to the supported subset.
- Ensuring `interference` and ground coordinates exist in runtime.
- Stripping unsupported overrides.
