import { Button, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import { DVB_S2X_PRESETS, type ModcodPreset } from "../../data/dvbs2xPresets";

type Props = {
  onSelect: (preset: ModcodPreset) => void;
};

export function PresetSelector({ onSelect }: Props) {
  return (
    <Menu shadow="md" width={260}>
      <Menu.Target>
        <Button
          size="xs"
          variant="light"
          rightSection={<IconChevronDown size={14} />}
        >
          Load Preset
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {DVB_S2X_PRESETS.map((preset) => (
          <Menu.Item key={preset.name} onClick={() => onSelect(preset)}>
            {preset.name} ({preset.entries.length} entries)
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
