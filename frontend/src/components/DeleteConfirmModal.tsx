import { Button, Group, Modal, Text } from "@mantine/core";

type Props = {
  opened: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  loading?: boolean;
};

export function DeleteConfirmModal({
  opened,
  onConfirm,
  onCancel,
  title = "Confirm deletion",
  message,
  loading = false,
}: Props) {
  return (
    <Modal opened={opened} onClose={onCancel} title={title} centered size="sm">
      <Text size="sm" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm} loading={loading}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
