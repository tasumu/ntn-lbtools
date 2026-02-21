import { Button, Select, SimpleGrid } from "@mantine/core";
import { useCallback, useState } from "react";

type Props = {
  scenarios: { value: string; label: string }[];
  loading: boolean;
  onCompare: (idA: string, idB: string) => void;
};

export function ScenarioSelector({ scenarios, loading, onCompare }: Props) {
  const [idA, setIdA] = useState<string | null>(null);
  const [idB, setIdB] = useState<string | null>(null);

  const canCompare = idA !== null && idB !== null && idA !== idB;

  const handleCompare = useCallback(() => {
    if (canCompare) onCompare(idA, idB);
  }, [canCompare, idA, idB, onCompare]);

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} verticalSpacing="sm">
      <Select
        label="Scenario A"
        placeholder="Select scenario"
        data={scenarios}
        value={idA}
        onChange={setIdA}
        searchable
        disabled={loading}
      />
      <Select
        label="Scenario B"
        placeholder="Select scenario"
        data={scenarios}
        value={idB}
        onChange={setIdB}
        searchable
        disabled={loading}
      />
      <Button onClick={handleCompare} disabled={!canCompare} loading={loading}>
        Compare
      </Button>
    </SimpleGrid>
  );
}
