// A second example of the full-bleed image preset: the picture contained, with a
// caption.
import { Block, Body, Heading, Image, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Full-bleed image, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    alt: "Placeholder text",
    caption: "Placeholder text",
  },
} satisfies Copy;

export default function FullBleedImageAlternateSlide({
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
          <Image alt={t.alt} caption={t.caption} fit="contain" bleed />
        </Block>
      </Body>
    </>
  );
}
