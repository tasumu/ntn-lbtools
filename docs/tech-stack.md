# Technology Stack

This document provides a comprehensive overview of the technologies used in the NTN Link Budget Tools project.

## Backend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Runtime | Python | 3.12 | Core language |
| Package Manager | uv | latest | Fast Python package management |
| Framework | FastAPI | 0.115+ | Async HTTP API framework |
| Validation | Pydantic | v2 | Request/response validation |
| Database | PostgreSQL | 16 | Primary data store |
| ORM | SQLAlchemy | 2.0 | Async database operations |
| Migrations | Alembic | latest | Database schema migrations |
| Propagation | itur | latest | ITU-R P.618/P.676/P.840 implementations |
| Geometry | Skyfield | latest | Satellite geometry and TLE orbit propagation |
| Rate Limiting | slowapi | latest | Per-endpoint rate limits |
| Numerics | NumPy, SciPy | latest | Scientific computing |

### Key Libraries

- **itur**: Implements ITU-R propagation models for rain, gaseous, and cloud attenuation
- **Skyfield**: High-precision astronomy library for satellite geometry and TLE orbit propagation
- **slowapi**: Rate limiting (30/min for calculations, 10/min for sweep)
- **asyncpg**: PostgreSQL async driver for SQLAlchemy

## Frontend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Runtime | Node.js | 20+ (24 in Docker) | JavaScript runtime |
| Package Manager | pnpm | 9+ | Fast, disk-efficient package manager |
| Framework | React | 18 | UI component library |
| Build Tool | Vite | 5+ | Fast development server and bundler |
| UI Library | Mantine | 7+ | React component library |
| Data Fetching | React Query | 5+ | Server state management |
| Forms | react-hook-form | latest | Form state management |
| Validation | Zod | latest | Runtime type validation |
| Language | TypeScript | 5+ | Type-safe JavaScript (strict mode) |
| Charts | Recharts | latest | Data visualization |
| PDF Export | jspdf + html2canvas | latest | PDF/CSV report export |
| Error Boundary | react-error-boundary | latest | Graceful error handling |

### Key Patterns

- **TypeScript strict mode**: Maximum type safety
- **react-hook-form + Zod**: Type-safe form validation
- **React Query**: Caching and synchronization with backend
- **MSW**: Mock Service Worker for API mocking in tests

## MCP Server

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | FastMCP | Model Context Protocol server |
| HTTP Client | httpx | Async HTTP requests to backend |
| Configuration | pydantic-settings | Environment-based configuration |

### MCP Integration

The MCP server exposes backend functionality as AI-accessible tools:
- Auto-generated tools from OpenAPI specification
- Custom prompts for guided workflows
- Stateless gateway design

## Agents (LangGraph)

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | LangGraph | Agent workflow orchestration |
| LLM Integration | langchain-anthropic | Claude model integration |
| Geocoding | geopy | Location name to coordinates |
| HTTP Client | httpx | Backend API calls |

### Agent Architecture

- **StateGraph**: Type-safe workflow definition
- **Nodes**: Specialized agent functions (parser, expert, optimizer)
- **Checkpoints**: Conversation state persistence

## Infrastructure

| Category | Technology | Purpose |
|----------|------------|---------|
| Containerization | Docker | Application packaging |
| Orchestration | Docker Compose | Multi-container development |
| Database Volume | Named volume (`backend_pgdata`) | Persistent storage |

### Docker Services

```yaml
services:
  db:         # PostgreSQL 16 database
  backend:    # FastAPI application (uv 0.8 + Python 3.12)
  frontend:   # React dev server (Node 24)
  mcp-server: # FastMCP gateway (stdio, depends on backend)
  migrate:    # Alembic migrations runner (one-shot)
```

## Development Tools

| Category | Technology | Purpose |
|----------|------------|---------|
| Python Linting | Ruff | Fast linter (E, F, I, B, UP, ASYNC, A, COM, N) |
| Python Formatting | Ruff | Code formatting |
| Python Testing | pytest | Test framework |
| TypeScript Testing | Vitest | Fast test runner |
| Type Checking | tsc | Static type analysis (`--noEmit`) |

## Version Compatibility

### Python Requirements
- Python >= 3.12
- All async-first design (asyncio, asyncpg)

### Node.js Requirements
- Node.js >= 20
- pnpm >= 9

### Database Requirements
- PostgreSQL >= 16 (for JSON operations and performance)

## External APIs

| Service | Purpose | Rate Limits |
|---------|---------|-------------|
| Nominatim (OpenStreetMap) | Geocoding | 1 req/sec (free tier) |
| Anthropic Claude | LLM inference | Per-plan limits |

## Security Considerations

- **Development only**: No production authentication implemented
- **Environment variables**: Secrets via `.env` files (not committed)
- **Docker credentials**: Default values for local development only
