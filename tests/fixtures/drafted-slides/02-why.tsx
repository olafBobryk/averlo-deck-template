// "Why we are launching now": copied from the stat cards preset
// (src/presets/slides/stat-cards.tsx), which the owner confirmed: "Cards:
// 'eight weeks' (pilot), 'three offices', 'under a minute' (to book a
// desk), values exactly as written." The preset's body text and notes are
// left out: the owner gave none.
import { Block, Body, Heading, Stat } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Why we are launching now",
    section: "Why we are launching now",
    headline: "Our pilot ran for eight weeks with three offices.",
    values: ["eight weeks", "three offices", "under a minute"],
    labels: ["pilot", "pilot", "to book a desk"],
  },
} satisfies Copy;

export default function WhySlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
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
