"use client";
import type { ReactNode } from "react";
import type { Lang } from "@/deck/langs";
import { galleryPdfName } from "@/deck/pdf-name";
import { DeckContext } from "@/deck/version";
import { gallery } from "./gallery";

const deck = {
  slides: gallery.slides,
  content: gallery.content,
  pdfHref: (lang: Lang) => `/pdf/${galleryPdfName(lang)}`,
};

/** The deck engine's context with the preset gallery's slides, their
 *  content and the gallery's PDFs: the carried `Deck`, `SlideView` and
 *  `Footer` inside it draw the gallery (/gallery, /print?deck=gallery). */
export function GalleryDeck({ children }: { children: ReactNode }) {
  return <DeckContext.Provider value={deck}>{children}</DeckContext.Provider>;
}
