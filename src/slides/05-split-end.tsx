// The split-end layout, split mirrored: facts and numbered points.
import { Block, Body, Facts, Heading, Points } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split-end",
};

export const copy = {
  en: {
    title: "Placeholder title",
    section: "Placeholder text",
    headline: "Placeholder text",
    fact1: "Placeholder title",
    fact1Text: "Placeholder text",
    fact2: "Placeholder text",
    fact2Text: "Placeholder text",
    point1: "Placeholder title",
    point1Text: "Placeholder text",
    point2: "Placeholder text",
    point2Text: "Placeholder text",
  },
} satisfies Copy;

export default function SplitEnd({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="facts">
          <Facts
            items={[
              { label: t.fact1, text: t.fact1Text },
              { label: t.fact2, text: t.fact2Text },
            ]}
          />
        </Block>
        <Block type="points">
          <Points
            style="numbered"
            columns={2}
            items={[
              { label: t.point1, text: t.point1Text },
              { label: t.point2, text: t.point2Text },
            ]}
          />
        </Block>
      </Body>
    </>
  );
}
