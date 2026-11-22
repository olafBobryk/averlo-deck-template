// The showcase's captioned image preset: a body text, then one picture with
// a line that says what it shows. Without a `src`, the template's
// placeholder image.
import { Block, Body, Heading, Image, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Captioned image",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alt: "Placeholder text",
    caption: "Placeholder text",
  },
} satisfies Copy;

export default function CaptionedImageSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="image">
          <Image alt={t.alt} caption={t.caption} />
        </Block>
      </Body>
    </>
  );
}
