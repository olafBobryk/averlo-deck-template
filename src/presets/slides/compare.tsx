// The example of the compare preset: a headline, a body text and two options
// side by side, each with its points.
import { Block, Body, Compare, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Compare",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    left: "Placeholder title",
    leftPoints: ["Placeholder text", "Placeholder text", "Placeholder text"],
    right: "Placeholder title",
    rightPoints: ["Placeholder text", "Placeholder text", "Placeholder text"],
  },
} satisfies Copy;

export default function CompareSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="compare">
          <Compare
            left={{ title: t.left, points: t.leftPoints }}
            right={{ title: t.right, points: t.rightPoints }}
          />
        </Block>
      </Body>
    </>
  );
}
