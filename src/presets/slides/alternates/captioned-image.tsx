// A second example of the captioned image preset: a longer caption, the picture
// contained.
import { Block, Body, Heading, Image, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Captioned image, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alt: "Placeholder text",
    caption:
      "Placeholder text, placeholder text, placeholder text, placeholder text.",
  },
} satisfies Copy;

export default function CaptionedImageAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="image">
          <Image alt={t.alt} caption={t.caption} fit="contain" />
        </Block>
      </Body>
    </>
  );
}
