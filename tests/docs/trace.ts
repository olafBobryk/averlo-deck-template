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
