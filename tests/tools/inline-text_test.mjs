// Unit tests for the inline-text check (feature 003, T340; research R3;
// FR-010): every word and figure a slide shows comes from its `copy`.
// scripts/check-inline-text.mjs parses each slide file and preset file with
// the TypeScript compiler and names the file and line of any text typed into
// the JSX, or passed to a component as a literal. The fixtures are slide
// files held in memory, at paths inside src/slides/ so their imports
// resolve; none is written to disk.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkInlineText,
  format,
  slideFiles,
} from "../../scripts/check-inline-text.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** A slide file whose component returns `jsx`, with `copy`'s words. */
const slide = (jsx, words = "") => `import {
  Block,
  Body,
  Chart,
  Heading,
  Image,
  Lead,
  Steps,
} from "@/components/deck";
import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";

export const meta: SlideMeta = { kind: "slide", layout: "stack" };

export const copy = {
  en: {
    title: "Placeholder title",
    headline: "Placeholder text",
    categories: ["Placeholder text", "Placeholder text"],
    values: [10, 20],
    ${words}
  },
} satisfies Copy;

export default function Fixture({ t, lang }: SlideProps<typeof copy>) {
  return (
    <>
      ${jsx}
    </>
  );
}
`;

/** The problems the check finds in the fixtures (name → source), as
 *  `file:line: what` lines. */
function check(fixtures) {
  const sources = Object.fromEntries(
    Object.entries(fixtures).map(([name, source]) => [
      join(root, "src", "slides", name),
      source,
    ]),
  );
  return checkInlineText({ files: Object.keys(sources), sources }).map(format);
}

/** The line of `needle` in `source`, 1-based. */
const lineOf = (source, needle) =>
  source.split("\n").findIndex((line) => line.includes(needle)) + 1;

describe("the inline-text check", () => {
  // One program for every fixture: the compiler loads React's types once.
  const fixtures = {
    "90-inline-word.tsx": slide(
      "<Heading title={t.title} headline={t.headline} /><p>Revenue</p>",
    ),
    "91-from-t.tsx": slide(`<Heading title={t.title} headline={t.headline} />
      <Body>
        <Block type="lead">
          <Lead>{t.headline}</Lead>
        </Block>
        <Block type="chart">
          <Chart
            kind="bar"
            categories={t.categories}
            series={[{ name: t.title, values: t.values }]}
            lang={lang}
          />
        </Block>
        <Block type="steps">
          <Steps items={[{ label: t.title, status: "done" }]} />
        </Block>
        <Block type="image">
          <Image src="/images/placeholder.png" alt={t.title} fit="cover" />
        </Block>
      </Body>`),
    "92-chart-number.tsx": slide(`<Chart
        kind="bar"
        categories={t.categories}
        series={[{ name: t.title, values: [40, 60] }]}
      />`),
    "93-string-prop.tsx": slide(
      '<Heading title={t.title} headline="Revenue grew" />',
    ),
    "94-child-literal.tsx": slide('<Lead>{"Revenue grew"}</Lead>'),
    "95-nested-label.tsx": slide(
      '<Steps items={[{ label: "Launch", status: "done" }]} />',
    ),
    "96-alt.tsx": slide('<img alt="A team at work" className="photo" />'),
  };
  const found = check(fixtures);
  const of = (name) =>
    found.filter((line) => line.startsWith(`src/slides/${name}:`));

  test("an inline word fails, naming the file and the line", () => {
    const name = "90-inline-word.tsx";
    assert.deepEqual(of(name), [
      `src/slides/${name}:${lineOf(fixtures[name], "Revenue")}: the text "Revenue" is typed into the JSX`,
    ]);
  });

  test("words and figures read from t pass, and so do settings and paths", () => {
    assert.deepEqual(of("91-from-t.tsx"), []);
  });

  test("a literal number in a chart's values fails", () => {
    const name = "92-chart-number.tsx";
    const line = lineOf(fixtures[name], "values: [40, 60]");
    assert.deepEqual(of(name), [
      `src/slides/${name}:${line}: the figure 40 in \`values\` is not from copy`,
      `src/slides/${name}:${line}: the figure 60 in \`values\` is not from copy`,
    ]);
  });

  test("a string literal in a deck component's text prop fails", () => {
    assert.equal(of("93-string-prop.tsx").length, 1);
    assert.match(of("93-string-prop.tsx")[0], /"Revenue grew" in `headline`/);
  });

  test("a string literal rendered as a child fails", () => {
    assert.equal(of("94-child-literal.tsx").length, 1);
    assert.match(of("94-child-literal.tsx")[0], /"Revenue grew" is typed/);
  });

  test("a label inside a prop's objects fails; a status passes", () => {
    assert.equal(of("95-nested-label.tsx").length, 1);
    assert.match(of("95-nested-label.tsx")[0], /"Launch" in `label`/);
  });

  test("alt text on any element fails; a class name does not", () => {
    assert.equal(of("96-alt.tsx").length, 1);
    assert.match(of("96-alt.tsx")[0], /"A team at work" in `alt`/);
  });
});

describe("the deck's slide files and preset files", () => {
  test("the check reads every slide file and every preset file", () => {
    const files = slideFiles().map((path) => path.slice(root.length));
    const slides = readdirSync(join(root, "src", "slides"))
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => `src/slides/${name}`);
    for (const path of slides) assert.ok(files.includes(path), path);
    for (const path of [
      "src/presets/slides/bar-chart.tsx",
      "src/presets/slides/alternates/bar-chart.tsx",
      "src/presets/slides/composed/composed-visual.tsx",
    ])
      assert.ok(files.includes(path), path);
  });

  test("no word or figure is typed outside copy", () => {
    assert.deepEqual(checkInlineText().map(format), []);
  });

  test("the drafted slides of the dry run have none either", () => {
    const dir = join(root, "tests", "fixtures", "drafted-slides");
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => join(dir, name));
    assert.ok(files.length > 0, "tests/fixtures/drafted-slides/ has slides");
    assert.deepEqual(checkInlineText({ files }).map(format), []);
  });
});
