"use client";
// The donut chart preset (feature 002, T111): parts of a whole, one slice
// per category of its one series, drawn with recharts in the Averlo tokens,
// with each category keyed beside the ring with its value as given. No
// tooltip and no interactive legend; no animation, so the slide's own
// entrance is the only motion and print and the strips stay still.
import { Pie, PieChart, Sector } from "recharts";
import type { PresetProps } from "..";
import {
  CANVAS,
  ChartFrame,
  Swatch,
  formatNumber,
  seriesColour,
  useBox,
  type Box,
} from "./frame";
import { say } from "../say";
import { Text } from "@/deck/text";
import styles from "./charts.module.css";

export function DonutPreset({ block, lang }: PresetProps<"chart">) {
  const [ref, box] = useBox();
  const labels = block.categories.map((c) => say(c, lang));
  const values = block.series[0].values;
  const colours = labels.map((_, j) => seriesColour(j, labels.length));
  const rows = labels.map((_, j) => ({ i: j, value: values[j] }));

  function plot(b: Box) {
    const size = Math.min(b.width, b.height);
    const outer = size / 2 - 1;
    return (
      <PieChart
        width={b.width}
        height={b.height}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        accessibilityLayer={false}
      >
        <Pie
          data={rows}
          dataKey="value"
          nameKey="i"
          cx="50%"
          cy="50%"
          outerRadius={outer}
          innerRadius={outer * 0.62}
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
          label={false}
          labelLine={false}
          rootTabIndex={-1}
          shape={(props) => (
            <Sector
              {...props}
              style={{
                fill: colours[props.index],
                stroke: CANVAS,
                strokeWidth: Math.max(1, b.font * 0.15),
              }}
              data-mark=""
            />
          )}
        />
      </PieChart>
    );
  }

  return (
    <ChartFrame
      kind="donut"
      unit={block.unit}
      source={block.source}
      lang={lang}
      plot={
        <div className={styles.donut}>
          <div ref={ref} className={styles.plot}>
            {box && plot(box)}
          </div>
          <ul className={styles.key}>
            {labels.map((label, j) => (
              <li key={j} className={styles.keyItem}>
                <Swatch colour={colours[j]} />
                <Text
                  as="span"
                  variant="body-m"
                  tone="primary"
                  className={styles.keyLabel}
                  data-category=""
                >
                  {label}
                </Text>
                <Text
                  as="span"
                  variant="body-m"
                  tone="secondary"
                  className={styles.keyValue}
                >
                  {formatNumber(values[j], lang)}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
