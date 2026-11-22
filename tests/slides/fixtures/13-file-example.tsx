// A test-only slide file (feature 003, T300): tests/slides/files.spec.ts
// runs a deck with this folder as its slides (SLIDES_DIR), so this slide
// stands at number 13, after the placeholder deck's first 12. Placeholder
// words only.
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "slide", section: "section" };

export const copy = {
  en: {
    title: "Placeholder file slide",
    section: "Placeholder section",
    body: "Placeholder text",
  },
} satisfies Copy;

export default function FileExample({ t }: SlideProps<typeof copy>) {
  return <p data-file-example="">{t.body}</p>;
}
