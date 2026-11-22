// The example of the org chart preset: a headline, a body text and
// reporting lines: a root, the nodes under it (`branches`), and theirs
// (`leaves`, one list per branch, empty for none).
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
    branches: ["Placeholder title", "Placeholder title", "Placeholder title"],
    leaves: [
      ["Placeholder title", "Placeholder title"],
      [],
      ["Placeholder title"],
    ],
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
            branches={t.branches.map((label, i) => ({
              node: { label },
              children: t.leaves[i].map((leaf) => ({ label: leaf })),
            }))}
          />
        </Block>
      </Body>
    </>
  );
}
