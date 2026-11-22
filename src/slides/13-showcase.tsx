// The presets' showcase (feature 002, "Put them in the demo"): its divider,
// then one slide per preset, in the gallery's order, before the closing.
import { Title } from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "divider", section: "section" };

export const copy = {
  en: { title: "Presets", section: "Presets" },
} satisfies Copy;

export default function Showcase({ t }: SlideProps<typeof copy>) {
  return <Title>{t.title}</Title>;
}
