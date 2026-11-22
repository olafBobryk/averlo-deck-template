// The closing slide: the heading, a lead and a short checklist of chips.
import { Block, Body, Heading, Lead, Points } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "closing", layout: "stack" };

export const copy = {
  en: {
    title: "Placeholder title",
    headline: "Placeholder text",
    lead: "Placeholder text",
    chip1: "Placeholder title",
    chip2: "Placeholder text",
  },
} satisfies Copy;

export default function Closing({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.lead}</Lead>
        </Block>
        <Block type="points">
          <Points
            style="chips"
            items={[{ label: t.chip1 }, { label: t.chip2 }]}
          />
        </Block>
      </Body>
    </>
  );
}
