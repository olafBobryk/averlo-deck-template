// A second example of the quote preset: a longer quotation, without a role.
import { Aside, Block, Body, Heading, Lead, Quote } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Quote, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    quote:
      "Placeholder text, placeholder text, placeholder text, placeholder text.",
    by: "Placeholder title",
  },
} satisfies Copy;

export default function QuoteAlternateSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Aside>
        <Lead>{t.body}</Lead>
      </Aside>
      <Body>
        <Block type="quote">
          <Quote text={t.quote} by={t.by} />
        </Block>
      </Body>
    </>
  );
}
