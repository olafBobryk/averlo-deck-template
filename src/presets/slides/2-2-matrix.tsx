// The example of the 2×2 matrix preset: a headline, a body text and two axes,
// four quadrants, and items placed by their x and y (placeholder
// positions, from 0 to 1).
import { Block, Body, Heading, Lead, Matrix } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "2×2 matrix",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    x: "Placeholder text",
    y: "Placeholder text",
    quadrants: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    quadrantTexts: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
    items: ["Placeholder text", "Placeholder text", "Placeholder text"],
    itemX: [0.2, 0.8, 0.3],
    itemY: [0.6, 0.1, 0.1],
  },
} satisfies Copy;

export default function TwoByTwoMatrixSlide({ t }: SlideProps<typeof copy>) {
  const [q1, q2, q3, q4] = t.quadrants.map((label, i) => ({
    label,
    text: t.quadrantTexts[i],
  }));
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="matrix">
          <Matrix
            x={t.x}
            y={t.y}
            quadrants={[q1, q2, q3, q4]}
            items={t.items.map((label, i) => ({
              label,
              x: t.itemX[i],
              y: t.itemY[i],
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
