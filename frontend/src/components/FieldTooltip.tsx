import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { TOOLTIP_CONTENT } from "../data/tooltipContent";

type FieldTooltipProps = {
  fieldKey: string;
};

export function FieldTooltip({ fieldKey }: FieldTooltipProps) {
  const entry = TOOLTIP_CONTENT[fieldKey];
  if (!entry) return null;

  return (
    <Tooltip
      label={`${entry.description} Typical: ${entry.typicalRange}`}
      multiline
      w={280}
      withArrow
    >
      <ActionIcon
        variant="subtle"
        size="xs"
        aria-label={`Info: ${fieldKey}`}
      >
        <IconInfoCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );
}

type LabelWithTooltipProps = {
  label: ReactNode;
  fieldKey: string;
};

export function LabelWithTooltip({ label, fieldKey }: LabelWithTooltipProps) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text size="sm" component="span">
        {label}
      </Text>
      <FieldTooltip fieldKey={fieldKey} />
    </Group>
  );
}
