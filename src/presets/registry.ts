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
