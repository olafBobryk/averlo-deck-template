// A section divider: its title large, the section in the footer.
import { Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "divider", section: "section" };

export const copy = {
  en: { title: "Placeholder title", section: "Placeholder text" },
} satisfies Copy;

export default function Divider({ t }: SlideProps<typeof copy>) {
  return <Title>{t.title}</Title>;
}
