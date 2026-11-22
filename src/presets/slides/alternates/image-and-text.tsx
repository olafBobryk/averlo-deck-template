// A second example of the image and text preset: the picture contained, without a
// caption.
import { Aside, Block, Body, Heading, Image, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Image and text, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alt: "Placeholder text",
  },
} satisfies Copy;

export default function ImageAndTextAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Aside>
        <Lead>{t.body}</Lead>
      </Aside>
      <Body>
        <Block type="image">
          <Image alt={t.alt} fit="contain" />
        </Block>
      </Body>
    </>
  );
}
