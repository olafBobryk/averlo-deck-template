// The example of the statement preset: one claim, said large, with the body
// text under it.
import { Block, Body, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "statement",
};

export const copy = {
  en: {
    title: "Statement",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    claim: "Placeholder text",
  },
} satisfies Copy;

export default function StatementSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead size="statement">{t.claim}</Lead>
        </Block>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
      </Body>
    </>
  );
}
