# Development Guide

This guide covers setting up and working with the NTN Link Budget Tools development environment.

## Prerequisites

- **Python 3.12+** with [uv](https://github.com/astral-sh/uv)
- **Node.js 20+** with [pnpm](https://pnpm.io/)
- **Docker** and **Docker Compose**
- **PostgreSQL 16** (or use Docker)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ntn-lbtools
```

### 2. Start with Docker (Recommended)

```bash
# Create database volume
docker volume create backend_pgdata

# Start all services
UID="$(id -u)" GID="$(id -g)" docker compose up -d

# Run database migrations
docker compose run --rm migrate
```

Services will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Manual Setup (Alternative)

#### Backend

```bash
cd backend

# Install dependencies
uv sync --extra dev

# Start PostgreSQL (if not using Docker)
# Ensure DATABASE_URL is set in .env

# Run migrations
uv run alembic upgrade head

# Start development server
uv run uvicorn src.api.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

#### MCP Server

```bash
cd mcp-server

# Install dependencies
uv sync --extra dev

# Start MCP server
uv run -m src.main
```

## Development Workflow

### Backend Development

```bash
cd backend

# Run all tests
uv run pytest

# Run specific test
uv run pytest tests/test_file.py::test_name

# Run tests with coverage
uv run pytest --cov=src --cov-report=html

# Lint code
uv run ruff check .

# Format code
uv run ruff format .
```

### Frontend Development

```bash
cd frontend

# Start dev server with hot reload
pnpm dev

# Run tests (vitest in watch mode)
pnpm test

# Type check
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Database Operations

```bash
cd backend

# Create a new migration
uv run alembic revision --autogenerate -m "Description of changes"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1

# View migration history
uv run alembic history
```

## Environment Variables

### Backend (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL async connection string | `postgresql+asyncpg://ntn:ntnpass@localhost:5432/ntn_lbtools` |
| `APP_ENV` | No | Environment name (default: `development`) | `development`, `production` |
| `LOG_LEVEL` | No | Logging verbosity (default: `info`) | `debug`, `info`, `warning`, `error` |
| `API_KEY` | No | API key for protected endpoints | |
| `CORS_ORIGINS` | No | Allowed CORS origins (JSON array) | `["https://your-domain.com"]` |

### Frontend (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL (including `/api/v1`) | `http://localhost:8000/api/v1` |

Note: If the app is served over HTTPS and the base URL is HTTP, it falls back to same-origin `/api/v1` to avoid mixed-content errors.

### MCP Server (.env)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BACKEND_API_URL` | Yes | Backend root URL (no path suffix) | `http://localhost:8000` |
| `GEMINI_OPENAPI_WORKAROUND` | No | Enable Gemini schema workaround | `1` |

## Project Structure

```
ntn-lbtools/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── api/            # HTTP routes, schemas
│   │   ├── core/           # Calculation logic, propagation
│   │   ├── services/       # Business logic
│   │   └── persistence/    # Database models, repositories
│   ├── tests/              # Flat test files (test_*.py)
│   └── pyproject.toml
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── features/      # Feature modules (calculation, assets, modcod, scenarios, sweep, comparison)
│   │   ├── api/           # API client, React Query
│   │   ├── components/    # Shared components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities (formatters, export, scenarioMapper)
│   │   ├── data/          # Static data (presets, tooltips)
│   │   └── test/          # Test setup (MSW handlers, vitest config)
│   └── package.json
│
├── mcp-server/             # FastMCP server
│   ├── src/
│   └── pyproject.toml
│
├── agents/                 # LangGraph agents
│   ├── src/ntn_agents/
│   └── pyproject.toml
│
├── docs/                   # Documentation
├── docker-compose.yml
└── README.md
```

## Code Style

### Python

- **Line length**: 100 characters
- **Linter**: Ruff with rules (E, F, I, B, UP, ASYNC, A, COM, N)
- **Imports**: Sorted by isort (via Ruff)
- **Docstrings**: Google style
- **Type hints**: Required for public APIs

### TypeScript

- **Strict mode**: Enabled
- **Type check**: `tsc --noEmit` (via `pnpm lint`)

### Git Commits

- Use conventional commits format
- Keep commits focused and atomic
- Write clear, descriptive messages

```
feat: add rain attenuation calculation
fix: correct elevation angle computation
docs: update API documentation
refactor: simplify ModCod selection logic
test: add propagation model tests
```

## Testing Strategy

### Backend Tests

Tests live in `backend/tests/` as flat files:

```
tests/
├── conftest.py                # Pytest fixtures
├── test_core.py               # Core calculation logic
├── test_propagation.py        # Propagation models
├── test_calculation_logic.py  # Link budget calculations
└── test_calculation_service.py # Service layer
```

### Frontend Tests

Tests are co-located with source files (`*.test.ts` / `*.test.tsx`):

```
src/
├── features/calculation/CalculationForm.test.tsx
├── features/calculation/CalculationView.test.tsx
├── features/sweep/SweepPage.test.tsx
├── features/comparison/ScenarioSelector.test.tsx
├── components/FrequencyInput.test.tsx
├── lib/formatters.test.ts
├── lib/scenarioMapper.test.ts
└── test/setup.ts              # Vitest + MSW setup
```

## Debugging

### Backend

```bash
# Run with debugger
uv run python -m debugpy --listen 5678 -m uvicorn src.api.main:app --reload

# View SQL queries
export SQLALCHEMY_ECHO=true
```

### Frontend

- Use React DevTools browser extension
- Use React Query DevTools (included in dev mode)

### MCP Server

```bash
# Test MCP tools manually
uv run python -c "from src.tools import mcp; print(mcp.list_tools())"
```

## Common Issues

### Database Connection

```bash
# Check PostgreSQL is running
docker compose ps

# Check connection
docker compose exec db psql -U postgres -c "SELECT 1"
```

### Port Conflicts

```bash
# Check what's using a port
lsof -i :8000
lsof -i :5173
```

### Dependency Issues

```bash
# Clear and reinstall Python deps
cd backend && rm -rf .venv && uv sync --extra dev

# Clear and reinstall Node deps
cd frontend && rm -rf node_modules && pnpm install
```

## Performance Profiling

### Backend

```bash
# Profile with py-spy
uv run py-spy top -- python -m uvicorn src.api.main:app

# Memory profiling
uv run memray run -o output.bin python -m pytest
uv run memray flamegraph output.bin
```

### Frontend

- Use React Profiler in DevTools
- Use Lighthouse for performance audits

## Deployment

See deployment documentation (coming soon) for production deployment guides.
