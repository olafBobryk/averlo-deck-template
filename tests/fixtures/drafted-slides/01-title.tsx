// The deck-visuals skill's dry run on tests/fixtures/sample-source.md
// (feature 002, T144), redone as slide files (feature 003, T341). Every word
// is the sample's or the owner's, as tests/fixtures/answers.md records them;
// tests/docs/workflow-trace.spec.ts traces each one. The title slide: the
// sample's heading, and its sentence on the launch date as the lead.
import { Block, Body, Lead, Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "title" };

export const copy = {
  en: {
    title: "Notes from the launch planning meeting",
    lead: "The launch is planned for the start of June.",
  },
} satisfies Copy;

export default function TitleSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Title>{t.title}</Title>
      <Body>
        <Block type="lead">
          <Lead>{t.lead}</Lead>
        </Block>
      </Body>
    </>
  );
}
