// The split layout: the heading left, its blocks right; steps on a rail and
// a note with a key phrase in bold.
import { Block, Body, Heading, Note, Steps } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Placeholder title",
    section: "Placeholder text",
    headline: "Placeholder text",
    step1When: "Placeholder title",
    step1: "Placeholder title",
    step1Text: "Placeholder text",
    step2When: "Placeholder text",
    step2: "Placeholder text",
    step2Text: "Placeholder text",
    note: "Placeholder **text**",
  },
} satisfies Copy;

export default function Split({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="steps">
          <Steps
            items={[
              {
                when: t.step1When,
                label: t.step1,
                text: t.step1Text,
                status: "done",
              },
              {
                when: t.step2When,
                label: t.step2,
                text: t.step2Text,
                status: "current",
              },
            ]}
          />
        </Block>
        <Block type="note">
          <Note>{t.note}</Note>
        </Block>
      </Body>
    </>
  );
}
