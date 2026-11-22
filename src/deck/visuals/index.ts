// The deck's own composed visuals (feature 002, research D3; FR-010),
// template-owned: a visual no preset fits, built for this deck only from
// Averlo parts (the ported `Panel`, `Text` through `@/deck/text`, `Icon`
// and the deck's tokens). A slide file (src/slides/, feature 003) imports
// one from this folder and draws it like any component, in a
// `<Block type="custom">`, its words from the slide's `copy`; the composed
// visual example (src/presets/slides/composed/) shows how. The template
// ships none. Export each below too, under its name: the preset validator
// (src/presets/validate.ts) checks a `custom` block's name against this
// map. To make one a shared preset, follow "Promote a visual to a preset"
// in process/workflows.md.
import type { ComponentType } from "react";
import type { Lang } from "@/deck/langs";

/** What a deck's visual takes: its block's `props`, as the slide gives
 *  them, the language, and `still` for thumbnails and print. */
export type DeckVisualProps = {
  props: Record<string, unknown>;
  lang: Lang;
  still?: boolean;
};

/** A deck's composed visual. */
export type DeckVisual = ComponentType<DeckVisualProps>;

/** The deck's visuals, by the name a `custom` block gives. Empty in the
 *  template. */
export const visuals: Record<string, DeckVisual> = {};
