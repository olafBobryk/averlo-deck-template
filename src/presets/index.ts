// The preset visuals, by block type (feature 002). The deck's block switch
// (src/deck/SlideBody.tsx) hands every preset block to `PresetView`, which
// draws it with its component from src/components/deck/ (feature 003,
// T311), its words as plain strings in the slide's language (`plain`). A
// block type without a component draws the neutral pending stub.
import { createElement, type ComponentType } from "react";
import {
  Agenda,
  Chart,
  Compare,
  Cycle,
  Flow,
  Image,
  ImageGrid,
  Matrix,
  OrgChart,
  Quote,
  Stat,
  Table,
  Timeline,
} from "@/components/deck";
import type { PresetBlock } from "@/deck/content";
import type { Lang } from "@/deck/langs";
import { Pending } from "./Pending";
import { plain } from "./say";
import { CustomPreset } from "./visuals";

type PresetType = PresetBlock["type"];

/** What a preset's component takes: its block, the language, and `still`
 *  for thumbnails and print. Content only, no style options (FR-002). */
export type PresetProps<T extends PresetType = PresetType> = {
  block: Extract<PresetBlock, { type: T }>;
  lang: Lang;
  still?: boolean;
};

/** A block's fields, its words in one language, without its type. */
function fields<B extends { type: string }>(block: B, lang: Lang) {
  const { type, ...rest } = plain(block, lang);
  void type;
  return rest;
}

/** Each preset block type's component. */
const presets: { [T in PresetType]?: ComponentType<PresetProps<T>> } = {
  chart: ({ block, lang }) =>
    createElement(Chart, { ...fields(block, lang), lang }),
  stat: ({ block, lang }) => createElement(Stat, fields(block, lang)),
  flow: ({ block, lang }) => createElement(Flow, fields(block, lang)),
  timeline: ({ block, lang }) => createElement(Timeline, fields(block, lang)),
  cycle: ({ block, lang }) => createElement(Cycle, fields(block, lang)),
  orgchart: ({ block, lang }) => createElement(OrgChart, fields(block, lang)),
  table: ({ block, lang }) => createElement(Table, fields(block, lang)),
  matrix: ({ block, lang }) => createElement(Matrix, fields(block, lang)),
  quote: ({ block, lang }) => createElement(Quote, fields(block, lang)),
  agenda: ({ block, lang }) => createElement(Agenda, fields(block, lang)),
  compare: ({ block, lang }) => createElement(Compare, fields(block, lang)),
  image: ({ block, lang }) => createElement(Image, fields(block, lang)),
  imageGrid: ({ block, lang }) => createElement(ImageGrid, fields(block, lang)),
  // A composed visual: the deck's own (src/deck/visuals/index.ts), or in
  // the gallery the template's example.
  custom: CustomPreset,
};

/** A preset block, drawn by its component, or by the pending stub while it
 *  has none. */
export function PresetView(props: PresetProps) {
  const component = (presets[props.block.type] ??
    Pending) as ComponentType<PresetProps>;
  return createElement(component, props);
}
