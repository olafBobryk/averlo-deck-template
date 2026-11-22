"use client";
// The chart presets' shared frame (feature 002, T111), template-owned: the
// figure around a recharts chart, with a static legend over it when there
// are two or more series, the plot box the chart is drawn in, and the
// source muted under it. The unit is not a caption line (owner on T050:
// "isnt that trippling titling bad?"; T051): a bar or line chart sets it
// along its value axis (`unitLabel`), a donut with each value in its key. Colours are the Averlo tokens through CSS
// variables only: the accent for the first series, then a muted scale mixed
// from the foreground into the background, from the muted token's 75% down
// to 50%, each step at least 4.5:1 on the canvas and the surface. Grid and
// axis lines are the border token; text is Inter, inherited.
import { useCallback, useState, type ReactNode, type RefCallback } from "react";
import type { Lang } from "@/deck/langs";
import type { Text as Words } from "@/deck/model";
import { Text } from "@/deck/text";
import { say } from "../say";
import styles from "./charts.module.css";

/** The first series' colour, then the muted scale. */
export const ACCENT = "var(--color-accent)";
export const MUTED = "var(--color-muted)";
export const BORDER = "var(--color-border)";
export const CANVAS = "var(--color-background)";

/** The colour of series (or donut slice) `i` of `n`: the accent first, then
 *  greys from the muted token's mix (75% foreground) down to 50%. */
export function seriesColour(i: number, n: number) {
  if (i === 0) return ACCENT;
  if (i === 1) return MUTED;
  const greys = Math.max(n - 1, 2);
  const share = 75 - ((i - 1) * 25) / (greys - 1);
  return `color-mix(in srgb, var(--color-foreground) ${share.toFixed(1)}%, var(--color-background))`;
}

/** The plot box's measured size and its text: the chart is drawn at this
 *  size, with ticks in this font, so it sizes with the slide (--u) live, in
 *  a thumbnail and on a PDF page. Until it is measured, nothing is drawn. */
export type Box = {
  width: number;
  height: number;
  font: number;
  family: string;
  weight: string;
};

export function useBox(): [RefCallback<HTMLDivElement>, Box | null] {
  const [box, setBox] = useState<Box | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const next = {
        width: Math.floor(width),
        height: Math.floor(height),
        font: parseFloat(style.fontSize),
        family: style.fontFamily,
        weight: style.fontWeight,
      };
      setBox((prev) =>
        prev &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.font === next.font &&
        prev.family === next.family
          ? prev
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // Fonts change the measure, not the size: measure again once loaded.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, []);
  return [ref, box];
}

let canvas: HTMLCanvasElement | null = null;
/** A text's width in the box's font. */
export function textWidth(text: string, box: Box) {
  canvas ??= document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.length * box.font * 0.6;
  context.font = `${box.weight} ${box.font}px ${box.family}`;
  return context.measureText(text).width;
}

/** A plain number in the deck's language: grouped digits, never
 *  translated. */
export const formatNumber = (value: number, lang: Lang) =>
  new Intl.NumberFormat(lang).format(value);

/** How the category axis sets its labels in a band: on one line, wrapped
 *  at spaces, or at 45 degrees when a word is wider than its band. Every
 *  label is always drawn, word for word. */
export type Ticks = {
  lines: (label: string) => string[];
  angled: boolean;
  /** The labels' font size (smaller than the ticks' when a word is wide). */
  font: number;
  height: number;
  /** How far the first label reaches left of its band's centre. */
  reach: number;
};

export function categoryTicks(
  labels: string[],
  band: number,
  base: Box,
): Ticks {
  const room = band * 0.92;
  // Labels always sit centred under their bar (owner: "center the x axis
  // always"): when a word is wider than its band, the labels get smaller
  // until it fits, never turned.
  const widestWord = Math.max(
    ...labels
      .flatMap((label) => label.split(/\s+/))
      .map((w) => textWidth(w, base)),
  );
  const scale = widestWord > room ? Math.max(0.6, room / widestWord) : 1;
  const box = { ...base, font: base.font * scale };
  const lineHeight = box.font * 1.25;
  const pad = box.font * 0.8;
  const wrap = (label: string) => {
    const lines: string[] = [];
    for (const word of label.split(/\s+/)) {
      const last = lines.at(-1);
      if (last !== undefined && textWidth(`${last} ${word}`, box) <= room)
        lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  const most = Math.max(...labels.map((label) => wrap(label).length));
  return {
    lines: wrap,
    angled: false,
    font: box.font,
    height: Math.ceil(most * lineHeight + pad),
    reach: Math.max(...wrap(labels[0]).map((line) => textWidth(line, box))) / 2,
  };
}

/** The chart's left margin, so the first category label stays inside the
 *  plot box: its reach, less the half band and the y axis's least width. */
export const leftRoom = (ticks: Ticks, band: number, box: Box) =>
  Math.max(0, Math.ceil(ticks.reach - band / 2 - box.font * 1.5));

/** One category label under its band (a recharts XAxis tick). */
export function CategoryTick({
  x,
  y,
  label,
  ticks,
  box,
}: {
  x: number;
  y: number;
  label: string;
  ticks: Ticks;
  box: Box;
}) {
  const top = y + box.font * 0.6;
  if (ticks.angled)
    return (
      <text
        data-category=""
        x={x}
        y={top}
        dy="0.71em"
        textAnchor="end"
        transform={`rotate(-45 ${x} ${top})`}
        className={styles.tick}
        fontSize={box.font}
      >
        {label}
      </text>
    );
  return (
    <text
      data-category=""
      x={x}
      y={top}
      textAnchor="middle"
      className={styles.tick}
      fontSize={ticks.font}
    >
      {ticks.lines(label).map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? "0.71em" : "1.25em"}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** The room the value axis's unit takes at the chart's left edge. */
export const unitRoom = (unit: string | undefined, box: Box) =>
  unit ? Math.ceil(box.font * 1.9) : 0;

/** The value axis's unit (a recharts YAxis `label`): set along the axis,
 *  turned a quarter, muted like the ticks, in the room `unitRoom` leaves at
 *  the chart's left edge; none without a unit. */
export function unitLabel(unit: string | undefined, box: Box) {
  if (!unit) return undefined;
  return {
    content: (props: { viewBox?: unknown }) => {
      const view = props.viewBox as { y: number; height: number };
      const x = box.font * 0.75;
      const y = view.y + view.height / 2;
      return (
        <text
          data-axis-unit=""
          x={x}
          y={y}
          transform={`rotate(-90 ${x} ${y})`}
          textAnchor="middle"
          dominantBaseline="central"
          className={styles.tick}
          fontSize={box.font}
        >
          {unit}
        </text>
      );
    },
  };
}

/** A colour swatch, its colour from a token. */
export function Swatch({ colour, line }: { colour: string; line?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={styles.swatch}
      data-line={line ? "" : undefined}
      style={{ background: colour }}
    />
  );
}

/** The figure: any legend over the plot, the source under. */
export function ChartFrame({
  kind,
  source,
  legend,
  lang,
  children,
  plot,
}: {
  kind: "bar" | "line" | "donut";
  source?: Words;
  /** The series' names and colours; shown only for two or more. */
  legend?: { name: Words; colour: string }[];
  lang: Lang;
  /** The plot box, measured: its ref and contents. */
  plot: ReactNode;
  children?: ReactNode;
}) {
  const showLegend = legend && legend.length > 1;
  return (
    <figure className={styles.chart} data-chart={kind}>
      {showLegend && (
        <ul className={styles.legend} data-legend="">
          {legend.map((item, i) => (
            <li key={i} className={styles.legendItem}>
              <Swatch colour={item.colour} line={kind === "line"} />
              <Text as="span" variant="label-m" tone="secondary">
                {say(item.name, lang)}
              </Text>
            </li>
          ))}
        </ul>
      )}
      {plot}
      {children}
      {source && (
        <Text
          as="figcaption"
          variant="label-m"
          tone="secondary"
          className={styles.source}
          data-source=""
        >
          {say(source, lang)}
        </Text>
      )}
    </figure>
  );
}
