# Frontend App Behavior

The frontend lives in `frontend/` and is a React 18 + Vite app with Mantine UI.

## Routes
- `/`: Link budget calculator.
- `/assets`: Asset and ModCod management.
- `/sweep`: Parameter sweep analysis.
- `/compare`: Side-by-side scenario comparison.

## API Base URL
The client uses `VITE_API_BASE_URL` from `frontend/.env`. If the app is served over HTTPS
and the base URL is HTTP, it falls back to same-origin `/api/v1` to avoid mixed-content errors.

## Calculator Flow
- Loads satellites, earth stations, ModCod tables, and scenarios from the backend.
- Submits `POST /api/v1/link-budgets/calculate` with `include_snapshot=true`.
- Clears `elevation_deg` when loading scenarios so the backend recomputes it from geometry.
- Displays uplink/downlink metrics, combined metrics, and warnings.
- Shows a Go/No-Go indicator and throughput display with unit selectors.
- Shows a waterfall view and a metrics chart for losses and C/N.
- Allows saving the result as a scenario (`POST /api/v1/scenarios`).
- Supports PDF and CSV export of results.

Form behavior:
- Transparent transponders use a shared `bandwidth_hz`.
- Regenerative transponders use per-direction bandwidth fields.
- Interference mitigation offsets the C/I values before submission.
- Intermodulation is sent for the downlink impairment model.
- Field-level tooltips show typical value ranges for satellite parameters.
- Earth station location fields (lat/lon/alt) are available for ground station coordinates.
- LEO/HAPS satellite forms include altitude, TLE data, and latitude fields.

## Parameter Sweep
- Sweeps a single parameter (e.g., rain rate, frequency, elevation) across a range.
- Displays results as a chart with margin threshold overlay.
- Shows crossover point where margin crosses the threshold.

## Scenario Comparison
- Select two saved scenarios for side-by-side comparison.
- Parameter diff table highlights differences between scenario inputs.
- Result comparison table shows metric deltas.

## Assets and ModCod Management
Assets page provides CRUD for:
- Satellites (GEO, LEO, HAPS orbit types)
- Earth stations (with optional location fields)
- ModCod tables (with name field, DVB-S2X preset loading, saved as new versions)

Deleting assets or ModCod tables will fail if they are referenced by scenarios.
Scenarios can be duplicated via `POST /scenarios/{id}/duplicate`.

## UI Features
- Dark/light mode toggle with OS preference detection.
- Delete confirmation modals for destructive operations.
- Frequency input component with unit selector (Hz, kHz, MHz, GHz).
- Asset summary cards showing selected satellite/earth station details.
- Code splitting for route-based lazy loading.
