// A second example of the comparison table preset: five columns, three
// rows.
import { Block, Body, Heading, Lead, Table } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = {
  kind: "slide",
  section: "section",
  layout: "stack",
};

export const copy = {
  en: {
    title: "Comparison table, alternate",
    section: "Presets",
    headline: "Placeholder text",
    body: "Placeholder text",
    columns: [
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
      "Placeholder title",
    ],
    rows: ["Placeholder title", "Placeholder title", "Placeholder title"],
    cells: [
      [
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
      ],
      [
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
      ],
      [
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
        "Placeholder text",
      ],
    ],
  },
} satisfies Copy;

export default function ComparisonTableAlternateSlide({
  t,
}: SlideProps<typeof copy>) {
  return (
    <>
      <Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.body}</Lead>
        </Block>
        <Block type="table">
          <Table
            columns={t.columns}
            rows={t.rows.map((label, i) => ({ label, cells: t.cells[i] }))}
          />
        </Block>
      </Body>
    </>
  );
}
