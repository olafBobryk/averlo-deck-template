// The showcase's process flow preset: a body text, then ordered steps, each
// leading to the next.
import { Block, Body, Flow, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Process flow",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    steps: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    stepTexts: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
  },
} satisfies Copy;

export default function ProcessFlowSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="flow">
          <Flow
            steps={t.steps.map((label, i) => ({ label, text: t.stepTexts[i] }))}
          />
        </Block>
      </Body>
    </>
  );
}
