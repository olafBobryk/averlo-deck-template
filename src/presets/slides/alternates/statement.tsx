// A second example of the statement preset: a longer claim.
import { Block, Body, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "statement",
};

export const copy = {
  en: {
    title: "Statement, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    claim:
      "Placeholder text, placeholder text, placeholder text, placeholder text.",
  },
} satisfies Copy;

export default function StatementAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
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
