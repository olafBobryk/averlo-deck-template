"use client";
// The bar chart preset (feature 002, T111): categories compared, one bar
// per category in each series, drawn with recharts in the Averlo tokens.
// No tooltip and no interactive legend; no animation, so the slide's own
// entrance is the only motion and print and the strips stay still.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import type { PresetProps } from "..";
import {
  BORDER,
  type Box,
  CategoryTick,
  ChartFrame,
  MUTED,
  categoryTicks,
  leftRoom,
  formatNumber,
  seriesColour,
  unitLabel,
  unitRoom,
  useBox,
} from "./frame";
import { say } from "../say";
import styles from "./charts.module.css";

export function BarPreset({ block, lang }: PresetProps<"chart">) {
  const [ref, box] = useBox();
  const labels = block.categories.map((c) => say(c, lang));
  const n = block.series.length;
  const colours = block.series.map((_, i) => seriesColour(i, n));
  const unit = block.unit ? say(block.unit, lang) : undefined;
  const rows = labels.map((label, j) => ({
    i: j,
    ...Object.fromEntries(block.series.map((s, k) => [`s${k}`, s.values[j]])),
  }));
  return (
    <ChartFrame
      kind="bar"
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

  function plot(b: Box) {
    // The y axis's room, estimated before recharts lays out its ticks.
    const axis = b.font * 4 + unitRoom(unit, b);
    const band = (b.width - axis) / labels.length;
    const ticks = categoryTicks(labels, band, b);
    const radius = Math.max(2, b.font * 0.2);
    return (
      <BarChart
        width={b.width}
        height={b.height}
        data={rows}
        margin={{
          top: b.font * 0.6,
          right: 0,
          bottom: 0,
          left: unitRoom(unit, b) + leftRoom(ticks, band, b),
        }}
        barCategoryGap="24%"
        barGap={Math.max(2, b.font * 0.2)}
        accessibilityLayer={false}
      >
        <CartesianGrid vertical={false} stroke={BORDER} />
        <XAxis
          dataKey="i"
          type="category"
          interval={0}
          height={ticks.height}
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
          label={unitLabel(unit, b)}
        />
        {block.series.map((_, k) => (
          <Bar
            key={k}
            dataKey={`s${k}`}
            isAnimationActive={false}
            shape={(props) => (
              <Rectangle
                {...props}
                radius={[radius, radius, 0, 0]}
                style={{ fill: colours[k] }}
                data-mark=""
              />
            )}
          />
        ))}
      </BarChart>
    );
  }
}
