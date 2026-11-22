# Contract: a slide file

```tsx
// src/slides/05-results.tsx
import { Chart, Lead } from "@/components/deck";
import type { SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "slide", section: "section" };

export const copy = {
  en: { title: "Results", section: "Year one", headline: "Revenue grew", body: "…", q1: "Q1", q2: "Q2" },
} satisfies Copy;

export default function Slide({ t }: SlideProps<typeof copy>) {
  return (
    <>
      <h2>{t.headline}</h2>
      <Lead>{t.body}</Lead>
      <Chart kind="bar" categories={[t.q1, t.q2]} series={[{ name: t.title, values: [40, 60] }]} />
    </>
  );
}
```

Rules:
- the number sets the order;
- `meta` and `copy` sit at the top;
- every visible word comes from `t`;
- components come from `@/components/deck`.
