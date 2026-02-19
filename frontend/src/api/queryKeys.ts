export const queryKeys = {
  satellites: {
    all: ["satellites"] as const,
    list: (params: { limit: number; offset: number }) =>
      ["satellites", "list", params] as const,
  },
  earthStations: {
    all: ["earth-stations"] as const,
    list: (params: { limit: number; offset: number }) =>
      ["earth-stations", "list", params] as const,
  },
  modcodTables: {
    all: ["modcod-tables"] as const,
    list: (params: { limit: number; offset: number }) =>
      ["modcod-tables", "list", params] as const,
  },
  scenarios: {
    all: ["scenarios"] as const,
    list: (params: { limit: number; offset: number }) =>
      ["scenarios", "list", params] as const,
    detail: (id: string | null) => ["scenario-detail", id] as const,
  },
} as const;
