# ntn-lbtools Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-08

## Active Technologies
- Python 3.12 (uv-managed) + fastmcp, httpx, pydantic (002-mcp-server)
- N/A (stateless MCP gateway) (002-mcp-server)
- Python 3.12 (uv-managed) backend; TypeScript/React 18 (Vite) frontend + FastAPI, Pydantic v2, numpy/scipy, itur, skyfield, SQLAlchemy 2.0 async + asyncpg, React Query, react-hook-form, zod, Mantine UI, recharts (003-interference-intermod)
- PostgreSQL via SQLAlchemy/asyncpg for scenario persistence (003-interference-intermod)

- Backend Python 3.12+ (uv-managed); Frontend TypeScript/React 18 (Vite). + FastAPI, Pydantic v2, numpy/scipy, `itur` for propagation, `skyfield` for geometry, SQLAlchemy 2.0 async + asyncpg with Alembic, React Query, react-hook-form, zod, recharts, Mantine UI. (001-link-budget-calc)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Backend Python 3.12+ (uv-managed); Frontend TypeScript/React 18 (Vite).: Follow standard conventions

## Recent Changes
- 003-interference-intermod: Added Python 3.12 (uv-managed) backend; TypeScript/React 18 (Vite) frontend + FastAPI, Pydantic v2, numpy/scipy, itur, skyfield, SQLAlchemy 2.0 async + asyncpg, React Query, react-hook-form, zod, Mantine UI, recharts
- 002-mcp-server: Added Python 3.12 (uv-managed) + fastmcp, httpx, pydantic

- 001-link-budget-calc: Added Backend Python 3.12+ (uv-managed); Frontend TypeScript/React 18 (Vite). + FastAPI, Pydantic v2, numpy/scipy, `itur` for propagation, `skyfield` for geometry, SQLAlchemy 2.0 async + asyncpg with Alembic, React Query, react-hook-form, zod, recharts, Mantine UI.

<!-- MANUAL ADDITIONS START -->
## Documentation Source of Truth
- `docs/` is the master specification for current behavior.

## Language
- Project deliverables in this repo are written in English.
<!-- MANUAL ADDITIONS END -->
