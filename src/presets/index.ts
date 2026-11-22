// The preset visuals, by block type (feature 002). The deck's block switch
// (src/deck/SlideBody.tsx) hands every preset block to `PresetView`, which
// draws it with its component. Later phases add each component here; until
// then a block draws the neutral pending stub.
import { createElement, type ComponentType } from "react";
import type { PresetBlock } from "@/deck/content";
import type { Lang } from "@/deck/langs";
import { Pending } from "./Pending";
import { BarPreset } from "./charts/Bar";
import { DonutPreset } from "./charts/Donut";
import { LinePreset } from "./charts/Line";
import { StatPreset } from "./charts/Stat";
import { CompareTablePreset } from "./diagrams/CompareTable";
import { CyclePreset } from "./diagrams/Cycle";
import { FlowPreset } from "./diagrams/Flow";
import { MatrixPreset } from "./diagrams/Matrix";
import { OrgChartPreset } from "./diagrams/OrgChart";
import { TimelinePreset } from "./diagrams/Timeline";
import { ImagePreset } from "./images/Image";
import { ImageGridPreset } from "./images/ImageGrid";
import { AgendaPreset } from "./text/Agenda";
import { ComparePreset } from "./text/Compare";
import { QuotePreset } from "./text/Quote";
import { CustomPreset } from "./visuals";

type PresetType = PresetBlock["type"];

/** What a preset's component takes: its block, the language, and `still`
 *  for thumbnails and print. Content only, no style options (FR-002). */
export type PresetProps<T extends PresetType = PresetType> = {
  block: Extract<PresetBlock, { type: T }>;
  lang: Lang;
  still?: boolean;
};

/** A chart, drawn by its kind's component. */
function ChartPreset(props: PresetProps<"chart">) {
  const Kind = charts[props.block.kind];
  return createElement(Kind, props);
}
const charts = { bar: BarPreset, line: LinePreset, donut: DonutPreset };

/** Each preset block type's component. */
const presets: { [T in PresetType]?: ComponentType<PresetProps<T>> } = {
  chart: ChartPreset,
  stat: StatPreset,
  flow: FlowPreset,
  timeline: TimelinePreset,
  cycle: CyclePreset,
  orgchart: OrgChartPreset,
  table: CompareTablePreset,
  matrix: MatrixPreset,
  quote: QuotePreset,
  agenda: AgendaPreset,
  compare: ComparePreset,
  image: ImagePreset,
  imageGrid: ImageGridPreset,
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
