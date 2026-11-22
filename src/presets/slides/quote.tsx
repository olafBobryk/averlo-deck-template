// The example of the quote preset: a headline, the body text under it, and
// beside them a quotation, word for word, with who said it.
import { Aside, Block, Body, Heading, Lead, Quote } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Quote",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    quote: "Placeholder text",
    by: "Placeholder title",
    role: "Placeholder text",
  },
} satisfies Copy;

export default function QuoteSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Aside>
        <Lead>{t.body}</Lead>
      </Aside>
      <Body>
        <Block type="quote">
          <Quote text={t.quote} by={t.by} role={t.role} />
        </Block>
      </Body>
    </>
  );
}
