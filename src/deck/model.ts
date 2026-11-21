// The deck's structure: the slide types, the interface strings and the
// helpers the engine reads. The slides themselves are in slides.ts, and each
// slide's content in its content map.

import { langs, type Lang } from "./langs";

export type Text = Record<Lang, string>;

export type SlideKind = "title" | "divider" | "slide" | "closing";

export type Slide = {
  id: string;
  kind: SlideKind;
  /** Top-level section, shown in the footer (absent on title/closing). */
  section?: Text;
  /** Parent line for "▪" items, shown after the section in the footer. */
  parent?: Text;
  title: Text;
};

/** Interface strings: the menu, its overview and their controls. */
export const ui = {
  menu: { en: "Menu" },
  overview: { en: "Overview" },
  expand: { en: "Expand" },
  minimize: { en: "Minimize" },
  close: { en: "Close" },
  language: { en: "Language" },
  controls: { en: "Controls" },
  slides: { en: "Slides" },
  sectionSlides: { en: "Slides in section" },
  downloads: { en: "Downloads" },
  download: { en: "Download" },
  previous: { en: "Previous" },
  next: { en: "Next" },
  fullscreen: { en: "Fullscreen" },
  pdf: { en: "PDF" },
  english: { en: "English" },
  french: { en: "French" },
  firstSlide: { en: "First slide" },
  slideProgress: { en: "Slide progress" },
  goSlide: { en: "Go to slide {count}" },
  slideNumber: { en: "Slide number" },
} satisfies Record<string, Text>;

export const pdfHref = (lang: Lang) => `/pdf/deck-deck-${lang}.pdf`;

export const sectionLabel = (slide: Slide, lang: Lang) =>
  [slide.section?.[lang], slide.parent?.[lang]].filter(Boolean).join(" · ");

export const parseLang = (value: string | null | undefined): Lang =>
  langs.find((lang) => lang === value) ?? langs[0];
