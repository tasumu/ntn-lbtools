# Documentation

This folder describes the current behavior of the repository (code-first). It is intended to replace
the need to read planning specs when you need the actual product behavior.

## Core Documentation
- [api.md](api.md): HTTP API endpoints, payloads, and validation rules.
- [calculation-engine.md](calculation-engine.md): Link budget math, ModCod selection, and impairment handling.
- [data-model.md](data-model.md): Database schema and scenario payload_snapshot structure.
- [mcp-server.md](mcp-server.md): MCP server configuration, tools, and prompts.
- [frontend.md](frontend.md): UI pages and client-side behavior.

## Development Guides
- [tech-stack.md](tech-stack.md): Complete technology stack with versions.
- [development.md](development.md): Development environment setup and workflows.
- [architecture.md](architecture.md): System architecture diagrams (Mermaid).

## AI Features
- [agentic-ai.md](agentic-ai.md): LangGraph-based agentic AI system for natural language link budget design.

## Quick Links

| Component | Documentation |
|-----------|---------------|
| Backend API | [api.md](api.md) |
| Calculations | [calculation-engine.md](calculation-engine.md) |
| Frontend | [frontend.md](frontend.md) |
| MCP Server | [mcp-server.md](mcp-server.md) |
| AI Agents | [agentic-ai.md](agentic-ai.md) |
| Development | [development.md](development.md) |

Notes:
- Snapshot schema version is `1.1.0`.
- The `specs/` folder is historical and may not reflect the current implementation.
