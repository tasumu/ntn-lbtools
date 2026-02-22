# System Architecture

This document describes the architecture of the NTN Link Budget Tools system.

## High-Level Overview

```mermaid
flowchart TB
    subgraph Clients
        WebUI[Web UI<br/>React + Mantine]
        AI[AI Clients<br/>Claude Desktop, etc.]
    end

    subgraph Gateway
        MCP[MCP Server<br/>FastMCP]
    end

    subgraph Agents["Agents (LangGraph)"]
        Orchestrator[Orchestrator]
        Parser[Parser Node]
        Asset[Asset Node]
        Calculator[Calculator Node]
        Expert[Expert Node]
        Optimizer[Optimizer Node]
    end

    subgraph Backend["Backend (FastAPI)"]
        API[API Routes]
        Services[Services Layer]
        Core[Core Calculations]
        Persistence[Persistence Layer]
    end

    subgraph Data
        DB[(PostgreSQL)]
    end

    WebUI --> API
    AI --> MCP
    MCP --> Orchestrator
    Orchestrator --> Parser
    Orchestrator --> Asset
    Orchestrator --> Calculator
    Orchestrator --> Expert
    Orchestrator --> Optimizer
    Calculator --> API
    Asset --> API
    API --> Services
    Services --> Core
    Services --> Persistence
    Persistence --> DB
```

## Component Details

### Frontend (React)

```mermaid
flowchart LR
    subgraph Pages
        CalcPage[CalculationPage /]
        AssetsPage[AssetsPage /assets]
        SweepPage[SweepPage /sweep]
        ComparePage[ComparisonPage /compare]
    end

    subgraph Features
        CalcFeature[calculation/]
        AssetsFeature[assets/]
        ModcodFeature[modcod/]
        ScenariosFeature[scenarios/]
        SweepFeature[sweep/]
        CompareFeature[comparison/]
    end

    subgraph API Layer
        AxiosClient[Axios Client]
        ReactQuery[React Query Provider]
    end

    CalcPage --> CalcFeature
    AssetsPage --> AssetsFeature
    AssetsPage --> ModcodFeature
    SweepPage --> SweepFeature
    ComparePage --> CompareFeature
    CalcFeature --> ReactQuery
    AssetsFeature --> ReactQuery
    SweepFeature --> ReactQuery
    CompareFeature --> ReactQuery
    ReactQuery --> AxiosClient
    AxiosClient --> Backend[Backend API]
```

### Backend Layers

```mermaid
flowchart TB
    subgraph "API Layer (src/api/)"
        Routes[Routes]
        Schemas[Pydantic Schemas]
        Middleware[Middleware]
    end

    subgraph "Service Layer (src/services/)"
        CalcService[CalculationService]
        SweepService[SweepService]
        AssetsService[AssetsService]
        ModcodService[ModcodService]
        ScenarioService[ScenarioService]
    end

    subgraph "Core Layer (src/core/)"
        Propagation[Propagation Models<br/>FSPL, Rain, Gas, Cloud]
        Strategies[Waveform Strategies<br/>DVB-S2X, 5G NR]
        Communication[Communication Strategies<br/>Transparent, Regenerative]
    end

    subgraph "Persistence Layer (src/persistence/)"
        Models[SQLAlchemy Models]
        Repos[Repositories]
        Migrations[Alembic Migrations]
    end

    Routes --> CalcService
    Routes --> AssetsService
    CalcService --> Propagation
    CalcService --> Strategies
    CalcService --> Communication
    CalcService --> Repos
    AssetsService --> Repos
    Repos --> Models
    Models --> DB[(PostgreSQL)]
```

## Data Flow

### Link Budget Calculation

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Route
    participant Svc as CalculationService
    participant Prop as Propagation
    participant Wave as Waveform Strategy
    participant DB as Database

    C->>API: POST /api/v1/link-budgets/calculate
    API->>Svc: calculate(payload)

    Svc->>DB: Fetch satellite, earth stations
    DB-->>Svc: Asset data

    Svc->>DB: Fetch ModCod table
    DB-->>Svc: ModCod entries

    Svc->>Prop: compute_link_budget(inputs)
    Prop->>Prop: estimate_slant_range()
    Prop->>Prop: free_space_path_loss()
    Prop->>Prop: rain_loss() [ITU-R P.618]
    Prop->>Prop: gas_loss() [ITU-R P.676]
    Prop->>Prop: cloud_loss() [ITU-R P.840]
    Prop-->>Svc: {fspl, rain, gas, cloud, cn0, cn}

    Svc->>Wave: select_modcod_with_margin(cn0)
    Wave-->>Svc: (modcod, margin)

    Svc-->>API: CalculationResult
    API-->>C: JSON Response
```

### Agentic Workflow

```mermaid
sequenceDiagram
    participant User
    participant MCP as MCP Server
    participant Graph as LangGraph
    participant Parser as Parser Node
    participant Asset as Asset Node
    participant Calc as Calculator Node
    participant Expert as Expert Node
    participant API as Backend API

    User->>MCP: "Design Ku-band link from Tokyo to satellite at 128E"
    MCP->>Graph: invoke(request, mode="design")

    Graph->>Parser: parse(request)
    Parser->>Parser: Extract location (Tokyo → lat/lon)
    Parser->>Parser: Extract band (Ku → 12-18 GHz)
    Parser->>Parser: Extract satellite position (128°E)
    Parser-->>Graph: {params}

    Graph->>Asset: resolve(params)
    Asset->>API: list_satellites()
    API-->>Asset: [satellites]
    Asset->>Asset: Match by longitude, band
    Asset-->>Graph: {satellite_id, earth_station_ids}

    Graph->>Calc: calculate(assets, params)
    Calc->>API: POST /link-budgets/calculate
    API-->>Calc: result
    Calc-->>Graph: {calculation_result}

    Graph->>Expert: explain(result)
    Expert->>Expert: Analyze losses
    Expert->>Expert: Generate recommendations
    Expert-->>Graph: {explanations, recommendations}

    Graph-->>MCP: Final response
    MCP-->>User: Formatted result with explanations
```

## Database Schema

```mermaid
erDiagram
    Satellite {
        uuid id PK
        string name
        string orbit_type
        float longitude_deg
        float inclination_deg
        float altitude_km
        string tle_line1
        string tle_line2
        float transponder_bandwidth_mhz
        float eirp_dbw
        float gt_db_per_k
        string frequency_band
        string description
        string notes
        datetime created_at
        datetime updated_at
    }

    EarthStation {
        uuid id PK
        string name
        float antenna_diameter_m
        float antenna_gain_tx_db
        float antenna_gain_rx_db
        float noise_temperature_k
        float eirp_dbw
        float tx_power_dbw
        float gt_db_per_k
        string polarization
        float latitude_deg
        float longitude_deg
        float altitude_m
        string description
        string notes
        datetime created_at
        datetime updated_at
    }

    ModcodTable {
        uuid id PK
        string name
        string waveform
        string version
        string description
        json entries
        datetime published_at
        datetime created_at
    }

    Scenario {
        uuid id PK
        string name
        string description
        string waveform_strategy
        string transponder_type
        uuid modcod_table_id FK
        uuid satellite_id FK
        uuid earth_station_tx_id FK
        uuid earth_station_rx_id FK
        string schema_version
        string status
        json payload_snapshot
        datetime created_at
        datetime updated_at
    }

    Scenario }o--|| ModcodTable : modcod_table_id
    Scenario }o--o| Satellite : satellite_id
    Scenario }o--o| EarthStation : earth_station_tx_id
    Scenario }o--o| EarthStation : earth_station_rx_id
```

## Agent Architecture (LangGraph)

```mermaid
stateDiagram-v2
    [*] --> Parse
    Parse --> ResolveAssets

    ResolveAssets --> HumanConfirm: needs_confirmation
    ResolveAssets --> Calculate: assets_ready

    HumanConfirm --> ResolveAssets: user_input
    HumanConfirm --> [*]: cancelled

    Calculate --> Explain

    Explain --> Optimize: mode=optimize
    Explain --> [*]: mode=design

    Optimize --> [*]
```

### State Structure

```mermaid
classDiagram
    class LinkBudgetState {
        +list messages
        +Literal mode
        +dict extracted_params
        +bool locations_resolved
        +str satellite_id
        +str earth_station_tx_id
        +str earth_station_rx_id
        +str modcod_table_id
        +bool assets_ready
        +dict calculation_result
        +list explanations
        +list recommendations
        +list optimization_results
        +bool awaiting_confirmation
        +str confirmation_type
    }
```

## Propagation Models

```mermaid
flowchart LR
    subgraph Inputs
        Freq[Frequency Hz]
        Elev[Elevation deg]
        Loc[Location lat/lon]
        Rain[Rain rate mm/hr]
        Temp[Temperature K]
    end

    subgraph ITU-R Models
        P618[P.618<br/>Rain Attenuation]
        P676[P.676<br/>Gas Attenuation]
        P840[P.840<br/>Cloud Attenuation]
    end

    subgraph Geometry
        Slant[Slant Range km]
        FSPL[Free Space Path Loss]
    end

    subgraph Output
        Total[Total Loss dB]
        CN0[C/N0 dBHz]
        Margin[Link Margin dB]
    end

    Freq --> P618
    Freq --> P676
    Freq --> P840
    Freq --> FSPL
    Elev --> P618
    Elev --> P676
    Elev --> P840
    Loc --> P618
    Loc --> P840
    Loc --> Slant
    Rain --> P618
    Temp --> P676

    Slant --> FSPL
    P618 --> Total
    P676 --> Total
    P840 --> Total
    FSPL --> Total
    Total --> CN0
    CN0 --> Margin
```

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Docker Compose
        DB[(db postgres:5432)]
        Backend[backend:8000]
        Frontend[frontend:5173]
        MCP[mcp-server stdio]
        Migrate[migrate one-shot]
    end

    subgraph Volumes
        PGData[backend_pgdata]
    end

    Frontend --> Backend
    MCP --> Backend
    Backend --> DB
    DB --> PGData
    Migrate --> DB
```

## Security Model

```mermaid
flowchart TB
    subgraph Development
        DevEnv[Development Environment]
        DevDB[Local PostgreSQL]
    end

    subgraph "Security Boundaries"
        NoAuth[No Authentication<br/>Development Only]
        EnvVars[Environment Variables<br/>for Secrets]
        DockerNet[Docker Network<br/>Isolation]
    end

    DevEnv --> NoAuth
    DevEnv --> EnvVars
    DevEnv --> DockerNet
    DockerNet --> DevDB
```

> **Note**: This system is designed for development use only. Production deployment requires additional security measures including authentication, HTTPS, and proper secret management.
