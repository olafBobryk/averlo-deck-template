// A second example of the image grid preset: six pictures, without captions.
import { Block, Body, Heading, ImageGrid, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Image grid, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alts: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
  },
} satisfies Copy;

export default function ImageGridAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="imageGrid">
          <ImageGrid images={t.alts.map((alt) => ({ alt }))} />
        </Block>
      </Body>
    </>
  );
}
