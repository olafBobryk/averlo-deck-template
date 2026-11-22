"use client";
import { createContext, useContext } from "react";
import type { SlideContent } from "./content";
import { pdfHref, type Slide } from "./model";
import type { Lang } from "./langs";
import type { SlideFile } from "./slide";
import { content, files, slides } from "./slides";

/** The deck's slides, their content and its PDF links, so /print and its
 *  PDFs need no provider. Another deck drawn by the same engine (the preset
 *  gallery, /gallery) provides its own. */
export const DeckContext = createContext<{
  slides: Slide[];
  content: Record<string, SlideContent>;
  pdfHref: (lang: Lang) => string;
  /** The slides given as files, by id (feature 003); a deck without them
   *  (the gallery) leaves it out. */
  files?: Record<string, SlideFile>;
}>({
  slides,
  content,
  pdfHref,
  files,
});
export const useDeck = () => useContext(DeckContext);
