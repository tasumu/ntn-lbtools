# MCP Server

The MCP server lives in `mcp-server/` and exposes the backend API to MCP clients.

## How It Works
- Reads `BACKEND_API_URL` from `mcp-server/.env` (defaults to `http://localhost:8000`).
- Fetches the backend OpenAPI spec at startup (`/openapi.json`).
- Patches a small subset of response schemas for MCP compatibility.
- Builds tools with `FastMCP.from_openapi`.
- Uses an async HTTP client to call the backend.

The environment variable `FASTMCP_EXPERIMENTAL_ENABLE_NEW_OPENAPI_PARSER` is set to `true`
by default to enable the new FastMCP OpenAPI parser.

## Custom Tools and Prompts
Custom tool:
- `echo(text: str) -> str`: simple test tool.

Prompts:
- `link_budget_from_request`: plan a link budget workflow, create assets if needed, then call calculate.
- `asset_selection_or_creation`: collect fields for satellite or earth station creation.
- `modcod_table_creation`: guide the creation of a ModCod table with thresholds.
- `summarize_calculation_response`: turn a CalculationResponse into a summary.

## Running Locally
```bash
cd mcp-server
uv sync --extra dev
uv run -m src.main
```

## Limitations
- No authentication or authorization.
- Requires the backend to be reachable on startup.
- Only a subset of responses is inlined for MCP parser compatibility.
