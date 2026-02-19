export const queryKeys = {
  satellites: {
    all: ["satellites"] as const,
  },
  earthStations: {
    all: ["earth-stations"] as const,
  },
  modcodTables: {
    all: ["modcod-tables"] as const,
  },
  scenarios: {
    all: ["scenarios"] as const,
    detail: (id: string | null) => ["scenario-detail", id] as const,
  },
} as const;
