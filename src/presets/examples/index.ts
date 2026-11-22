// The template's example composed visuals (feature 002, T143), for the
// preset gallery only: src/presets/GalleryDeck.tsx adds them to the visuals
// a `custom` block may name there. The deck's own visuals are in
// src/deck/visuals/index.ts, empty in the template.
import type { DeckVisual } from "@/deck/visuals";
import { ComposedExample } from "./ComposedExample";

export const exampleVisuals: Record<string, DeckVisual> = { ComposedExample };
