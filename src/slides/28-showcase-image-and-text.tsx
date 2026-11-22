// The showcase's image and text preset (split): the body text under the
// headline, beside the picture. Without a `src`, the template's
// placeholder image.
import { Aside, Block, Body, Heading, Image, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Image and text",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alt: "Placeholder text",
    caption: "Placeholder text",
  },
} satisfies Copy;

export default function ImageAndTextSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Aside>
        <Lead>{t.body}</Lead>
      </Aside>
      <Body>
        <Block type="image">
          <Image alt={t.alt} caption={t.caption} />
        </Block>
      </Body>
    </>
  );
}
