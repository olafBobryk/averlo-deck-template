// The example of the agenda preset: a headline, the body text under it, and
// beside them the topics in the order they come.
import { Agenda, Aside, Block, Body, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Agenda",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    topics: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    topicTexts: [
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
      "Placeholder text",
    ],
  },
} satisfies Copy;

export default function AgendaSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Aside>
        <Lead>{t.body}</Lead>
      </Aside>
      <Body>
        <Block type="agenda">
          <Agenda
            items={t.topics.map((label, i) => ({
              label,
              text: t.topicTexts[i],
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
