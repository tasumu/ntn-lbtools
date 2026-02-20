import { Badge, Table } from "@mantine/core";

import type { ResultRow } from "./comparisonUtils";

type Props = {
  rows: ResultRow[];
  nameA: string;
  nameB: string;
};

function MarginBadge({ value }: { value: string }) {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return <>{value}</>;
  return (
    <Badge color={num >= 0 ? "green" : "red"} variant="light" size="sm">
      {value}
    </Badge>
  );
}

function isMarginKey(key: string): boolean {
  return key.includes("link_margin");
}

export function ResultComparisonTable({ rows, nameA, nameB }: Props) {
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Metric</Table.Th>
          <Table.Th>{nameA}</Table.Th>
          <Table.Th>{nameB}</Table.Th>
          <Table.Th>Delta</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr
            key={row.key}
            bg={row.isDifferent ? "yellow.1" : undefined}
          >
            <Table.Td fw={500}>{row.label}</Table.Td>
            <Table.Td>
              {isMarginKey(row.key) ? (
                <MarginBadge value={row.valueA} />
              ) : (
                row.valueA
              )}
            </Table.Td>
            <Table.Td>
              {isMarginKey(row.key) ? (
                <MarginBadge value={row.valueB} />
              ) : (
                row.valueB
              )}
            </Table.Td>
            <Table.Td>{row.delta}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
