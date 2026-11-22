// A second example of the donut chart preset: a headline, a body text and the chart.
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
    title: "Donut chart, alternate",
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
    ],
    series: ["Placeholder title"],
    values: [[30, 20, 20, 10, 10, 10]],
    source: "Placeholder text",
  },
} satisfies Copy;

export default function DonutChartAlternateSlide({
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
            kind="donut"
            categories={t.categories}
            series={t.series.map((name, i) => ({ name, values: t.values[i] }))}
            source={t.source}
            lang={lang}
          />
        </Block>
      </Body>
    </>
  );
}
