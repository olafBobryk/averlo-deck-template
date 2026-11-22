// A second example of the 2×2 matrix preset: quadrants with labels only,
// and five items.
import { Block, Body, Heading, Lead, Matrix } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "2×2 matrix, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    x: "Placeholder title",
    y: "Placeholder title",
    quadrants: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    items: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
    itemX: [0.15, 0.85, 0.4, 0.85, 0.15],
    itemY: [0.68, 0.56, 0.32, 0.18, 0.06],
  },
} satisfies Copy;

export default function TwoByTwoMatrixAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  const [q1, q2, q3, q4] = t.quadrants.map((label) => ({ label }));
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
