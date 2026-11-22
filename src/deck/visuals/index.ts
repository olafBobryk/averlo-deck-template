// The deck's own composed visuals (feature 002, research D3; FR-010),
// template-owned: a visual no preset fits, built for this deck only from
// Averlo parts (the ported `Panel`, `Text` through `@/deck/text`, `Icon`
// and the deck's tokens). A slide draws one with a block
// `{ type: "custom", visual: "<its name here>", props: { … } }`; every
// `Text` in `props` has a string for each language, like any slide text.
// The template ships none. To add one, put its component in this folder and
// export it below under the name the block uses; to make it a shared
// preset, follow "Promote a visual to a preset" in process/workflows.md.
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
