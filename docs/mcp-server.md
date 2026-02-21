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

## Custom Tools

### `echo(text: str) -> str`
Simple test tool that echoes back the provided text.

### `agentic_link_budget(request: str, mode: str) -> dict`
Intelligently process natural language link budget requests using AI agents. Uses a LangGraph-based multi-agent system to parse natural language, resolve assets, execute calculations, and analyze results with ITU-R expertise.

**Parameters:**
- `request` (str): Natural language description of the link budget request. Example: `"Design a Ku-band link from Tokyo to a satellite at 128E with 5 dB margin"`
- `mode` (`"design"` | `"optimize"` | `"consult"`, default `"design"`): Workflow mode.
  - `design` - Create a link budget from natural language description
  - `optimize` - Find optimal parameters to meet a target margin
  - `consult` - Step-by-step guided design with explanations

**Returns:** Dictionary with `extracted_params`, `resolved_assets`, `calculation_result`, `explanations`, `recommendations`, `warnings`, and `optimization_results`.

### `explain_propagation(loss_type: str, value_db: float, frequency_hz?: float, elevation_deg?: float) -> str`
Explain a propagation loss value with ITU-R context. Provides expert explanations for various loss components including relevant ITU-R recommendations and mitigation strategies.

**Parameters:**
- `loss_type` (`"rain"` | `"gas"` | `"cloud"` | `"fspl"` | `"pointing"`): Type of loss to explain
- `value_db` (float): Loss value in dB
- `frequency_hz` (float, optional): Operating frequency in Hz
- `elevation_deg` (float, optional): Elevation angle in degrees

### `get_itu_r_guidance(recommendation: str, condition?: str) -> dict`
Get guidance from ITU-R recommendations for satellite link design including typical values, mitigation strategies, and best practices.

**Parameters:**
- `recommendation` (str): ITU-R recommendation identifier (`P.618`, `P.676`, `P.840`, `P.525`, `P.453`)
- `condition` (str, optional): Specific condition (e.g., `"high_loss"`, `"frequency_scaling"`, `"absorption_peaks"`)

### `get_frequency_band_info(band_name: str) -> dict`
Get information about a satellite frequency band including uplink/downlink ranges, typical applications, and rain sensitivity.

**Parameters:**
- `band_name` (str): Frequency band name (`L`, `S`, `C`, `Ku`, `Ka`, `Q`, `V`). Case-insensitive.

### `get_satellite_info(name: str) -> dict`
Get information about a known satellite including orbital position and supported frequency bands.

**Parameters:**
- `name` (str): Satellite name as registered in the knowledge base or database. Case-insensitive, supports aliases.

### `get_location_info(name: str) -> dict`
Get information about a known location for earth station placement including coordinates and typical rain rates.

**Parameters:**
- `name` (str): Location name (e.g., `"Tokyo"`, `"Singapore"`). Case-insensitive.

## Prompts
- `link_budget_from_request`: Plan a link budget workflow, create assets if needed, then call calculate.
- `asset_selection_or_creation`: Collect fields for satellite or earth station creation.
- `modcod_table_creation`: Guide the creation of a ModCod table with thresholds.
- `summarize_calculation_response`: Turn a CalculationResponse into a summary.

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
- Calculation endpoint has a 30/minute rate limit.
