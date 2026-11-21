// The slides' content types. Each slide's content is kept in a map keyed by
// slide id (the template's is in slides.ts) and read through `slideContent`.

import type { IconName } from "@/_origin-temp/ui/primitives/icon/Icon";
import type { Text } from "./model";
import { content } from "./slides";

export type Item = { text: Text };
type Labelled = { label: Text };
/** `icon`: a glyph from the icon set, where it names what the item stands
 *  for. */
export type Point = Labelled & { text?: Text; icon?: IconName };
export type Step = Labelled & {
  when?: Text;
  text?: Text;
  status?: "done" | "current" | "upcoming";
};
export type Fact = { label: Text; text?: Text };
/** A mark on the plan's time axis: a date (`at`) or a span. */
export type Mark = {
  label: Text;
  at?: string;
  span?: [string, string];
  status?: "done" | "current" | "upcoming";
};
export type Day = {
  day: Text;
  label: Text;
  text?: Text;
  icon?: IconName;
};

/** Slide compositions: each block draws one evidence pattern. */
export type Block =
  | { type: "lead"; item: Item; size?: "statement" }
  | {
      type: "points";
      items: Point[];
      columns?: 2 | 3 | 4 | 5;
      /** cards (default), numbered rows, or chips for a short checklist. */
      style?: "cards" | "numbered" | "chips";
    }
  | { type: "steps"; items: Step[]; style?: "rail" | "nodes" }
  | { type: "facts"; items: Fact[] }
  | { type: "note"; item: Item }
  /** One node over the roles that report to it. */
  | { type: "org"; root: Point; items: Point[]; style?: "tree" }
  /** One stage branching into options. */
  | { type: "fork"; root: Point; items: Point[] }
  /** A working week with its fixed moments. */
  | { type: "week"; days: Text[]; items: Day[] }
  /** A time axis from `start` to `end` (YYYY-MM). */
  | { type: "plan"; start: string; end: string; items: Mark[] };

/** A big line. `muted`: its obvious lead-in (or any one part of it), per
 *  language, word for word as it stands in `text`, set in the secondary tone
 *  inside the same block. */
export type Headline = Item & { muted?: Text };

export type SlideContent = {
  headline?: Headline;
  blocks: Block[];
  /** stack (default): heading over blocks; split: heading left, blocks
   *  right (split-end mirrors it); center: a quote or the closing in the
   *  middle; statement: one large claim at the bottom left. */
  layout?: "stack" | "split" | "split-end" | "center" | "statement" | "module";
  /** Speaker prompts; kept in the content draft, not drawn on the slide. */
  notes?: Text;
};

/** A slide's content. */
export function slideContent(id: string): SlideContent {
  return content[id] ?? { blocks: [] };
}
