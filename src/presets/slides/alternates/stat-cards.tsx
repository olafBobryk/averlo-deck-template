// A second example of the stat cards preset: four figures, the first two
// with a unit and the last with a note. The values are placeholders.
import { Block, Body, Heading, Lead, Stat } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Stat cards, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    values: ["40", "50", "60", "70"],
    labels: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    units: ["Placeholder text", "Placeholder text"],
    note: "Placeholder text",
  },
} satisfies Copy;

export default function StatCardsAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="stat">
          <Stat
            items={t.values.map((value, i) => ({
              value,
              label: t.labels[i],
              unit: t.units[i],
              note: i === 3 ? t.note : undefined,
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
