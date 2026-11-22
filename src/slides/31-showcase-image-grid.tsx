// The showcase's image grid preset: a body text, then pictures shown
// together. Without a `src`, the template's placeholder image.
import { Block, Body, Heading, ImageGrid, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Image grid",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alts: ["Placeholder text", "Placeholder text", "Placeholder text"],
    captions: ["Placeholder text", "Placeholder text", "Placeholder text"],
  },
} satisfies Copy;

export default function ImageGridSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="imageGrid">
          <ImageGrid
            images={t.alts.map((alt, i) => ({ alt, caption: t.captions[i] }))}
          />
        </Block>
      </Body>
    </>
  );
}
