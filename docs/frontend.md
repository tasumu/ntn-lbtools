# Frontend App Behavior

The frontend lives in `frontend/` and is a React 18 + Vite app with Mantine UI.

## Routes
- `/`: Link budget calculator.
- `/assets`: Asset and ModCod management.

## API Base URL
The client uses `VITE_API_BASE_URL` from `frontend/.env`. If the app is served over HTTPS
and the base URL is HTTP, it falls back to same-origin `/api/v1` to avoid mixed-content errors.

## Calculator Flow
- Loads satellites, earth stations, ModCod tables, and scenarios from the backend.
- Submits `POST /api/v1/link-budgets/calculate` with `include_snapshot=true`.
- Clears `elevation_deg` when loading scenarios so the backend recomputes it from geometry.
- Displays uplink/downlink metrics, combined metrics, and warnings.
- Shows a waterfall view and a metrics chart for losses and C/N.
- Allows saving the result as a scenario (`POST /api/v1/scenarios`).

Form behavior:
- Transparent transponders use a shared `bandwidth_hz`.
- Regenerative transponders use per-direction bandwidth fields.
- Interference mitigation offsets the C/I values before submission.
- Intermodulation is sent for the downlink impairment model.

## Assets and ModCod Management
Assets page provides CRUD for:
- Satellites
- Earth stations
- ModCod tables (saved as new versions, not updated in place)

Deleting assets or ModCod tables will fail if they are referenced by scenarios.
