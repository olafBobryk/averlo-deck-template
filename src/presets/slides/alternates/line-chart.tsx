// A second example of the line chart preset: a headline, a body text and the chart.
// Each series' name and values sit in copy; every number is a round
// placeholder value, not data.
import { Block, Body, Chart, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Line chart, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    categories: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
    series: ["Placeholder title", "Placeholder title", "Placeholder title"],
    values: [
      [50, 40, 40, 30, 30, 20, 20, 10],
      [10, 20, 20, 30, 40, 40, 50, 60],
      [30, 30, 30, 30, 20, 30, 30, 30],
    ],
    unit: "Placeholder text",
  },
} satisfies Copy;

export default function LineChartAlternateSlide({
  t,
  lang,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="chart">
          <Chart
            kind="line"
            categories={t.categories}
            series={t.series.map((name, i) => ({ name, values: t.values[i] }))}
            unit={t.unit}
            lang={lang}
          />
        </Block>
      </Body>
    </>
  );
}
