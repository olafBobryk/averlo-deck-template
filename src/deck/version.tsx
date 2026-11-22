"use client";
import { createContext, useContext } from "react";
import { slideFiles } from "@/slides";
import type { SlideContent } from "./content";
import { pdfHref, type Slide } from "./model";
import type { Lang } from "./langs";
import { fileSlide, filesById, type SlideFile } from "./slide";

/** The deck's slides, its slide files by id and its PDF links, so /print
 *  and its PDFs need no provider. Another deck drawn by the same engine (the
 *  preset gallery, /gallery) provides its own, with its slides' content. */
export const DeckContext = createContext<{
  slides: Slide[];
  /** Data slides' content, by id (the gallery's); the deck has none. */
  content?: Record<string, SlideContent>;
  pdfHref: (lang: Lang) => string;
  /** The slides given as files, by id (feature 003); a deck without them
   *  (the gallery) leaves it out. */
  files?: Record<string, SlideFile>;
}>({
  slides: slideFiles.map(fileSlide),
  pdfHref,
  files: filesById(slideFiles),
});
export const useDeck = () => useContext(DeckContext);
