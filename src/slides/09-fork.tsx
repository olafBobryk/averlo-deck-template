// A fork: one stage branching into options.
import { Block, Body, Fork, Heading } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Placeholder title",
    section: "Placeholder text",
    headline: "Placeholder text",
    root: "Placeholder title",
    rootText: "Placeholder text",
    option1: "Placeholder title",
    option1Text: "Placeholder text",
    option2: "Placeholder text",
    option2Text: "Placeholder text",
  },
} satisfies Copy;

export default function ForkSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="fork">
          <Fork
            root={{ label: t.root, text: t.rootText }}
            items={[
              { label: t.option1, text: t.option1Text },
              { label: t.option2, text: t.option2Text },
            ]}
          />
        </Block>
      </Body>
    </>
  );
}
