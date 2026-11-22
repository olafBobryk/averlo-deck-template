"use client";
// A chart (feature 003, T311; the `chart` block): bar, line or donut,
// drawn by its kind's component with recharts in the Averlo tokens. At
// most 12 categories; one value per category in each series; a donut has
// one series. Numbers are formatted in `lang` (the deck's first language
// by default).
import { createElement } from "react";
import { langs, type Lang } from "@/deck/langs";
import { BarView } from "./Bar";
import type { ChartData } from "./frame";
import { DonutView } from "./Donut";
import { LineView } from "./Line";
import { reportLimits } from "../limits";

export type ChartSeries = ChartData["series"][number];

export type ChartProps = Omit<ChartData, "lang"> & {
  kind: "bar" | "line" | "donut";
  lang?: Lang;
};

const kinds = { bar: BarView, line: LineView, donut: DonutView };

export function Chart(props: ChartProps) {
  reportLimits("Chart", props);
  return createElement(kinds[props.kind], {
    ...props,
    lang: props.lang ?? langs[0],
  });
}
