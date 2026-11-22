// The showcase's stat cards preset: a body text, then three figures, each
// with its label and a note. The values are placeholders, written as a
// source would write them.
import { Block, Body, Heading, Lead, Stat } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Stat cards",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    values: ["10", "20", "30"],
    labels: ["Placeholder title", "Placeholder title", "Placeholder title"],
    notes: ["Placeholder text", "Placeholder text", "Placeholder text"],
  },
} satisfies Copy;

export default function StatCardsSlide({ t }: SlideProps<typeof copy>) {
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
              note: t.notes[i],
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
