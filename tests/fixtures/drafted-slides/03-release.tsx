// "What the first release does": copied from the compare preset
// (src/presets/slides/compare.tsx), which the owner confirmed: "Left: the
// four features. Right: 'Payments and meeting rooms are not in the first
// release. We will look at them after the launch.'" The owner gave no
// headline, so the title shows large, without the preset's heading and
// body text.
import { Block, Body, Compare, Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "slide", section: "section" };

export const copy = {
  en: {
    title: "What the first release does",
    section: "What the first release does",
    left: "What the first release does",
    leftPoints: [
      "Book a desk for a day or for half a day.",
      "See which desks are free on a floor plan.",
      "Invite a colleague to sit next to you.",
      "Cancel a booking with one tap.",
    ],
    right: "not in the first release",
    rightPoints: [
      "Payments and meeting rooms are not in the first release.",
      "We will look at them after the launch.",
    ],
  },
} satisfies Copy;

export default function ReleaseSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Title>{t.title}</Title>
      <Body>
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
