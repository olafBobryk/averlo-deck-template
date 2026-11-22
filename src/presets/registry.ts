// Every preset visual (feature 002, data-model.md "Preset registry"; feature
// 003, T331): its name, its family, the block it draws, the source
// structure it fits, the layout its slide uses, and its example slide file,
// `src/presets/slides/<file>.tsx`, with a second example in
// `src/presets/slides/alternates/<file>.tsx`. A deck copies a preset's file
// into src/slides/ with a number and changes it freely. The gallery
// (src/presets/gallery.ts), the deck's showcase (src/slides/) and the
// skill's preset reference (scripts/presets-doc.mjs) follow this list.
// Imported by the tests under plain Node, so it imports types only.
import type { BlockType } from "@/components/deck/Slide";
import type { SlideLayout } from "@/deck/slide";

/** The preset families, in the gallery's order. */
export const families = ["charts", "diagrams", "text", "images"] as const;
export type Family = (typeof families)[number];

export type PresetEntry = {
  /** Unique across the registry. */
  name: string;
  /** Its example file's name in src/presets/slides/, without `.tsx`; its
   *  second example has the same name in src/presets/slides/alternates/. */
  file: string;
  family: Family;
  /** The block type its visual draws (`data-block`). */
  block: BlockType;
  /** One line: the source structure it suits. */
  fits: string;
  /** The slide layout its example uses. The statement is the `statement`
   *  layout, and image + text the `split` layout; the quote and the agenda
   *  are `split` too, with their body text beside them (T051). */
  layout: SlideLayout;
};

/** The presets, in the gallery's order. */
export const registry: PresetEntry[] = [
  // Charts and stats.
  {
    name: "Bar chart",
    file: "bar-chart",
    family: "charts",
    block: "chart",
    fits: "Categories compared: one or more values for each category.",
    layout: "stack",
  },
  {
    name: "Line chart",
    file: "line-chart",
    family: "charts",
    block: "chart",
    fits: "A series over time: values at ordered periods.",
    layout: "stack",
  },
  {
    name: "Donut chart",
    file: "donut-chart",
    family: "charts",
    block: "chart",
    fits: "Parts of a whole: one value for each part.",
    layout: "stack",
  },
  {
    name: "Stat cards",
    file: "stat-cards",
    family: "charts",
    block: "stat",
    fits: "One to four headline figures, each with its label.",
    layout: "stack",
  },
  // Diagrams.
  {
    name: "Process flow",
    file: "process-flow",
    family: "diagrams",
    block: "flow",
    fits: "Ordered steps, each leading to the next.",
    layout: "stack",
  },
  {
    name: "Timeline",
    file: "timeline",
    family: "diagrams",
    block: "timeline",
    fits: "Dated events, in date order.",
    layout: "stack",
  },
  {
    name: "Cycle",
    file: "cycle",
    family: "diagrams",
    block: "cycle",
    fits: "A loop: stages that repeat, the last leading back to the first.",
    layout: "stack",
  },
  {
    name: "Org chart",
    file: "org-chart",
    family: "diagrams",
    block: "orgchart",
    fits: "Reporting lines: a root, the nodes under it, and theirs.",
    layout: "stack",
  },
  {
    name: "Comparison table",
    file: "comparison-table",
    family: "diagrams",
    block: "table",
    fits: "Options against criteria: one cell for each option and criterion.",
    layout: "stack",
  },
  {
    name: "2×2 matrix",
    file: "2-2-matrix",
    family: "diagrams",
    block: "matrix",
    fits: "Two axes: four quadrants, and items placed by their x and y.",
    layout: "stack",
  },
  // Text layouts.
  {
    name: "Quote",
    file: "quote",
    family: "text",
    block: "quote",
    fits: "A quotation, word for word, with who said it.",
    layout: "split",
  },
  {
    name: "Statement",
    file: "statement",
    family: "text",
    block: "lead",
    fits: "One claim, said large, with a line under it.",
    layout: "statement",
  },
  {
    name: "Agenda",
    file: "agenda",
    family: "text",
    block: "agenda",
    fits: "A list of topics, in the order they come.",
    layout: "split",
  },
  {
    name: "Compare",
    file: "compare",
    family: "text",
    block: "compare",
    fits: "Two options side by side, each with its points.",
    layout: "stack",
  },
  {
    name: "Image and text",
    file: "image-and-text",
    family: "text",
    block: "image",
    fits: "A picture with its point beside it.",
    layout: "split",
  },
  // Image slides. No example has a `src`: each shows the template's
  // placeholder image.
  {
    name: "Full-bleed image",
    file: "full-bleed-image",
    family: "images",
    block: "image",
    fits: "One picture that carries the slide, edge to edge.",
    layout: "stack",
  },
  {
    name: "Captioned image",
    file: "captioned-image",
    family: "images",
    block: "image",
    fits: "One picture with a line that says what it shows.",
    layout: "stack",
  },
  {
    name: "Image grid",
    file: "image-grid",
    family: "images",
    block: "imageGrid",
    fits: "Two to six pictures shown together.",
    layout: "stack",
  },
];
