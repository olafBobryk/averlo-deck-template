// An example of a composed visual (feature 002, T143; research D3): a
// visual no preset fits, built for one deck from Averlo parts, here a
// funnel of stages, each narrower than the one above
// (src/presets/examples/ComposedExample.tsx). It is not a preset: the
// gallery shows it under "Composed visuals". A deck keeps its own visuals in
// src/deck/visuals/ and draws them from its slide files like any component.
import { Block, Body, Heading } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";
import { ComposedExample } from "@/presets/examples/ComposedExample";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Composed visual (example)",
    section: "Composed visuals",
    headline: "Placeholder text",
    stages: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
  },
} satisfies Copy;

export default function ComposedVisualSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="custom">
          <ComposedExample stages={t.stages} />
        </Block>
      </Body>
    </>
  );
}
