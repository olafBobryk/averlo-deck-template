import { expect, test } from "@playwright/test";
import { exists, read } from "./markdown";
import { normalize, slideTexts, untraced } from "./trace";

// User Story 3, scenario 1 (SC-006): a deck drafted through "Draft a deck
// from any source" holds only text that traces to the sample source or to
// the owner's answers. The workflow's dry run (T041) writes the drafted deck
// and the answers as fixtures; until then the trace check is not run. No
// browser, no server.

const SOURCE = "tests/fixtures/sample-source.md";
const DECK = "tests/fixtures/drafted-deck.json";
const ANSWERS = "tests/fixtures/answers.md";

test.describe("content workflow", () => {
  // Data only: the same in both projects, so run once.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "no browser; runs once");
  });

  test("the trace rule: a phrase from the source passes, an invented one does not", () => {
    const sources = [
      "The launch moves to **March**.\nWe test  with five teams.",
    ];
    expect(untraced("The launch moves to March.", sources)).toEqual([]);
    expect(untraced("we test with FIVE teams", sources)).toEqual([]);
    expect(
      untraced("The launch moves to March. Sales will double.", sources),
    ).toEqual(["sales will double"]);
    expect(
      slideTexts({
        langs: ["en"],
        slides: [{ id: "a", kind: "title", title: { en: "One" } }],
        content: {
          a: { blocks: [{ type: "plan", start: "2026-01", items: [] }] },
        },
      }),
    ).toEqual(["One"]);
  });

  test("the sample source is marked as sample material, 300 to 500 words", () => {
    expect(exists(SOURCE), `${SOURCE} exists`).toBe(true);
    const text = read(SOURCE);
    expect(normalize(text.split("\n").slice(0, 5).join(" "))).toMatch(/sample/);
    const words = text.split(/\s+/).filter((w) => /\w/.test(w)).length;
    expect(words).toBeGreaterThanOrEqual(300);
    expect(words).toBeLessThanOrEqual(500);
  });

  test("every slide text of the drafted deck traces to the source or the answers", () => {
    test.skip(
      !exists(DECK) || !exists(ANSWERS),
      `not run — T041: the workflow dry run writes ${DECK} and ${ANSWERS}`,
    );
    const texts = slideTexts(JSON.parse(read(DECK)));
    expect(texts.length, "the drafted deck has slide text").toBeGreaterThan(0);
    const sources = [read(SOURCE), read(ANSWERS)];
    const missing = texts.flatMap((text) => untraced(text, sources));
    expect(missing, "phrases found in neither file").toEqual([]);
  });
});
