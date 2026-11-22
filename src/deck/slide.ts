// A slide given as a file (feature 003, contracts/slide-file.md): a numbered
// `src/slides/NN-name.tsx` that exports its `meta`, its words by language
// (`copy`) and a default component. scripts/slides-index.mjs lists the files
// in src/slides/index.ts, in number order; the deck reads that index here.
// Template-owned.

import type { ComponentType } from "react";
import { langs, type Lang } from "./langs";
import type { Slide, SlideKind, Text } from "./model";

/** One word set's value: a string, a number (a chart's figure), or a list
 *  of them. */
export type Word = string | number | readonly Word[];

/** A language's words: its keys, the title among them. */
export type Words = { readonly title: string } & Readonly<Record<string, Word>>;

/** A slide's words, one entry for every language in `langs`; a missing
 *  language fails the type check (`satisfies Copy`). */
export type Copy = Readonly<Record<Lang, Words>>;

/** The deck's compositions a slide's frame can name. */
export type SlideLayout =
  "stack" | "split" | "split-end" | "center" | "statement";

/** What the deck needs to place a slide. `section` and `parent` name keys
 *  of `copy`, so they translate with the slide. */
export type SlideMeta = {
  kind: SlideKind;
  section?: string;
  parent?: string;
  layout?: SlideLayout;
};

/** What a slide's component receives: its words in the current language,
 *  and the language. Every visible word comes from `t`. */
export type SlideProps<C extends Copy = Copy> = { t: C[Lang]; lang: Lang };

/** A slide file, as the generated index lists it. */
export type SlideFile = {
  /** The number its name starts with. */
  number: number;
  /** Its name without the number: `05-results.tsx` → `results`. */
  id: string;
  meta: SlideMeta;
  copy: Copy;
  Component: ComponentType<SlideProps>;
};

/** An index entry; each file's component is typed against its own copy. */
export function slideFile<C extends Copy>(
  number: number,
  id: string,
  meta: SlideMeta,
  copy: C,
  Component: ComponentType<SlideProps<C>>,
): SlideFile {
  return {
    number,
    id,
    meta,
    copy,
    Component: Component as ComponentType<SlideProps>,
  };
}

/** A key of the file's copy as a text in every language. */
function textOf(file: SlideFile, key: string): Text {
  return Object.fromEntries(
    langs.map((lang) => {
      const value = file.copy[lang][key];
      if (typeof value !== "string")
        throw new Error(
          `src/slides/${String(file.number).padStart(2, "0")}-${file.id}.tsx: copy.${lang}.${key} is not a string (meta names it)`,
        );
      return [lang, value];
    }),
  ) as Text;
}

/** The engine's slide for a file: its id, its kind, and its title, section
 *  and parent from its copy. Plain data, so the print page can hand it to
 *  the client; the component is looked up by id (`DeckContext.files`). */
export function fileSlide(file: SlideFile): Slide {
  const { kind, section, parent } = file.meta;
  return {
    id: file.id,
    kind,
    title: textOf(file, "title"),
    ...(section ? { section: textOf(file, section) } : {}),
    ...(parent ? { parent: textOf(file, parent) } : {}),
  };
}

/** The deck's slides with the files placed among them: each file at its
 *  number (slide 5 for `05-…`), or last when its number is past the end.
 *  Without files, the slides as they are. */
export function placeFiles(slides: Slide[], files: SlideFile[]): Slide[] {
  const out = [...slides];
  const ids = new Set(slides.map((slide) => slide.id));
  for (const file of [...files].sort((a, b) => a.number - b.number)) {
    if (ids.has(file.id))
      throw new Error(
        `slide file "${file.id}": the deck already has a slide with that id`,
      );
    ids.add(file.id);
    out.splice(Math.min(file.number - 1, out.length), 0, fileSlide(file));
  }
  return out;
}

/** The files by id, for the slide view. */
export const filesById = (files: SlideFile[]): Record<string, SlideFile> =>
  Object.fromEntries(files.map((file) => [file.id, file]));
