// The stack layout: the heading over its blocks; points as cards.
import { Block, Body, Heading, Points } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Placeholder title",
    section: "Placeholder text",
    headline: "Placeholder text",
    point1: "Placeholder title",
    point1Text: "Placeholder text",
    point2: "Placeholder text",
    point2Text: "Placeholder text",
  },
} satisfies Copy;

export default function Stack({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="points">
          <Points
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
