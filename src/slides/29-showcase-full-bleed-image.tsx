// The showcase's full-bleed image preset: a body text, then one picture
// edge to edge. Without a `src`, the template's placeholder image.
import { Block, Body, Heading, Image, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Full-bleed image",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alt: "Placeholder text",
  },
} satisfies Copy;

export default function FullBleedImageSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="image">
          <Image alt={t.alt} bleed />
        </Block>
      </Body>
    </>
  );
}
