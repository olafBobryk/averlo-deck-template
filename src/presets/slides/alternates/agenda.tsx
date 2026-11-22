// A second example of the agenda preset: eight topics, labels only.
import { Agenda, Aside, Block, Body, Heading, Lead } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "split",
};

export const copy = {
  en: {
    title: "Agenda, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    topics: [
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

export default function AgendaAlternateSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Aside>
        <Lead>{t.body}</Lead>
      </Aside>
      <Body>
        <Block type="agenda">
          <Agenda items={t.topics.map((label) => ({ label }))} />
        </Block>
      </Body>
    </>
  );
}
