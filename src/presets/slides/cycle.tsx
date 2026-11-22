// The example of the cycle preset: a headline, a body text and a loop of
// stages, the last leading back to the first.
import { Block, Body, Cycle, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Cycle",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    stages: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    stageTexts: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
  },
} satisfies Copy;

export default function CycleSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="cycle">
          <Cycle
            stages={t.stages.map((label, i) => ({
              label,
              text: t.stageTexts[i],
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
