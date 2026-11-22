// A working week with its fixed moments, and steps across.
import { Block, Body, Heading, Steps, Week } from "@/components/deck";
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
    day1: "Placeholder title",
    day2: "Placeholder text",
    moment: "Placeholder title",
    momentText: "Placeholder text",
    step1: "Placeholder title",
    step1Text: "Placeholder text",
    step2: "Placeholder text",
    step2Text: "Placeholder text",
  },
} satisfies Copy;

export default function WeekSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="week">
          <Week
            days={[t.day1, t.day2]}
            items={[{ day: t.day1, label: t.moment, text: t.momentText }]}
          />
        </Block>
        <Block type="steps">
          <Steps
            style="across"
            items={[
              { label: t.step1, text: t.step1Text, status: "done" },
              { label: t.step2, text: t.step2Text, status: "current" },
            ]}
          />
        </Block>
      </Body>
    </>
  );
}
