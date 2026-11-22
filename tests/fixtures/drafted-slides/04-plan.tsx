// "The plan": copied from the timeline preset
// (src/presets/slides/timeline.tsx), which the owner confirmed: "Four
// events in date order: Finish testing (April), Train the office managers
// (early May), Open the app (start of June), Review the launch (end of
// June)." The owner gave no headline, so the title shows large.
import { Block, Body, Timeline, Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "slide", section: "section" };

export const copy = {
  en: {
    title: "The launch has four stages.",
    section: "The plan",
    dates: ["April", "early May", "the start of June", "the end of June"],
    events: [
      "Finish testing",
      "Train the office managers",
      "Open the app",
      "Review the launch",
    ],
    eventTexts: [
      "We test the app with five teams in each pilot office.",
      "Each office has one manager who answers questions.",
      "to the three pilot offices",
      "decide which offices come next",
    ],
  },
} satisfies Copy;

export default function PlanSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Title>{t.title}</Title>
      <Body>
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
