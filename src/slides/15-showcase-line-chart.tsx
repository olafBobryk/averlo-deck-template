// The showcase's line chart preset: a body text, then the chart. Every number is a
// round placeholder value, not data.
import { Block, Body, Chart, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Line chart",
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
    series: "Placeholder title",
    values: [10, 20, 30, 30, 40, 50],
    unit: "Placeholder text",
    source: "Placeholder text",
  },
} satisfies Copy;

export default function LineChartSlide({ t, lang }: SlideProps<typeof copy>) {
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
            series={[{ name: t.series, values: t.values }]}
            unit={t.unit}
            source={t.source}
            lang={lang}
          />
        </Block>
      </Body>
    </>
  );
}
