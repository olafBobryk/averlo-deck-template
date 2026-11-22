// A second example of the timeline preset: eight dated events, labels only.
import { Block, Body, Heading, Lead, Timeline } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Timeline, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    dates: [
      "Placeholder date",
      "Placeholder date",
      "Placeholder date",
      "Placeholder date",
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
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
  },
} satisfies Copy;

export default function TimelineAlternateSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="timeline">
          <Timeline
            events={t.events.map((label, i) => ({ when: t.dates[i], label }))}
          />
        </Block>
      </Body>
    </>
  );
}
