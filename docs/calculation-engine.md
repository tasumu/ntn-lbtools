# Calculation Engine

This document describes how link budgets are computed in the current backend implementation.

## Pipeline Overview
1. Resolve satellite and earth station assets by ID; apply `overrides.satellite` if present.
2. Validate ModCod table rules and bandwidth rules based on transponder type.
3. Build runtime parameters; compute elevation if omitted.
4. Compute propagation losses and baseline C/N0 and C/N per direction.
5. Apply interference and intermodulation impairments.
6. Select ModCod(s) and compute link margins.
7. Build response and optional payload snapshot.

## Runtime Inputs and Derived Values
- `sat_longitude_deg` is required unless the satellite asset has `longitude_deg`.
- For `TRANSPARENT`, `runtime.bandwidth_hz` is required and used for both uplink/downlink.
- For `REGENERATIVE`, `runtime.bandwidth_hz` is forbidden and each direction must specify `bandwidth_hz`.
- `elevation_deg` is computed if omitted using GEO geometry (see below).

Asset-derived defaults:
- Uplink EIRP:
  - `earth_station_tx.eirp_dbw` is used when available.
  - If missing, the backend uses `tx_power_dbw + antenna_gain_tx_db`.
  - If still missing, the request is rejected.
- Downlink G/T:
  - `earth_station_rx.gt_db_per_k` is used when available.
  - If missing, the backend uses `antenna_gain_rx_db - 10*log10(noise_temperature_k)`.
  - If still missing, the request is rejected.
- Satellite EIRP and G/T must be present on the asset or supplied via `overrides.satellite`.

Default environmental values:
- Uplink temperature defaults to 290 K when missing.
- Downlink temperature defaults to 120 K when missing.
- Water vapor density defaults to 7.5 g/m3.
- Pressure defaults to 1013.25 hPa.

## Geometry and Slant Range
If `elevation_deg` is missing, it is computed with a GEO approximation:
- Uses Earth radius and GEO altitude (35786 km).
- `elevation = atan((cos(psi) - Re/Rs) / sin(psi))`, where `psi` is the central angle.
If the computed elevation is below the horizon (negative), the request is rejected.

Slant range is estimated with:
- Skyfield geometry when available.
- A spherical fallback when Skyfield is unavailable.

## Propagation Losses
Per direction, the backend computes:
- FSPL: `20*log10(d_m) + 20*log10(f_hz) + 20*log10(4*pi/c)`.
- Rain loss: ITU-R P.618.
- Gaseous loss: ITU-R P.676.
- Cloud loss: ITU-R P.840.
- Pointing loss: fixed heuristic (0.1 dB if elevation > 20 deg, else 0.5 dB).

Then:
- `C/N0 = EIRP + G/T - total_loss - k`, where `k = -228.6 dBW/K/Hz`.
- `C/N = C/N0 - 10*log10(bandwidth_hz)`.

## Interference and Intermodulation
Interference:
- Uses `adjacent_sat_ci_db`, `cross_polar_ci_db`, `other_carrier_ci_db`.
- Aggregates C/I by summing inverse linear terms: `1/(C/I)` for each value.
- Produces `cni_db` and degrades `cn_db` and `cn0_dbhz`.
- Warnings are emitted when interference is applied.

Intermodulation:
- Applied only to downlink.
- Uses `output_backoff_db` or `input_backoff_db` plus `composite_carriers`.
- Heuristic: `C/IM = max(0, 2*backoff + 7 - 10*log10(carriers))`.
- Degrades `cn_db` and emits warnings.
- `saturation_power_dbw` and `reference_bandwidth_hz` are currently unused.

## ModCod Selection
Waveform strategy:
- `DVB_S2X` only.
- Each ModCod entry must include `info_bits_per_symbol` and at least one threshold.
- Effective spectral efficiency: `info_bits_per_symbol / (1 + rolloff)`.
- Default rolloff is `0.2` if not supplied in runtime or entry.

Selection logic:
- Picks the highest ModCod meeting the threshold based on `C/N0` and bandwidth.
- `required_cn0_dbhz` is preferred; `required_ebno_db` is used if C/N0 is missing.
- Link margin is derived from Eb/N0 when bitrate is available.

## Transparent vs Regenerative
Transparent:
- Uses one ModCod table for both directions.
- Combines uplink/downlink C/N via harmonic sum.
- Selects a single ModCod based on combined C/N0 and shared bandwidth.
- `combined_link_margin_db` and combined metrics are populated.

Regenerative:
- Uplink/downlink ModCods are selected independently.
- Combined link margin is the minimum of the two margins.
- Response omits combined C/N metrics.

## Limitations
- Geometry assumes GEO; non-GEO orbit types are not modeled.
- Pointing loss and intermodulation are simplified heuristics.
- Interference is modeled only through user-supplied C/I inputs.
- Only DVB-S2X waveform is supported at this time.
