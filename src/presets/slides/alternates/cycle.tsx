// A second example of the cycle preset: six stages, labels only.
import { Block, Body, Cycle, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Cycle, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    stages: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
  },
} satisfies Copy;

export default function CycleAlternateSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="cycle">
          <Cycle stages={t.stages.map((label) => ({ label }))} />
        </Block>
      </Body>
    </>
  );
}
