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

/**
 * Every slide string in a drafted deck. A deck is `{ langs, slides,
 * content }`, as in src/deck/langs.ts and src/deck/slides.ts; the fixture
 * may hold one deck or an array of them (one per dry run). A text is an
 * object whose keys are all language codes and whose values are strings,
 * so ids, kinds, layouts and dates are not slide text.
 */
export function slideTexts(fixture: unknown): string[] {
  const decks = Array.isArray(fixture) ? fixture : [fixture];
  const texts: string[] = [];
  type Deck = { langs?: string[]; slides?: unknown; content?: unknown };
  for (const deck of decks as Deck[]) {
    const langs = new Set(deck.langs ?? ["en"]);
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== "object") return;
      const entries = Object.entries(value);
      const isText =
        entries.length > 0 &&
        entries.every(([k, v]) => langs.has(k) && typeof v === "string");
      if (isText) {
        texts.push(...entries.map(([, v]) => v as string));
        return;
      }
      entries.forEach(([, child]) => walk(child));
    };
    walk([deck.slides, deck.content]);
  }
  return texts;
}

// Feature 002, FR-016 (SC-003): the figures of a deck's visuals trace too.
// Their labels are `Text`s, so `slideTexts` already holds them; the figures
// are chart values (numbers) and stat values (strings, as the source writes
// them), which are not.

type Figure = { at: string; value: number | string };

/** Every chart value and stat value in a drafted deck (one deck or an
 *  array of them), with where it stands: `<slide>: <block> <path>`. */
function figuresOf(fixture: unknown): Figure[] {
  const decks = Array.isArray(fixture) ? fixture : [fixture];
  const found: Figure[] = [];
  type Block = { type?: string; series?: unknown; items?: unknown };
  for (const deck of decks as { content?: Record<string, unknown> }[]) {
    for (const [id, slide] of Object.entries(deck.content ?? {})) {
      const blocks = (slide as { blocks?: Block[] })?.blocks ?? [];
      for (const block of blocks) {
        if (block?.type === "chart" && Array.isArray(block.series))
          block.series.forEach((series: { values?: unknown[] }, i) =>
            (series?.values ?? []).forEach((value, j) =>
              found.push({
                at: `${id}: chart series[${i}].values[${j}]`,
                value: value as number,
              }),
            ),
          );
        if (block?.type === "stat" && Array.isArray(block.items))
          block.items.forEach((item: { value?: unknown }, i) =>
            found.push({
              at: `${id}: stat items[${i}].value`,
              value: String(item?.value),
            }),
          );
      }
    }
  }
  return found;
}

/** Every chart value and stat value of a drafted deck, as `<where>:
 *  <value>` lines. */
export function visualFigures(fixture: unknown): string[] {
  return figuresOf(fixture).map(({ at, value }) => `${at}: ${value}`);
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

/** Whether a stat value, as written, stands in `source` on its own, not
 *  inside a longer word or number ("5%" is not in "4.5%"). */
function writtenIn(value: string, source: string) {
  const want = normalize(value);
  const haystack = normalize(source);
  const word = /[\p{L}\d]/u;
  for (
    let at = want ? haystack.indexOf(want) : -1;
    at >= 0;
    at = haystack.indexOf(want, at + 1)
  ) {
    const before = haystack.slice(Math.max(0, at - 2), at);
    const after = haystack.slice(at + want.length, at + want.length + 2);
    const startsInside =
      word.test(want[0]) &&
      (word.test(before.at(-1) ?? "") || /\d[.,]$/.test(before));
    const endsInside =
      word.test(want.at(-1)!) &&
      (word.test(after[0] ?? "") || /^[.,]\d/.test(after));
    if (!startsInside && !endsInside) return true;
  }
  return false;
}

/** The figures of `fixture` found in none of `sources`: a chart value must
 *  be a number one of them writes (grouped or not, never rounded or
 *  converted), and a stat value must stand in one of them as written. */
export function untracedFigures(fixture: unknown, sources: string[]) {
  const numbers = new Set(sources.flatMap((s) => [...numbersIn(s)]));
  return figuresOf(fixture)
    .filter(({ value }) =>
      typeof value === "number"
        ? !numbers.has(value)
        : !sources.some((source) => writtenIn(value, source)),
    )
    .map(({ at, value }) => `${at}: ${value}`);
}
