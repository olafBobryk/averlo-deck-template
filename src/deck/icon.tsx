import { Maximize2, Minimize2 } from "lucide-react";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

/** The menu's icons: the Averlo `Icon` (lucide) by its own names, plus the
 *  two the menu needs that its registry lacks, drawn from the same lucide
 *  set the way `Icon` draws its own. Each glyph names itself in
 *  `data-icon`. The mapping from the origin's Material Symbols names is in
 *  docs/carried/deck.md. */
export type DeckIconName = IconName | "maximize" | "minimize";

const extra = { maximize: Maximize2, minimize: Minimize2 };

export function DeckIcon({
  name,
  size = 16,
}: {
  name: DeckIconName;
  size?: number;
}) {
  if (name === "maximize" || name === "minimize") {
    const Glyph = extra[name];
    return (
      <Glyph
        aria-hidden
        className="shrink-0"
        size={size}
        strokeWidth={2}
        data-icon={name}
      />
    );
  }
  return <Icon name={name} size={size} data-icon={name} />;
}
