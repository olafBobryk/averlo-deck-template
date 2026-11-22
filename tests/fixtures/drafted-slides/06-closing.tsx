// "How we will know it worked": the closing slide, copied from the stat
// cards preset (src/presets/slides/stat-cards.tsx), which the owner
// confirmed: "targets as stat cards: 'half of the staff' (book a desk in the
// first month), 'fewer than ten' (support questions a week)." The owner gave
// no headline, so the title shows large.
import { Block, Body, Stat, Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "closing" };

export const copy = {
  en: {
    title: "How we will know it worked",
    values: ["half of the staff", "fewer than ten"],
    labels: ["book a desk in the first month", "support questions a week"],
  },
} satisfies Copy;

export default function ClosingSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Title>{t.title}</Title>
      <Body>
        <Block type="stat">
          <Stat
            items={t.values.map((value, i) => ({ value, label: t.labels[i] }))}
          />
        </Block>
      </Body>
    </>
  );
}
