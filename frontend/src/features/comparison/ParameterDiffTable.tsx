import { Switch, Table } from "@mantine/core";
import { useState } from "react";

import type { ParameterRow } from "./comparisonUtils";

type Props = {
  rows: ParameterRow[];
  nameA: string;
  nameB: string;
};

export function ParameterDiffTable({ rows, nameA, nameB }: Props) {
  const [diffOnly, setDiffOnly] = useState(false);

  const visibleRows = diffOnly ? rows.filter((r) => r.isDifferent) : rows;

  return (
    <>
      <Switch
        label="Show differences only"
        checked={diffOnly}
        onChange={(e) => setDiffOnly(e.currentTarget.checked)}
        mb="sm"
      />
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Parameter</Table.Th>
            <Table.Th>{nameA}</Table.Th>
            <Table.Th>{nameB}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleRows.map((row) => (
            <Table.Tr
              key={row.key}
              bg={row.isDifferent ? "yellow.1" : undefined}
            >
              <Table.Td fw={500}>{row.label}</Table.Td>
              <Table.Td>{row.valueA}</Table.Td>
              <Table.Td>{row.valueB}</Table.Td>
            </Table.Tr>
          ))}
          {visibleRows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={3} ta="center" c="dimmed">
                No differences found
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </>
  );
}
