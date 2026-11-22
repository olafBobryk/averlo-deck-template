// "Risks": copied from the comparison table preset
// (src/presets/slides/comparison-table.tsx), which the owner confirmed:
// "Risks as a comparison table (risk / what we do)". Each row is a risk,
// its one cell what the sample says we do about it. The owner gave no
// headline, so the title shows large.
import { Block, Body, Table, Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "slide", section: "section" };

export const copy = {
  en: {
    title: "Risks",
    section: "Risks",
    columns: ["what we do"],
    rows: [
      "The floor plans may be out of date in one office.",
      "Some people may not want to install another app.",
      "Testing may find more bugs than the two developers can fix in April.",
    ],
    cells: [
      ["We will walk each floor before the launch and correct the plans."],
      ["The app also works in the browser, so nobody has to install it."],
      [
        "If it does, we move the launch by two weeks rather than cut the testing.",
      ],
    ],
  },
} satisfies Copy;

export default function RisksSlide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <Title>{t.title}</Title>
      <Body>
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
