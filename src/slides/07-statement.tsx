// The statement layout: one large claim at the bottom left.
import { Block, Body, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "statement",
};

export const copy = {
  en: {
    title: "Placeholder title",
    section: "Placeholder text",
    headline: "Placeholder text",
    claim: "Placeholder text",
  },
} satisfies Copy;

export default function Statement({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead size="statement">{t.claim}</Lead>
        </Block>
      </Body>
    </>
  );
}
