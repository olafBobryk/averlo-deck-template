import { Fullscreen, Maximize2, Minimize2 } from "lucide-react";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

/** The menu's icons: the Averlo `Icon` (lucide) by its own names, plus the
 *  three the menu needs that its registry lacks, drawn from the same lucide
 *  set the way `Icon` draws its own. Each glyph names itself in
 *  `data-icon`. The mapping from the origin's Material Symbols names is in
 *  docs/carried/deck.md. */
export type DeckIconName = IconName | "maximize" | "minimize" | "fullscreen";

const extra = {
  maximize: Maximize2,
  minimize: Minimize2,
  fullscreen: Fullscreen,
};

export function DeckIcon({
  name,
  size = 16,
  className,
}: {
  name: DeckIconName;
  size?: number;
  className?: string;
}) {
  if (name in extra) {
    const Glyph = extra[name as keyof typeof extra];
    return (
      <Glyph
        aria-hidden
        className={className ? `shrink-0 ${className}` : "shrink-0"}
        size={size}
        strokeWidth={2}
        data-icon={name}
      />
    );
  }
  return (
    <Icon
      name={name as IconName}
      size={size}
      className={className}
      data-icon={name}
    />
  );
}
