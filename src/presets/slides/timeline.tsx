// The example of the timeline preset: a headline, a body text and dated
// events, in date order.
import { Block, Body, Heading, Lead, Timeline } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Timeline",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    dates: [
      "Placeholder date",
      "Placeholder date",
      "Placeholder date",
      "Placeholder date",
    ],
    events: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    eventTexts: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
  },
} satisfies Copy;

export default function TimelineSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="timeline">
          <Timeline
            events={t.events.map((label, i) => ({
              when: t.dates[i],
              label,
              text: t.eventTexts[i],
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
