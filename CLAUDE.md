# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NTN Link Budget Tools - A GEO satellite link budget calculator with FastAPI backend, React frontend, and FastMCP server for AI tool integration.

## Development Commands

### Backend (Python 3.12 + uv)
```bash
cd backend
uv sync --extra dev              # Install dependencies
uv run alembic upgrade head      # Run database migrations
uv run uvicorn src.api.main:app --reload  # Dev server (port 8000)
uv run pytest                    # Run all tests
uv run pytest tests/test_file.py::test_name  # Run single test
uv run ruff check .              # Lint
uv run ruff format .             # Format
```

### Frontend (React 18 + Vite + pnpm)
```bash
cd frontend
pnpm install                     # Install dependencies
pnpm dev                         # Dev server (port 5173)
pnpm build                       # Production build
pnpm test                        # Run tests (vitest)
pnpm lint                        # TypeScript type check
```

### MCP Server
```bash
cd mcp-server
uv sync --extra dev
uv run -m src.main               # Start MCP server
```

### Docker Development
```bash
docker volume create backend_pgdata
UID="$(id -u)" GID="$(id -g)" docker compose up -d
docker compose run --rm migrate  # Run migrations
```

## Architecture

```
├── backend/           # FastAPI (Python 3.12, SQLAlchemy 2.0 async, PostgreSQL)
├── frontend/          # React 18, Vite, Mantine UI, React Query, TypeScript
├── mcp-server/        # FastMCP gateway to backend API
└── docs/              # Master specifications (api.md, calculation-engine.md, data-model.md)
```

### Backend Layers
- `src/api/` - FastAPI routes, Pydantic schemas, middleware
- `src/core/` - Calculation logic, propagation models (itur library), strategies
- `src/services/` - Business logic orchestration
- `src/persistence/` - SQLAlchemy async models, repositories, Alembic migrations

### Frontend Organization
- `src/pages/` - Route pages (CalculationPage, AssetsPage)
- `src/features/` - Feature modules (calculation, assets, modcod, scenarios)
- `src/api/` - Axios client, React Query provider, TypeScript schemas

### Data Flow
1. Frontend (Axios) → Backend `/api/v1` endpoints
2. Routes → Services → Core calculations → Repositories → PostgreSQL
3. MCP Server → httpx → Backend API (stateless gateway)

## Key Patterns

- **Async-first**: All backend I/O uses async/await (SQLAlchemy asyncio, asyncpg)
- **Strategy Pattern**: `CommunicationStrategy` for transparent/regenerative transponders
- **Repository Pattern**: Data access abstraction in `persistence/repositories/`
- **Feature-based Frontend**: Components grouped by business domain

## Code Style

- Python: Line length 100, Ruff linting (E, F, I, B, UP, ASYNC, A, COM, N rules)
- TypeScript: Strict mode, react-hook-form + Zod for type-safe forms
- All documentation and code comments in English

## Constraints

- Geometry calculations assume GEO satellites only
- No production authentication (development-only)
- Default Docker credentials for local dev only
