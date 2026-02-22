# NTN Link Budget Tools

Satellite link budget calculator supporting GEO, LEO, and HAPS orbits, with a FastAPI backend, React (Vite) frontend, and an optional MCP server.

## What It Does
- Manage satellites, earth stations, and ModCod tables.
- Compute link budgets with ITU-R propagation models and simplified interference/intermod handling.
- Select ModCods and compute link margins for transparent or regenerative transponders.
- Save calculation snapshots as scenarios and reload them in the UI.
- Expose the backend API through FastMCP for tool-driven workflows.

## Repo Layout
- `backend/`: FastAPI app, calculation core, persistence, Alembic migrations.
- `frontend/`: React 18 + Vite app with Mantine UI, React Query, RHF, zod.
- `mcp-server/`: FastMCP wrapper around the backend OpenAPI.
- `docs/`: Implementation-aligned specifications and references.
- `specs/`: Historical planning docs (may not match current code).

## Quick Start
Prereqs: Python 3.12 + `uv`, Node.js 20 + `pnpm`, PostgreSQL.

Backend:
```bash
cd backend
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn src.api.main:app --reload
```
Migrations seed a sample ModCod table, assets, and a scenario.
If you already have a database at the latest schema after the migration squash,
align Alembic once with:
```bash
uv run alembic stamp 0001_initial
```

Frontend:
```bash
cd frontend
pnpm install
pnpm dev
```

MCP server (optional):
```bash
cd mcp-server
uv sync --extra dev
uv run -m src.main
```

Docker Compose (optional):
```bash
docker volume create backend_pgdata
docker compose up -d
docker compose run --rm migrate
```
If you see root-owned files in bind mounts, set your UID/GID for compose, for example:
```bash
UID="$(id -u)" GID="$(id -g)" docker compose up -d
```
You can also pin `UID`/`GID` in the repo `.env` to keep compose consistent across runs.

## Documentation
See `docs/README.md` for implementation-aligned specs covering:
- API contracts and payloads
- Calculation engine behavior and limitations
- Data model and scenario snapshot format
- MCP server configuration and prompts

## Known Limitations
- LEO/HAPS TLE propagation accuracy degrades weeks after TLE epoch.
- Interference and intermodulation are simplified (aggregate C/I and backoff heuristic).
- Pointing loss is a fixed heuristic (0.1 dB above 20 deg, 0.5 dB otherwise).

## Security Notes
- The default database credentials in `docker-compose.yml` are for **development only**.
- **DO NOT use these credentials in production.** Set strong passwords via environment variables.
- Configure `CORS_ORIGINS` to your production domain(s) before deployment.
- Copy `.env.example` files to `.env` and customize for your environment.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
