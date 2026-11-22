// The trace rule of SC-006: every sentence or phrase of slide text appears,
// normalized for whitespace and case, in the source or the answers file.

/** Lower case, emphasis markers gone, whitespace collapsed. */
export function normalize(text: string) {
  return text
    .replace(/\*\*|__/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** A slide text's sentences, each normalized and without its end mark. */
export function phrases(text: string) {
  return normalize(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/[.!?:;,]+$/, "").trim())
    .filter(Boolean);
}

/** The phrases of `text` found in none of `sources`. */
export function untraced(text: string, sources: string[]) {
  const haystacks = sources.map(normalize);
  return phrases(text).filter(
    (phrase) => !haystacks.some((source) => source.includes(phrase)),
  );
}

// Feature 003 (T340): a slide is a file, and its words and figures sit in
// its `copy`, keyed by language (src/slides/NN-name.tsx). The trace reads
// them from the generated src/slides/data.ts, or from a folder of slide
// files (scanSlides in scripts/slides-index.mjs) for the dry run. Every
// string in `copy`, in every language and in every list, is slide text:
// titles, headlines, labels, categories, series names, units, captions,
// alt text and stat values. Every number is a figure, and so is every
// number written inside a string ("38%").

/** A slide file's data, as src/slides/data.ts or scanSlides gives it. */
export type SlideCopy = {
  number: number;
  id: string;
  /** Its file name, when read from a folder. */
  name?: string;
  copy: Record<string, unknown>;
};

/** A word or a figure of a slide's copy, with where it stands:
 *  `<file>: copy.<lang>.<key>[<i>]`. */
export type CopyValue = { at: string; value: string | number };

/** A slide's file name: its own, or its number and id. */
const fileOf = (slide: SlideCopy) =>
  slide.name ?? `${String(slide.number).padStart(2, "0")}-${slide.id}.tsx`;

/** Every string and number in the slides' copy, in every language, with
 *  where it stands. */
export function copyValues(slides: SlideCopy[]): CopyValue[] {
  const found: CopyValue[] = [];
  for (const slide of slides) {
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string" || typeof value === "number")
        found.push({ at: `${fileOf(slide)}: ${path}`, value });
      else if (Array.isArray(value))
        value.forEach((item, i) => walk(item, `${path}[${i}]`));
      else if (value && typeof value === "object")
        for (const [key, child] of Object.entries(value))
          walk(child, `${path}.${key}`);
    };
    walk(slide.copy, "copy");
  }
  return found;
}

/** Every slide text of the slides' copy. */
export function slideTexts(slides: SlideCopy[]): string[] {
  return copyValues(slides)
    .map(({ value }) => value)
    .filter((value): value is string => typeof value === "string");
}

/** Every figure of the slides' copy: each number, and each number a
 *  string writes, as `<where>: <value>` lines. */
export function slideFigures(slides: SlideCopy[]): string[] {
  return copyValues(slides).flatMap(({ at, value }) =>
    typeof value === "number"
      ? [`${at}: ${value}`]
      : [...numbersIn(value)].map((n) => `${at}: ${n} in "${value}"`),
  );
}

/** The phrases and figures of the slides' copy found in none of
 *  `sources`, as `<where>: <phrase or figure>` lines: a phrase must stand
 *  in one of them (`untraced`); a number, or a number a string writes, must
 *  be one they write, grouped or not, never rounded or converted ("5%" does
 *  not trace to "4.5%"). */
export function untracedCopy(slides: SlideCopy[], sources: string[]) {
  const numbers = new Set(sources.flatMap((s) => [...numbersIn(s)]));
  return copyValues(slides).flatMap(({ at, value }) => {
    if (typeof value === "number")
      return numbers.has(value) ? [] : [`${at}: ${value}`];
    return [
      ...untraced(value, sources).map((phrase) => `${at}: ${phrase}`),
      ...[...numbersIn(value)]
        .filter((n) => !numbers.has(n))
        .map((n) => `${at}: ${n} in "${value}"`),
    ];
  });
}

/** The numbers a text writes, as written: "1,200" and "1 200" (with a
 *  no-break or thin space) are 1200, "4.5%" is 4.5, "4,5" is 4.5, and "-3"
 *  is -3. A digit inside a word or a longer number ("Q1", the "200" of
 *  "1,200") is not a number of its own. */
export function numbersIn(text: string): Set<number> {
  const found = new Set<number>();
  const pattern =
    /(?<![\p{L}\d.,])([-−]?)(\d{1,3}(?:[,  ]\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)(?![\d])/gu;
  for (const [, sign, digits] of text.matchAll(pattern)) {
    const grouped = /[,  ]\d{3}(?:\.|$)/.test(digits);
    const plain = grouped
      ? digits.replace(/[,  ]/g, "")
      : digits.replace(",", ".");
    const value = Number(plain);
    if (!Number.isFinite(value)) continue;
    found.add(sign ? -value : value);
  }
  return found;
}
