import { expect, test } from "@playwright/test";
import { exists, read } from "./markdown";
import {
  normalize,
  slideTexts,
  untraced,
  untracedFigures,
  visualFigures,
} from "./trace";

// User Story 3, scenario 1 (SC-006): a deck drafted through "Draft a deck
// from any source" holds only text that traces to the sample source or to
// the owner's answers. The workflow's dry run (T041) writes the drafted deck
// and the answers as fixtures; until then the trace check is not run.
// Feature 002 (FR-016, SC-003) extends the rule to visuals: their labels and
// their chart and stat figures; the deck-visuals skill's dry run (T144)
// writes the drafted visuals. No browser, no server.

const SOURCE = "tests/fixtures/sample-source.md";
const DECK = "tests/fixtures/drafted-deck.json";
const VISUALS = "tests/fixtures/drafted-visuals.json";
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

  // Feature 002, FR-016 (SC-003): the trace covers visuals too. Every label
  // of a visual is slide text, and every chart value and stat value is a
  // figure that stands in the source or the answers, as written or
  // formatted (1200 traces to "1,200"), never rounded or converted.
  const visualDeck = (blocks: unknown[]) => ({
    langs: ["en"],
    slides: [{ id: "a", kind: "slide", title: { en: "Sales" } }],
    content: { a: { blocks } },
  });
  const sources = [
    "Sales by quarter: Q1 1,200 units, Q2 1,450 units, Q3 990 units.\n" +
      "Churn fell to 4.5% in the spring. Teams: North and South.",
  ];

  test("a visual's labels are slide text: categories, series names, units and sources", () => {
    const deck = visualDeck([
      {
        type: "chart",
        kind: "bar",
        categories: [{ en: "Q1" }, { en: "Q2" }, { en: "Q3" }],
        series: [{ name: { en: "Units" }, values: [1200, 1450, 990] }],
        unit: { en: "units" },
        source: { en: "Sales by quarter" },
      },
      {
        type: "matrix",
        x: { en: "North" },
        y: { en: "South" },
        quadrants: [{ label: { en: "Q1" } }, { label: { en: "Q2" } }],
        items: [{ label: { en: "Teams" }, x: 0.5, y: 0.5 }],
      },
    ]);
    const texts = slideTexts(deck);
    expect(texts).toEqual(
      expect.arrayContaining(["Q1", "Q2", "Q3", "Units", "Sales by quarter"]),
    );
    expect(texts.flatMap((t) => untraced(t, sources))).toEqual([]);
    const invented = visualDeck([
      { type: "flow", steps: [{ label: { en: "Q4 forecast" } }] },
    ]);
    expect(slideTexts(invented).flatMap((t) => untraced(t, sources))).toEqual([
      "q4 forecast",
    ]);
  });

  test("chart values and stat values trace as written or formatted, never rounded", () => {
    const chart = (values: number[]) => ({
      type: "chart",
      kind: "bar",
      categories: values.map((_, i) => ({ en: `Q${i + 1}` })),
      series: [{ name: { en: "Units" }, values }],
    });
    const stat = (value: string) => ({
      type: "stat",
      items: [{ value, label: { en: "Churn" } }],
    });
    // As written, or with its thousands grouped.
    expect(
      untracedFigures(visualDeck([chart([1200, 1450, 990])]), sources),
    ).toEqual([]);
    expect(untracedFigures(visualDeck([stat("4.5%")]), sources)).toEqual([]);
    expect(untracedFigures(visualDeck([chart([4.5])]), sources)).toEqual([]);
    // Rounded, invented or converted figures do not trace.
    expect(untracedFigures(visualDeck([chart([1000])]), sources)).toEqual([
      "a: chart series[0].values[0]: 1000",
    ]);
    expect(untracedFigures(visualDeck([chart([5])]), sources)).toEqual([
      "a: chart series[0].values[0]: 5",
    ]);
    expect(untracedFigures(visualDeck([chart([200])]), sources)).toEqual([
      "a: chart series[0].values[0]: 200",
    ]);
    expect(untracedFigures(visualDeck([stat("5%")]), sources)).toEqual([
      "a: stat items[0].value: 5%",
    ]);
    // A deck without visuals has no figures to trace.
    expect(
      visualFigures({
        langs: ["en"],
        slides: [],
        content: { a: { blocks: [{ type: "lead", item: { text: {} } }] } },
      }),
    ).toEqual([]);
  });

  test("every visual of the drafted visuals deck traces: labels and figures", () => {
    test.skip(
      !exists(VISUALS) || !exists(ANSWERS),
      `not run — T144: the skill's dry run writes ${VISUALS} and ${ANSWERS}`,
    );
    const deck = JSON.parse(read(VISUALS));
    const sources = [read(SOURCE), read(ANSWERS)];
    const texts = slideTexts(deck);
    expect(texts.length, "the drafted deck has slide text").toBeGreaterThan(0);
    expect(
      texts.flatMap((text) => untraced(text, sources)),
      "phrases found in neither file",
    ).toEqual([]);
    expect(
      untracedFigures(deck, sources),
      "figures found in neither file",
    ).toEqual([]);
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
    expect(
      untracedFigures(JSON.parse(read(DECK)), sources),
      "figures found in neither file",
    ).toEqual([]);
  });
});
