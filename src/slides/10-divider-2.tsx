// A second section divider.
import { Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "divider", section: "section" };

export const copy = {
  en: { title: "Placeholder title", section: "Placeholder text" },
} satisfies Copy;

export default function SecondDivider({ t }: SlideProps<typeof copy>) {
  return <Title>{t.title}</Title>;
}
