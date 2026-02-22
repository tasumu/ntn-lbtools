# Agentic AI System

This document describes the LangGraph-based agentic AI system for intelligent satellite link budget design.

## Overview

The agentic AI system enables natural language interaction for link budget design, optimization, and consulting. It uses a multi-node workflow orchestrated by LangGraph.

## Architecture

```
User Request (Natural Language)
         │
         ▼
┌─────────────────────────────────────────┐
│           LangGraph Workflow             │
│                                          │
│  ┌────────┐   ┌────────┐   ┌────────┐   │
│  │ Parse  │──▶│ Asset  │──▶│ Calc   │   │
│  │ Node   │   │ Node   │   │ Node   │   │
│  └────────┘   └────────┘   └────────┘   │
│       │            │            │        │
│       ▼            ▼            ▼        │
│  ┌────────┐   ┌────────┐   ┌────────┐   │
│  │ Expert │◀──│ Human  │──▶│Optimize│   │
│  │ Node   │   │ Node   │   │ Node   │   │
│  └────────┘   └────────┘   └────────┘   │
└─────────────────────────────────────────┘
         │
         ▼
  Structured Result + Explanations
```

## Modes

### Design Mode
Default mode for creating link budgets from natural language.

```
"Design a Ku-band link from Tokyo to satellite at 128E"
```

### Optimize Mode
Find optimal parameters to meet target specifications.

```
"Optimize for 5 dB margin with minimum bandwidth"
```

### Consult Mode
Step-by-step guided design with explanations.

## Workflow Nodes

### 1. Parser Node
Extracts structured parameters from natural language:
- **Location Resolution**: City names → lat/lon (via geopy + Nominatim)
- **Satellite Identification**: Name → orbital position
- **Frequency Band**: "Ku-band" → 14/12 GHz
- **Target Specs**: Margin, data rate, availability

### 2. Asset Node
Resolves assets from the database:
- Searches for matching satellites by longitude/band
- Finds earth stations by location
- Selects appropriate ModCod tables
- Proposes new assets if none match

### 3. Human Node
Handles user confirmations:
- Asset creation approval
- Parameter modifications
- Workflow continuation

### 4. Calculator Node
Executes link budget calculations:
- Calls backend API with resolved parameters
- Computes uplink, downlink, and combined metrics
- Selects appropriate ModCod

### 5. Expert Node
Analyzes results with ITU-R expertise:
- Explains each loss component
- Identifies issues and warnings
- Provides recommendations
- References ITU-R recommendations

### 6. Optimizer Node
Explores parameter variations:
- Bandwidth adjustments
- Rain rate design points
- Trade-off analysis

## Knowledge Base

### ITU-R Recommendations
Embedded knowledge from key recommendations:

| Recommendation | Purpose |
|----------------|---------|
| P.618 | Rain attenuation prediction |
| P.676 | Gaseous attenuation (O₂, H₂O) |
| P.840 | Cloud and fog attenuation |
| P.525 | Free space path loss |
| P.453 | Refractive index effects |

### Frequency Bands
Complete definitions for L, S, C, X, Ku, Ka, Q, V bands with:
- Uplink/downlink frequency ranges
- Typical applications
- Rain sensitivity ratings

### Known Locations
Pre-defined locations with coordinates and climate data:
- Major cities (Tokyo, Singapore, Sydney, etc.)
- Known ground station sites
- Typical rain rates by region

### Satellite Data
Satellite data is managed through the application's Assets API:
- Users create satellite assets with orbital position, frequency bands, and RF parameters
- The knowledge base lookup infrastructure supports future external database integration
- No built-in satellite data is included to avoid outdated or inaccurate information

## MCP Tools

### Primary Tool
```python
agentic_link_budget(
    request: str,
    mode: Literal["design", "optimize", "consult"] = "design"
) -> dict
```

### Helper Tools
```python
explain_propagation(loss_type, value_db, frequency_hz, elevation_deg) -> str
get_itu_r_guidance(recommendation, condition) -> dict
get_frequency_band_info(band_name) -> dict
get_satellite_info(name) -> dict
get_location_info(name) -> dict
```

## Usage Examples

### Basic Link Design
```
Request: "Design a Ku-band link from Tokyo to satellite at 128E"

Response:
- Extracted: Tokyo (35.68°N, 139.65°E), satellite at 128°E, Ku-band
- Resolved: satellite_id, earth_station_id, modcod_table_id
- Calculation: Combined margin 4.5 dB, ModCod: QPSK 1/2
- Expert: Rain loss 3.2 dB moderate, FSPL 205.8 dB typical for Ku
```

### With Target Margin
```
Request: "Ku-band link from Osaka to 128E with 6 dB margin"

Response:
- Current margin: 3.5 dB (below target)
- Optimization run: reduce bandwidth 50% → margin 6.2 dB
- Recommendation: Use 18 MHz instead of 36 MHz
```

### Ka-band with Weather
```
Request: "Ka-band link Singapore to satellite at 128E, heavy rain 100mm/hr"

Response:
- Warning: Rain loss 25.4 dB (high for Ka-band)
- Warning: Combined margin NEGATIVE (-3.2 dB)
- Recommendations:
  - Consider site diversity
  - Use ACM (Adaptive Coding and Modulation)
  - Design for lower availability if acceptable
```

## Installation

### Install agents package
```bash
cd agents
uv sync --extra dev
```

### Install with MCP server
```bash
cd mcp-server
uv sync --extra agents
```

### Environment Variables
```bash
# Required for LLM-based parsing
NTN_AGENTS_ANTHROPIC_API_KEY=your-key-here

# Optional
NTN_AGENTS_BACKEND_API_URL=http://localhost:8000
NTN_AGENTS_ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Development

### Running Tests
```bash
cd agents
uv run pytest
```

### Adding New Knowledge
1. Edit files in `agents/src/ntn_agents/knowledge/`
2. Add entries to dictionaries
3. Update tests

### Adding New Nodes
1. Create `agents/src/ntn_agents/nodes/new_node.py`
2. Define node function: `async def new_node(state: LinkBudgetState) -> LinkBudgetState`
3. Add to graph in `graph.py`
4. Export in `nodes/__init__.py`

## State Schema

```python
class LinkBudgetState(TypedDict):
    # Input
    messages: list
    mode: Literal["design", "optimize", "consult"]
    original_request: str

    # Parse results
    extracted_params: ExtractedParams
    locations_resolved: bool

    # Assets
    resolved_assets: ResolvedAssets
    assets_ready: bool

    # Calculation
    calculation_result: CalculationResult

    # Expert
    explanations: list[str]
    recommendations: list[str]
    warnings: list[str]

    # Optimization
    optimization_results: list[OptimizationResult]

    # Human-in-the-loop
    awaiting_confirmation: bool
```

## Limitations

- Backend supports GEO, LEO, and HAPS; agentic parser currently targets GEO scenarios
- DVB-S2X waveform only (extendable)
- Backend must be running for calculations
- LLM API key required for natural language parsing
- Geocoding uses external Nominatim service
