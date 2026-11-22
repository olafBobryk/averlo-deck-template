// The showcase's org chart preset: a body text, then reporting lines: a
// root, the nodes under it, and theirs.
import { Block, Body, Heading, Lead, OrgChart } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Org chart",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    root: "Placeholder title",
    rootText: "Placeholder text",
    a: "Placeholder title",
    a1: "Placeholder title",
    a2: "Placeholder title",
    b: "Placeholder title",
    c: "Placeholder title",
    c1: "Placeholder title",
  },
} satisfies Copy;

export default function OrgChartSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="orgchart">
          <OrgChart
            root={{ label: t.root, text: t.rootText }}
            branches={[
              {
                node: { label: t.a },
                children: [{ label: t.a1 }, { label: t.a2 }],
              },
              { node: { label: t.b } },
              { node: { label: t.c }, children: [{ label: t.c1 }] },
            ]}
          />
        </Block>
      </Body>
    </>
  );
}
