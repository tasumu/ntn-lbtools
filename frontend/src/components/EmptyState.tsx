import { Stack, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: Props) {
  return (
    <Stack align="center" gap="xs" py="xl">
      <ThemeIcon size="xl" variant="light" color="gray">
        {icon}
      </ThemeIcon>
      <Text fw={600} size="sm" c="dimmed">
        {title}
      </Text>
      {description && (
        <Text size="xs" c="dimmed" ta="center" maw={300}>
          {description}
        </Text>
      )}
    </Stack>
  );
}
