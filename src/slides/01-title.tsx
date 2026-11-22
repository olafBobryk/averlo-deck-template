// The placeholder deck's title slide: its title large, a lead under it.
import { Block, Body, Lead, Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "title" };

export const copy = {
  en: { title: "Placeholder title", lead: "Placeholder text" },
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
