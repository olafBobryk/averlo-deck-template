import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { scanSlides } from "../../scripts/slides-index.mjs";
import { slideData } from "../../src/slides/data";
import { exists, read, root } from "./markdown";
import {
  copyValues,
  normalize,
  slideFigures,
  slideTexts,
  untraced,
  untracedCopy,
  type SlideCopy,
} from "./trace";

// User Story 3, scenario 1 (SC-006): a deck drafted through "Draft a deck
// from any source" holds only text that traces to the sample source or to
// the owner's answers. Feature 002 (FR-016, SC-003) extends the rule to
// visuals: their labels and their chart and stat figures.
//
// Feature 003 (T340; User Story 4, FR-009, SC-004): a slide is a file, and
// its words and figures sit in its `copy`. The trace reads every slide
// file's copy, in every language, lists included: from src/slides/data.ts
// for the deck, and from tests/fixtures/drafted-slides/ for the dry run of
// the deck-visuals skill (T144, redone as slide files in T341). No browser,
// no server.

const SOURCE = "tests/fixtures/sample-source.md";
const SLIDES = "tests/fixtures/drafted-slides";
const ANSWERS = "tests/fixtures/answers.md";

/** A slide file's data with `words` as its one language's copy. */
const slide = (id: string, words: Record<string, unknown>): SlideCopy => ({
  number: 1,
  id,
  copy: { en: { title: "Revenue", ...words } },
});

/** The strings and numbers in a value, however deep. */
const leaves = (value: unknown): number =>
  typeof value === "string" || typeof value === "number"
    ? 1
    : value && typeof value === "object"
      ? Object.values(value).reduce((n: number, v) => n + leaves(v), 0)
      : 0;

test.describe("content workflow", () => {
  // Data only: the same in both projects, so run once.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "no browser; runs once");
  });

  const sources = [
    "Sales by quarter: Q1 1,200 units, Q2 1,450 units, Q3 990 units.\n" +
      "Churn fell to 4.5% in the spring. Teams: North and South.",
  ];

  test("the trace rule: a phrase from the source passes, an invented one does not", () => {
    const text = ["The launch moves to **March**.\nWe test  with five teams."];
    expect(untraced("The launch moves to March.", text)).toEqual([]);
    expect(untraced("we test with FIVE teams", text)).toEqual([]);
    expect(
      untraced("The launch moves to March. Sales will double.", text),
    ).toEqual(["sales will double"]);
  });

  test("a slide's copy is its text: every string, in every language and every list", () => {
    const slides: SlideCopy[] = [
      {
        number: 4,
        id: "sales",
        copy: {
          en: {
            title: "Sales by quarter",
            categories: ["Q1", "Q2", "Q3"],
            series: ["Units"],
            values: [[1200, 1450, 990]],
            stats: [{ value: "4.5%", label: "Churn" }],
          },
          fr: { title: "Ventes" },
        },
      },
    ];
    expect(slideTexts(slides)).toEqual([
      "Sales by quarter",
      "Q1",
      "Q2",
      "Q3",
      "Units",
      "4.5%",
      "Churn",
      "Ventes",
    ]);
    expect(copyValues(slides).map(({ at }) => at)).toContain(
      "04-sales.tsx: copy.en.values[0][2]",
    );
    expect(slideFigures(slides)).toEqual([
      "04-sales.tsx: copy.en.values[0][0]: 1200",
      "04-sales.tsx: copy.en.values[0][1]: 1450",
      "04-sales.tsx: copy.en.values[0][2]: 990",
      '04-sales.tsx: copy.en.stats[0].value: 4.5 in "4.5%"',
    ]);
  });

  test("a word that traces nowhere fails and names the slide", () => {
    expect(
      untracedCopy(
        [slide("sales", { headline: "Teams: North and South." })],
        sources,
      ),
    ).toEqual(["01-sales.tsx: copy.en.title: revenue"]);
    expect(
      untracedCopy(
        [
          slide("forecast", {
            title: "Sales by quarter",
            labels: ["Q1", "Q4 forecast"],
          }),
        ],
        sources,
      ),
    ).toEqual(["01-forecast.tsx: copy.en.labels[1]: q4 forecast"]);
  });

  test("figures trace as written or formatted, never rounded or converted", () => {
    const figures = (words: Record<string, unknown>) =>
      untracedCopy([slide("a", { title: "Sales by quarter", ...words })], sources);
    // As written, or with its thousands grouped.
    expect(figures({ values: [[1200, 1450, 990]] })).toEqual([]);
    expect(figures({ values: [4.5], stat: "4.5%" })).toEqual([]);
    // Rounded, invented or converted figures do not trace.
    expect(figures({ values: [1000] })).toEqual([
      "01-a.tsx: copy.en.values[0]: 1000",
    ]);
    expect(figures({ values: [5, 200] })).toEqual([
      "01-a.tsx: copy.en.values[0]: 5",
      "01-a.tsx: copy.en.values[1]: 200",
    ]);
    // "5%" stands inside "4.5%", but the figure 5 does not.
    expect(figures({ stat: "5%" })).toEqual(['01-a.tsx: copy.en.stat: 5 in "5%"']);
  });

  test("the trace reads every slide file's copy from src/slides/data.ts, labels and figures included", () => {
    expect(slideData.length, "the deck has slide files").toBeGreaterThan(0);
    const values = copyValues(slideData);
    for (const file of slideData) {
      const name = `${String(file.number).padStart(2, "0")}-${file.id}.tsx`;
      const mine = values.filter(({ at }) => at.startsWith(`${name}: `));
      // Every leaf of the file's copy, strings and numbers, in every
      // language.
      expect(mine.length, `${name}: every word and figure`).toBe(
        leaves(file.copy),
      );
      for (const lang of Object.keys(file.copy))
        expect(
          mine.some(({ at }) => at === `${name}: copy.${lang}.title`),
          `${name}: its title in ${lang}`,
        ).toBe(true);
    }
    expect(
      slideFigures(slideData).length,
      "the deck's charts' figures are read",
    ).toBeGreaterThan(0);
  });

  test("the sample source is marked as sample material, 300 to 500 words", () => {
    expect(exists(SOURCE), `${SOURCE} exists`).toBe(true);
    const text = read(SOURCE);
    expect(normalize(text.split("\n").slice(0, 5).join(" "))).toMatch(/sample/);
    const words = text.split(/\s+/).filter((w) => /\w/.test(w)).length;
    expect(words).toBeGreaterThanOrEqual(300);
    expect(words).toBeLessThanOrEqual(500);
  });

  test("every word and figure of the drafted slides traces to the source or the answers", () => {
    expect(exists(SLIDES), `${SLIDES}/ holds the dry run's slide files`).toBe(
      true,
    );
    expect(exists(ANSWERS), `${ANSWERS} exists`).toBe(true);
    const slides = scanSlides(join(root, SLIDES)) as SlideCopy[];
    expect(slides.length, "the dry run drafted slides").toBeGreaterThan(0);
    expect(slideTexts(slides).length, "they have slide text").toBeGreaterThan(
      0,
    );
    expect(
      untracedCopy(slides, [read(SOURCE), read(ANSWERS)]),
      "words and figures found in neither file",
    ).toEqual([]);
  });
});
