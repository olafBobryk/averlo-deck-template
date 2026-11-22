// The slides' content types. Each slide's content is kept in a map keyed by
// slide id (the template's is in slides.ts) and read through `slideContent`.

import type { IconName } from "@/components/ui/icons/Icon";
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
  | { type: "org"; root: Point; items: Point[] }
  /** One stage branching into options. */
  | { type: "fork"; root: Point; items: Point[] }
  /** A working week with its fixed moments. */
  | { type: "week"; days: Text[]; items: Day[] }
  /** A time axis from `start` to `end` (YYYY-MM). */
  | { type: "plan"; start: string; end: string; items: Mark[] }
  | PresetBlock;

/** The preset visuals' blocks (feature 002, data-model.md), drawn by
 *  src/presets/ and checked by its validator (src/presets/validate.ts),
 *  which holds their limits. */
/** A labelled line with optional body text. */
type Entry = Labelled & { text?: Text };
export type PresetBlock =
  /** At most 12 categories; one value per category in each series; a donut
   *  has one series. */
  | {
      type: "chart";
      kind: "bar" | "line" | "donut";
      categories: Text[];
      series: { name: Text; values: number[] }[];
      unit?: Text;
      source?: Text;
    }
  /** 1 to 4 items; `value` as the source writes it. */
  | {
      type: "stat";
      items: { value: string; label: Text; unit?: Text; note?: Text }[];
    }
  /** 2 to 7 steps, in order. */
  | { type: "flow"; steps: Entry[] }
  /** 2 to 8 events, in date order. */
  | { type: "timeline"; events: (Entry & { when: Text })[] }
  /** 3 to 6 stages. */
  | { type: "cycle"; stages: Entry[] }
  /** Two levels below the root at most. */
  | {
      type: "orgchart";
      root: Point;
      children: { node: Point; children?: Point[] }[];
    }
  /** At most 5 columns and 8 rows. */
  | { type: "table"; columns: Text[]; rows: { label: Text; cells: Text[] }[] }
  /** x and y from 0 to 1. */
  | {
      type: "matrix";
      x: Text;
      y: Text;
      quadrants: [Point, Point, Point, Point];
      items?: { label: Text; x: number; y: number }[];
    }
  | { type: "quote"; text: Text; by?: Text; role?: Text }
  /** 2 to 8 items. */
  | { type: "agenda"; items: Entry[] }
  | {
      type: "compare";
      left: { title: Text; points: Text[] };
      right: { title: Text; points: Text[] };
    }
  /** `src`: a path under public/images/; without it, the placeholder. */
  | {
      type: "image";
      src?: string;
      alt: Text;
      caption?: Text;
      fit?: "cover" | "contain";
      bleed?: boolean;
    }
  /** 2 to 6 images. */
  | { type: "imageGrid"; images: { src?: string; alt: Text; caption?: Text }[] }
  /** A deck's own visual: `visual` names an export of src/deck/visuals/. */
  | { type: "custom"; visual: string; props: Record<string, unknown> };

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

/** A slide's content, from the template's map or another deck's (the
 *  preset gallery's, through `DeckContext`). */
export function slideContent(
  id: string,
  from: Record<string, SlideContent> = content,
): SlideContent {
  return from[id] ?? { blocks: [] };
}
