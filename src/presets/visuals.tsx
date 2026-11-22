"use client";
// The `custom` block (feature 002, research D3): a composed visual, drawn by
// the component its block names. The deck's slides draw the deck's own
// visuals (src/deck/visuals/index.ts). The preset gallery adds the
// template's example (src/presets/examples/) through `VisualsContext`, so
// the deck's map stays empty and the example is drawn only there.
import { createContext, createElement, useContext } from "react";
import { visuals as deckVisuals, type DeckVisual } from "@/deck/visuals";
import { Text } from "@/deck/text";
import type { PresetProps } from ".";

/** The visuals a `custom` block may name: the deck's, unless a provider
 *  (the gallery's) gives others. */
export const VisualsContext =
  createContext<Record<string, DeckVisual>>(deckVisuals);

export function CustomPreset({ block, lang, still }: PresetProps<"custom">) {
  const visual = useContext(VisualsContext)[block.visual];
  // A name the deck does not export: said on the slide, never left blank.
  // The validator (src/presets/validate.ts) rejects it too.
  if (!visual)
    return (
      <Text as="p" variant="body-m" tone="secondary" data-visual-missing="">
        Visual missing: {block.visual}
      </Text>
    );
  return createElement(visual, { props: block.props, lang, still });
}
