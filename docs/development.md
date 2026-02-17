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

# Type check
uv run mypy src/
```

### Frontend Development

```bash
cd frontend

# Start dev server with hot reload
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

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

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ntn_lbtools

# Optional
LOG_LEVEL=INFO
```

### Frontend (.env)

```bash
# API Base URL
VITE_API_BASE_URL=http://localhost:8000
```

### MCP Server (.env)

```bash
# Backend API URL
BACKEND_API_URL=http://localhost:8000
```

## Project Structure

```
ntn-lbtools/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── api/            # HTTP routes, schemas
│   │   ├── core/           # Calculation logic, propagation
│   │   ├── services/       # Business logic
│   │   └── persistence/    # Database models, repositories
│   ├── tests/
│   ├── alembic/            # Database migrations
│   └── pyproject.toml
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── features/      # Feature modules
│   │   ├── api/           # API client, React Query
│   │   └── components/    # Shared components
│   ├── tests/
│   └── package.json
│
├── mcp-server/             # FastMCP server
│   ├── src/
│   └── pyproject.toml
│
├── agents/                 # LangGraph agents (NEW)
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
- **ESLint**: Standard React configuration
- **Formatting**: Prettier (via ESLint)

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

```
tests/
├── unit/                   # Unit tests for core logic
│   ├── test_propagation.py
│   └── test_strategies.py
├── integration/            # Integration tests with DB
│   ├── test_calculation_service.py
│   └── test_api_endpoints.py
└── conftest.py            # Pytest fixtures
```

### Frontend Tests

```
tests/
├── components/            # Component unit tests
├── features/              # Feature integration tests
└── setup.ts              # Vitest configuration
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
