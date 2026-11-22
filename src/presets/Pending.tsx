import type { PresetBlock } from "@/deck/content";
import { Text } from "@/deck/text";

/** A neutral stand-in, template-owned, for a preset block whose component
 *  is not built yet: it names the block type and nothing else. Removed once
 *  every preset block has its component (src/presets/index.ts). */
export function Pending({ block }: { block: PresetBlock }) {
  return (
    <Text as="p" variant="body-m" tone="secondary" data-preset-pending="">
      Preset pending: {block.type}
    </Text>
  );
}
