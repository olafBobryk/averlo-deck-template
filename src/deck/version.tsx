"use client";
import { createContext, useContext } from "react";
import { slideFiles } from "@/slides";
import { pdfHref, type Slide } from "./model";
import type { Lang } from "./langs";
import { fileSlide, filesById, type SlideFile } from "./slide";

/** The deck's slides, its slide files by id and its PDF links, so /print
 *  and its PDFs need no provider. Another deck drawn by the same engine (the
 *  preset gallery, /gallery) provides its own. */
export const DeckContext = createContext<{
  slides: Slide[];
  pdfHref: (lang: Lang) => string;
  /** Each slide's file, by slide id (feature 003). */
  files: Record<string, SlideFile>;
}>({
  slides: slideFiles.map(fileSlide),
  pdfHref,
  files: filesById(slideFiles),
});
export const useDeck = () => useContext(DeckContext);
