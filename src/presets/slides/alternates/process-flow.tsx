// A second example of the process flow preset: seven steps, labels only.
import { Block, Body, Flow, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Process flow, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    steps: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
  },
} satisfies Copy;

export default function ProcessFlowAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="flow">
          <Flow steps={t.steps.map((label) => ({ label }))} />
        </Block>
      </Body>
    </>
  );
}
