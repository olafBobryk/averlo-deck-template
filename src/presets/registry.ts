// Every preset visual (feature 002, data-model.md "Preset registry"): its
// name, its family, the block it draws, the source structure it fits, an
// example, and a second, different example (`alternate`) that shows it
// needs no polishing with new content (SC-005). The gallery
// (src/presets/gallery.ts) and the skill's preset reference are generated
// from it. Examples carry placeholder text and placeholder numbers only.
// Imported by the registry test under plain Node, so it imports types only.
import type { Block, SlideContent } from "@/deck/content";
import type { Text } from "@/deck/model";

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
  /** The slide layout its gallery slides use; without one, `stack`. The
   *  statement is the `statement` layout, and image + text the `split`
   *  layout. */
  layout?: SlideContent["layout"];
};

/** Placeholder words in every language (rule 9). A deck with more
 *  languages adds each here; the type and the registry test say so. */
// Literal texts, so a second language is added to them like every other
// `Text` (tests/languages.spec.ts adds it to each `en: "…"` it finds).
const title: Text = { en: "Placeholder title" };
const text: Text = { en: "Placeholder text" };
/** A placeholder date, for a timeline's events. */
const when: Text = { en: "Placeholder date" };
/** A longer placeholder, for an alternate that wraps over more lines. */
const longText: Text = {
  en: "Placeholder text, placeholder text, placeholder text, placeholder text.",
};
/** `n` placeholder categories. */
const categories = (n: number) => Array.from({ length: n }, () => text);
/** `n` copies of an item. */
const times = <T>(n: number, item: T) => Array.from({ length: n }, () => item);

/** The presets. Later phases add one entry per preset. */
export const registry: PresetEntry[] = [
  // Charts and stats (phase V1). Every number below is a round placeholder
  // value, not data.
  {
    name: "Bar chart",
    family: "charts",
    block: "chart",
    fits: "Categories compared: one or more values for each category.",
    example: {
      type: "chart",
      kind: "bar",
      categories: categories(4),
      series: [{ name: title, values: [40, 60, 80, 50] }], // placeholders
      unit: text,
      source: text,
    },
    alternate: {
      type: "chart",
      kind: "bar",
      categories: categories(6),
      series: [
        { name: title, values: [20, 40, 30, 50, 60, 40] }, // placeholders
        { name: title, values: [30, 30, 50, 40, 50, 70] }, // placeholders
      ],
      source: text,
    },
  },
  {
    name: "Line chart",
    family: "charts",
    block: "chart",
    fits: "A series over time: values at ordered periods.",
    example: {
      type: "chart",
      kind: "line",
      categories: categories(6),
      series: [{ name: title, values: [10, 20, 30, 30, 40, 50] }], // placeholders
      unit: text,
      source: text,
    },
    alternate: {
      type: "chart",
      kind: "line",
      categories: categories(8),
      series: [
        { name: title, values: [50, 40, 40, 30, 30, 20, 20, 10] }, // placeholders
        { name: title, values: [10, 20, 20, 30, 40, 40, 50, 60] }, // placeholders
        { name: title, values: [30, 30, 30, 30, 20, 30, 30, 30] }, // placeholders
      ],
      unit: text,
    },
  },
  {
    name: "Donut chart",
    family: "charts",
    block: "chart",
    fits: "Parts of a whole: one value for each part.",
    example: {
      type: "chart",
      kind: "donut",
      categories: categories(4),
      series: [{ name: title, values: [40, 30, 20, 10] }], // placeholders
      unit: text,
      source: text,
    },
    alternate: {
      type: "chart",
      kind: "donut",
      categories: categories(6),
      series: [{ name: title, values: [30, 20, 20, 10, 10, 10] }], // placeholders
      source: text,
    },
  },
  {
    name: "Stat cards",
    family: "charts",
    block: "stat",
    fits: "One to four headline figures, each with its label.",
    example: {
      type: "stat",
      items: [
        // Placeholder values, written as a source would write them.
        { value: "10", label: title, note: text },
        { value: "20", label: title, note: text },
        { value: "30", label: title, note: text },
      ],
    },
    alternate: {
      type: "stat",
      items: [
        // Placeholder values.
        { value: "40", label: title, unit: text },
        { value: "50", label: title, unit: text },
        { value: "60", label: title },
        { value: "70", label: title, note: text },
      ],
    },
  },
  // Diagrams (phase V2).
  {
    name: "Process flow",
    family: "diagrams",
    block: "flow",
    fits: "Ordered steps, each leading to the next.",
    example: { type: "flow", steps: times(4, { label: title, text }) },
    alternate: { type: "flow", steps: times(7, { label: title }) },
  },
  {
    name: "Timeline",
    family: "diagrams",
    block: "timeline",
    fits: "Dated events, in date order.",
    example: {
      type: "timeline",
      events: times(4, { when, label: title, text }),
    },
    alternate: { type: "timeline", events: times(8, { when, label: title }) },
  },
  {
    name: "Cycle",
    family: "diagrams",
    block: "cycle",
    fits: "A loop: stages that repeat, the last leading back to the first.",
    example: { type: "cycle", stages: times(4, { label: title, text }) },
    alternate: { type: "cycle", stages: times(6, { label: title }) },
  },
  {
    name: "Org chart",
    family: "diagrams",
    block: "orgchart",
    fits: "Reporting lines: a root, the nodes under it, and theirs.",
    example: {
      type: "orgchart",
      root: { label: title, text },
      children: [
        { node: { label: title }, children: times(2, { label: title }) },
        { node: { label: title }, children: times(1, { label: title }) },
        { node: { label: title }, children: times(2, { label: title }) },
      ],
    },
    alternate: {
      type: "orgchart",
      root: { label: title },
      children: times(4, { node: { label: title, text } }),
    },
  },
  {
    name: "Comparison table",
    family: "diagrams",
    block: "table",
    fits: "Options against criteria: one cell for each option and criterion.",
    example: {
      type: "table",
      columns: times(3, title),
      rows: times(4, { label: title, cells: times(3, text) }),
    },
    alternate: {
      type: "table",
      columns: times(5, title),
      rows: times(3, { label: title, cells: times(5, text) }),
    },
  },
  {
    name: "2×2 matrix",
    family: "diagrams",
    block: "matrix",
    fits: "Two axes: four quadrants, and items placed by their x and y.",
    example: {
      type: "matrix",
      x: text,
      y: text,
      quadrants: [
        { label: title, text },
        { label: title, text },
        { label: title, text },
        { label: title, text },
      ],
      // Placeholder positions, from 0 to 1.
      items: [
        { label: text, x: 0.2, y: 0.6 },
        { label: text, x: 0.8, y: 0.1 },
        { label: text, x: 0.3, y: 0.1 },
      ],
    },
    alternate: {
      type: "matrix",
      x: title,
      y: title,
      quadrants: [
        { label: title },
        { label: title },
        { label: title },
        { label: title },
      ],
      // Placeholder positions, from 0 to 1.
      items: [
        { label: text, x: 0.15, y: 0.68 },
        { label: text, x: 0.85, y: 0.56 },
        { label: text, x: 0.4, y: 0.32 },
        { label: text, x: 0.85, y: 0.18 },
        { label: text, x: 0.15, y: 0.06 },
      ],
    },
  },
  // Text layouts (phase V3).
  {
    name: "Quote",
    family: "text",
    block: "quote",
    fits: "A quotation, word for word, with who said it.",
    example: { type: "quote", text, by: title, role: text },
    alternate: { type: "quote", text: longText, by: title },
  },
  {
    name: "Statement",
    family: "text",
    block: "lead",
    fits: "One claim, said large, with a line under it.",
    layout: "statement",
    example: { type: "lead", item: { text }, size: "statement" },
    alternate: { type: "lead", item: { text: longText }, size: "statement" },
  },
  {
    name: "Agenda",
    family: "text",
    block: "agenda",
    fits: "A list of topics, in the order they come.",
    example: {
      type: "agenda",
      items: times(4, { label: title, text }),
    },
    alternate: { type: "agenda", items: times(8, { label: title }) },
  },
  {
    name: "Compare",
    family: "text",
    block: "compare",
    fits: "Two options side by side, each with its points.",
    example: {
      type: "compare",
      left: { title, points: times(3, text) },
      right: { title, points: times(3, text) },
    },
    alternate: {
      type: "compare",
      left: { title, points: times(2, longText) },
      right: { title, points: times(5, text) },
    },
  },
  {
    name: "Image and text",
    family: "text",
    block: "image",
    fits: "A picture with its point beside it.",
    layout: "split",
    example: { type: "image", alt: text, caption: text },
    alternate: { type: "image", alt: text, fit: "contain" },
  },
  // Image slides (phase V3). No image has a `src`: the gallery shows the
  // template's placeholder only.
  {
    name: "Full-bleed image",
    family: "images",
    block: "image",
    fits: "One picture that carries the slide, edge to edge.",
    example: { type: "image", alt: text, bleed: true },
    alternate: {
      type: "image",
      alt: text,
      caption: text,
      fit: "contain",
      bleed: true,
    },
  },
  {
    name: "Captioned image",
    family: "images",
    block: "image",
    fits: "One picture with a line that says what it shows.",
    example: { type: "image", alt: text, caption: text },
    alternate: { type: "image", alt: text, caption: longText, fit: "contain" },
  },
  {
    name: "Image grid",
    family: "images",
    block: "imageGrid",
    fits: "Two to six pictures shown together.",
    example: {
      type: "imageGrid",
      images: times(3, { alt: text, caption: text }),
    },
    alternate: { type: "imageGrid", images: times(6, { alt: text }) },
  },
];
