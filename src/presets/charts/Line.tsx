"use client";
// The line chart preset (feature 002, T111): a series over time, one line
// per series with a dot at each category, drawn with recharts in the Averlo
// tokens. No tooltip and no interactive legend; no animation, so the
// slide's own entrance is the only motion and print and the strips stay
// still.
import {
  CartesianGrid,
  Line,
  LineChart,
  LineDrawShape,
  XAxis,
  YAxis,
} from "recharts";
import type { PresetProps } from "..";
import {
  BORDER,
  CANVAS,
  CategoryTick,
  ChartFrame,
  MUTED,
  categoryTicks,
  leftRoom,
  formatNumber,
  seriesColour,
  useBox,
  type Box,
} from "./frame";
import { say } from "../say";
import styles from "./charts.module.css";

export function LinePreset({ block, lang }: PresetProps<"chart">) {
  const [ref, box] = useBox();
  const labels = block.categories.map((c) => say(c, lang));
  const n = block.series.length;
  const colours = block.series.map((_, i) => seriesColour(i, n));
  const rows = labels.map((_, j) => ({
    i: j,
    ...Object.fromEntries(block.series.map((s, k) => [`s${k}`, s.values[j]])),
  }));

  function plot(b: Box) {
    // The y axis's room, estimated before recharts lays out its ticks; a
    // line's points sit at the bands' edges, so the first and last labels
    // get half a band of padding each.
    const axis = b.font * 4;
    const band = (b.width - axis) / labels.length;
    const ticks = categoryTicks(labels, band, b);
    const stroke = Math.max(2, b.font * 0.16);
    const dot = Math.max(3, b.font * 0.3);
    return (
      <LineChart
        width={b.width}
        height={b.height}
        data={rows}
        margin={{
          top: dot * 2,
          right: 0,
          bottom: 0,
          left: leftRoom(ticks, band, b),
        }}
        accessibilityLayer={false}
      >
        <CartesianGrid vertical={false} stroke={BORDER} />
        <XAxis
          dataKey="i"
          type="category"
          interval={0}
          height={ticks.height}
          padding={{ left: band / 2, right: band / 2 }}
          tickLine={false}
          axisLine={{ stroke: BORDER }}
          tick={(props) => (
            <CategoryTick
              x={Number(props.x)}
              y={Number(props.y)}
              label={labels[Number(props.payload.value)]}
              ticks={ticks}
              box={b}
            />
          )}
        />
        <YAxis
          width="auto"
          tickLine={false}
          axisLine={false}
          tick={{ fill: MUTED, fontSize: b.font }}
          tickFormatter={(v: number) => formatNumber(v, lang)}
        />
        {block.series.map((_, k) => (
          <Line
            key={k}
            dataKey={`s${k}`}
            type="linear"
            isAnimationActive={false}
            strokeWidth={stroke}
            dot={{
              r: dot,
              strokeWidth: stroke,
              style: { fill: colours[k], stroke: CANVAS },
            }}
            activeDot={false}
            shape={(props) => (
              <LineDrawShape
                {...props}
                style={{ stroke: colours[k], fill: "none" }}
                data-mark=""
              />
            )}
          />
        ))}
      </LineChart>
    );
  }

  return (
    <ChartFrame
      kind="line"
      unit={block.unit}
      source={block.source}
      legend={block.series.map((s, i) => ({
        name: s.name,
        colour: colours[i],
      }))}
      lang={lang}
      plot={
        <div ref={ref} className={styles.plot}>
          {box && plot(box)}
        </div>
      }
    />
  );
}
