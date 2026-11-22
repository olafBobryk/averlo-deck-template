// Every preset visual (feature 002, data-model.md "Preset registry"): its
// name, its family, the block it draws, the source structure it fits, an
// example, and a second, different example (`alternate`) that shows it
// needs no polishing with new content (SC-005). The gallery
// (src/presets/gallery.ts) and the skill's preset reference are generated
// from it. Examples carry placeholder text and placeholder numbers only.
// Imported by the registry test under plain Node, so it imports types only.
import type { Block } from "@/deck/content";

/** The preset families, in the gallery's order. */
export const families = ["charts", "diagrams", "text", "images"] as const;
export type Family = (typeof families)[number];

export type PresetEntry = {
  /** Unique across the registry. */
  name: string;
  family: Family;
  /** The block type it draws. */
  block: Block["type"];
  /** One line: the source structure it suits. */
  fits: string;
  example: Block;
  alternate: Block;
};

/** The presets. Later phases add one entry per preset. */
export const registry: PresetEntry[] = [];
