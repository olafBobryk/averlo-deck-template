// A plan: a time axis with dated marks and a span (months as YYYY-MM).
import { Block, Body, Heading, Plan } from "@/components/deck";
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
    start: "2026-01",
    end: "2026-06",
    mark1: "Placeholder title",
    mark1At: "2026-01",
    mark2: "Placeholder text",
    mark2At: "2026-06",
    span: "Placeholder title",
    spanFrom: "2026-02",
    spanTo: "2026-05",
  },
} satisfies Copy;

export default function PlanSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="plan">
          <Plan
            start={t.start}
            end={t.end}
            items={[
              { label: t.mark1, at: t.mark1At, status: "done" },
              { label: t.mark2, at: t.mark2At },
              { label: t.span, span: [t.spanFrom, t.spanTo] },
            ]}
          />
        </Block>
      </Body>
    </>
  );
}
