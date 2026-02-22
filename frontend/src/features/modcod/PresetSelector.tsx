import { Button, Menu } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import { DVB_S2X_PRESETS, type ModcodPreset } from "../../data/dvbs2xPresets";
import { NR_5G_PRESETS } from "../../data/nr5gPresets";

const ALL_PRESETS: readonly ModcodPreset[] = [...DVB_S2X_PRESETS, ...NR_5G_PRESETS];

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
        {ALL_PRESETS.map((preset) => (
          <Menu.Item key={preset.name} onClick={() => onSelect(preset)}>
            {preset.name} ({preset.entries.length} entries)
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
