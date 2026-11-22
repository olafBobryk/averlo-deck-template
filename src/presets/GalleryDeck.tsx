"use client";
import type { ReactNode } from "react";
import { Title } from "@/components/deck";
import { langs, type Lang } from "@/deck/langs";
import { galleryPdfName } from "@/deck/pdf-name";
import type { Copy, SlideFile, SlideProps } from "@/deck/slide";
import { DeckContext } from "@/deck/version";
import { gallery } from "./gallery";
import { presetFiles } from "./slides";

/** The gallery's title and dividers: the title, large. */
function TitleOnly({ t }: SlideProps) {
  return <Title>{t.title}</Title>;
}

const byPath = new Map(presetFiles.map((file) => [file.id, file]));

/** Each gallery slide's file: its preset file (gallery.ts names it), or for
 *  the title and the dividers their title alone. */
const files: Record<string, SlideFile> = Object.fromEntries(
  gallery.slides.map((slide, i) => {
    const path = gallery.files[slide.id];
    const file = path
      ? byPath.get(path)
      : {
          number: i + 1,
          id: slide.id,
          meta: { kind: slide.kind },
          copy: Object.fromEntries(
            langs.map((lang) => [lang, { title: slide.title[lang] }]),
          ) as Copy,
          Component: TitleOnly,
        };
    if (!file) throw new Error(`src/presets/slides/${path}.tsx: no such file`);
    return [slide.id, file];
  }),
);

const deck = {
  slides: gallery.slides,
  files,
  pdfHref: (lang: Lang) => `/pdf/${galleryPdfName(lang)}`,
};

/** The deck engine's context with the preset gallery's slides, their files
 *  and the gallery's PDFs: the carried `Deck`, `SlideView` and `Footer`
 *  inside it draw the gallery (/gallery, /print?deck=gallery). */
export function GalleryDeck({ children }: { children: ReactNode }) {
  return <DeckContext.Provider value={deck}>{children}</DeckContext.Provider>;
}
