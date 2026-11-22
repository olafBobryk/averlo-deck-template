// A slide given as a file (feature 003, contracts/slide-file.md): a numbered
// `src/slides/NN-name.tsx` that exports its `meta`, its words by language
// (`copy`) and a default component. scripts/slides-index.mjs lists the files
// in src/slides/index.ts, in number order, and their `meta` and `copy` as
// plain data in src/slides/data.ts; the deck reads them here. Template-owned.

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

/** The deck's compositions a slide's frame can name: stack, heading over
 *  its blocks; split, heading left and blocks right (split-end mirrors it);
 *  center, a quote or the closing in the middle; statement, one large claim
 *  at the bottom left; module, the heading over one wide block. */
export type SlideLayout =
  "stack" | "split" | "split-end" | "center" | "statement" | "module";

/** What the deck needs to place a slide. `section` and `parent` name keys
 *  of `copy`, so they translate with the slide. A slide with a `layout` has
 *  a headline (`Heading`) and is drawn in that composition; one without
 *  (a title or divider) shows its title large (`Title`). */
export type SlideMeta = {
  kind: SlideKind;
  section?: string;
  parent?: string;
  layout?: SlideLayout;
};

/** What a slide's component receives: its words in the current language,
 *  and the language. Every visible word comes from `t`. */
export type SlideProps<C extends Copy = Copy> = { t: C[Lang]; lang: Lang };

/** A slide file's data, as the generated src/slides/data.ts lists it: plain
 *  values, so plain Node reads them. */
export type SlideData = {
  /** The number its name starts with. */
  number: number;
  /** Its name without the number: `05-results.tsx` → `results`. */
  id: string;
  meta: SlideMeta;
  copy: Copy;
};

/** A slide file, as the generated index lists it: its data and its
 *  component. */
export type SlideFile = SlideData & {
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
function textOf(file: SlideData, key: string): Text {
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
export function fileSlide(file: SlideData): Slide {
  const { kind, section, parent } = file.meta;
  return {
    id: file.id,
    kind,
    title: textOf(file, "title"),
    ...(section ? { section: textOf(file, section) } : {}),
    ...(parent ? { parent: textOf(file, parent) } : {}),
  };
}

/** The files by id, for the slide view. */
export const filesById = (files: SlideFile[]): Record<string, SlideFile> =>
  Object.fromEntries(files.map((file) => [file.id, file]));
