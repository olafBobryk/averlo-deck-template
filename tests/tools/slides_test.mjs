// Unit tests for the slide index (feature 003, T300; research R1). Each
// slide is a numbered file in src/slides/ (`NN-name.tsx`) exporting `meta`,
// `copy` and a default component. scripts/slides-index.mjs lists the files
// in number order, takes each id from its name, fails on a file the deck
// cannot place, and writes the folder's generated `index.ts`, and its
// `data.ts`: each file's number, id, `meta` and `copy` as literal values,
// which plain Node imports (J2, T320).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  readSlide,
  renderData,
  renderIndex,
  scanSlides,
} from "../../scripts/slides-index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const script = join(root, "scripts", "slides-index.mjs");

/** A slide file with the given exports. */
const slideFile = ({ meta = true, copy = true, component = true } = {}) =>
  [
    'import type { Copy, SlideMeta, SlideProps } from "@/deck/slide";',
    meta && 'export const meta: SlideMeta = { kind: "slide" };',
    copy &&
      'export const copy = { en: { title: "Placeholder title" } } satisfies Copy;',
    component &&
      "export default function Slide({ t }: SlideProps<typeof copy>) {\n  return <p>{t.title}</p>;\n}",
  ]
    .filter(Boolean)
    .join("\n");

const scratch = mkdtempSync(join(tmpdir(), "slides-index-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
let n = 0;
/** A temporary slide folder holding `files` (name → source). */
function folder(files) {
  const dir = join(scratch, String(n++));
  mkdirSync(dir);
  for (const [name, source] of Object.entries(files))
    writeFileSync(join(dir, name), source);
  return dir;
}

describe("scanSlides", () => {
  test("sorts by the number prefix, not the name", () => {
    const dir = folder({
      "10-ten.tsx": slideFile(),
      "2-two.tsx": slideFile(),
      "01-one.tsx": slideFile(),
    });
    const files = scanSlides(dir);
    assert.deepEqual(
      files.map((f) => [f.number, f.id]),
      [
        [1, "one"],
        [2, "two"],
        [10, "ten"],
      ],
    );
  });

  test("takes the id from the name without its number", () => {
    const dir = folder({ "05-year-one-results.tsx": slideFile() });
    assert.equal(scanSlides(dir)[0].id, "year-one-results");
  });

  test("skips the generated index and files that are not slides", () => {
    const dir = folder({
      "01-one.tsx": slideFile(),
      "index.ts": "export const slideFiles = [];",
      "helpers.ts": "export const x = 1;",
      "notes.md": "notes",
    });
    assert.deepEqual(
      scanSlides(dir).map((f) => f.name),
      ["01-one.tsx"],
    );
  });

  test("an empty folder is an empty deck", () => {
    assert.deepEqual(scanSlides(folder({})), []);
  });

  test("fails on a duplicate number and names both files", () => {
    const dir = folder({ "03-a.tsx": slideFile(), "3-b.tsx": slideFile() });
    assert.throws(
      () => scanSlides(dir),
      (error) =>
        /03-a\.tsx/.test(error.message) && /3-b\.tsx/.test(error.message),
    );
  });

  test("fails on a duplicate id and names both files", () => {
    const dir = folder({ "01-a.tsx": slideFile(), "02-a.tsx": slideFile() });
    assert.throws(
      () => scanSlides(dir),
      (error) =>
        /01-a\.tsx/.test(error.message) && /02-a\.tsx/.test(error.message),
    );
  });

  test("fails on a file without a number and names it", () => {
    const dir = folder({ "01-one.tsx": slideFile(), "intro.tsx": slideFile() });
    assert.throws(() => scanSlides(dir), /intro\.tsx/);
  });

  test("fails on a file without meta and names it", () => {
    const dir = folder({ "01-one.tsx": slideFile({ meta: false }) });
    assert.throws(() => scanSlides(dir), /01-one\.tsx.*meta/);
  });

  test("fails on a file without copy and names it", () => {
    const dir = folder({ "01-one.tsx": slideFile({ copy: false }) });
    assert.throws(() => scanSlides(dir), /01-one\.tsx.*copy/);
  });

  test("fails on a file without a default component and names it", () => {
    const dir = folder({ "01-one.tsx": slideFile({ component: false }) });
    assert.throws(() => scanSlides(dir), /01-one\.tsx.*default/);
  });
});

describe("the generated index", () => {
  test("imports each file's meta, copy and component, in number order", async () => {
    const dir = folder({
      "10-ten.tsx": slideFile(),
      "02-two.tsx": slideFile(),
    });
    const index = await renderIndex(scanSlides(dir));
    const two = index.indexOf('"./02-two"');
    const ten = index.indexOf('"./10-ten"');
    assert.ok(two > 0 && ten > two, index);
    assert.match(index, /slideFile\(2, "two",/);
    assert.match(index, /slideFile\(10, "ten",/);
    assert.ok(
      index.indexOf('slideFile(2, "two"') <
        index.indexOf('slideFile(10, "ten"'),
    );
  });

  for (const dir of ["src/slides", "tests/slides/fixtures"])
    test(`${dir}/index.ts matches the files`, async () => {
      const expected = await renderIndex(scanSlides(join(root, dir)));
      assert.equal(
        readFileSync(join(root, dir, "index.ts"), "utf8"),
        expected,
        `${dir}/index.ts is stale: run npm run slides`,
      );
    });

  test("the script writes the folder SLIDES_DIR names, and fails on a bad file", () => {
    const dir = folder({
      "01-one.tsx": slideFile(),
      "02-two.tsx": slideFile(),
    });
    const ok = spawnSync(process.execPath, [script], {
      env: { ...process.env, SLIDES_DIR: dir },
      encoding: "utf8",
    });
    assert.equal(ok.status, 0, ok.stderr);
    const index = readFileSync(join(dir, "index.ts"), "utf8");
    assert.ok(index.indexOf('"./01-one"') < index.indexOf('"./02-two"'));

    writeFileSync(join(dir, "intro.tsx"), slideFile());
    const bad = spawnSync(process.execPath, [script], {
      env: { ...process.env, SLIDES_DIR: dir },
      encoding: "utf8",
    });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /intro\.tsx/);
  });
});

describe("the generated data file (J2, T320)", () => {
  test("reads meta and copy as literals, through satisfies and as", () => {
    const source = [
      'import type { Copy, SlideMeta } from "@/deck/slide";',
      'export const meta: SlideMeta = { kind: "slide", section: "section", layout: "split" };',
      "export const copy = {",
      '  en: { title: "Placeholder title", section: "Placeholder text", "two words": "Placeholder text", values: [10, -20, 0.5], when: `Placeholder date` },',
      "} satisfies Copy;",
      "export const other = makeIt();",
      "export default function Slide() { return null; }",
    ].join("\n");
    assert.deepEqual(readSlide(source), {
      meta: { kind: "slide", section: "section", layout: "split" },
      copy: {
        en: {
          title: "Placeholder title",
          section: "Placeholder text",
          "two words": "Placeholder text",
          values: [10, -20, 0.5],
          when: "Placeholder date",
        },
      },
    });
  });

  for (const [what, meta, copy, pattern] of [
    [
      "a copy made by a call",
      '{ kind: "slide" }',
      "makeCopy()",
      /copy.*makeCopy\(\).*not a literal/,
    ],
    [
      "a copy that names a value",
      '{ kind: "slide" }',
      "{ en: { title: placeholder } }",
      /copy\.en\.title.*placeholder.*not a literal/,
    ],
    [
      "a copy with a spread",
      '{ kind: "slide" }',
      '{ en: { ...base, title: "Placeholder title" } }',
      /copy\.en.*\.\.\.base.*not a plain property/,
    ],
    [
      "a meta that names a value",
      "base",
      '{ en: { title: "Placeholder title" } }',
      /meta.*base.*not a literal/,
    ],
    [
      "a meta with an unknown kind",
      '{ kind: "poster" }',
      '{ en: { title: "Placeholder title" } }',
      /meta\.kind.*poster/,
    ],
    [
      "a copy without a title",
      '{ kind: "slide" }',
      '{ en: { body: "Placeholder text" } }',
      /copy\.en\.title/,
    ],
    [
      "a section that names no word",
      '{ kind: "slide", section: "section" }',
      '{ en: { title: "Placeholder title" } }',
      /meta\.section.*"section"/,
    ],
  ])
    test(`fails on ${what} and names the file and the value`, () => {
      const dir = folder({
        "01-one.tsx": [
          `export const meta = ${meta};`,
          `export const copy = ${copy};`,
          "export default function Slide() { return null; }",
        ].join("\n"),
      });
      assert.throws(
        () => scanSlides(dir),
        (error) =>
          /01-one\.tsx/.test(error.message) && pattern.test(error.message),
      );
    });

  test("lists each file's number, id, meta and copy, and plain Node imports it", async () => {
    const dir = folder({
      "10-ten.tsx": slideFile(),
      "02-two.tsx": slideFile(),
    });
    const data = await renderData(scanSlides(dir));
    writeFileSync(join(dir, "data.ts"), data);
    const { slideData } = await import(join(dir, "data.ts"));
    assert.deepEqual(slideData, [
      {
        number: 2,
        id: "two",
        meta: { kind: "slide" },
        copy: { en: { title: "Placeholder title" } },
      },
      {
        number: 10,
        id: "ten",
        meta: { kind: "slide" },
        copy: { en: { title: "Placeholder title" } },
      },
    ]);
  });

  for (const dir of ["src/slides", "tests/slides/fixtures"])
    test(`${dir}/data.ts matches the files`, async () => {
      const expected = await renderData(scanSlides(join(root, dir)));
      assert.equal(
        readFileSync(join(root, dir, "data.ts"), "utf8"),
        expected,
        `${dir}/data.ts is stale: run npm run slides`,
      );
    });

  test("the script writes the data file beside the index", () => {
    const dir = folder({ "01-one.tsx": slideFile() });
    const ok = spawnSync(process.execPath, [script], {
      env: { ...process.env, SLIDES_DIR: dir },
      encoding: "utf8",
    });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(readFileSync(join(dir, "data.ts"), "utf8"), /id: "one"/);
  });
});

describe("the placeholder deck (J2, T320)", () => {
  test("is its slide files: src/deck/slides.ts holds no slide of its own", () => {
    const source = readFileSync(join(root, "src/deck/slides.ts"), "utf8");
    assert.doesNotMatch(source, /\bkind:/, "a slide written in slides.ts");
    assert.doesNotMatch(source, /\bblocks:/, "content written in slides.ts");
    assert.match(source, /@\/slides\/data/);
  });

  test("its files are the J1 deck's slides, in the same order", async () => {
    const { slideData } = await import(join(root, "src/slides/data.ts"));
    const presets = [
      "bar-chart",
      "line-chart",
      "donut-chart",
      "stat-cards",
      "process-flow",
      "timeline",
      "cycle",
      "org-chart",
      "comparison-table",
      "2-2-matrix",
      "quote",
      "statement",
      "agenda",
      "compare",
      "image-and-text",
      "full-bleed-image",
      "captioned-image",
      "image-grid",
    ];
    assert.deepEqual(
      slideData.map((slide) => slide.id),
      [
        "title",
        "divider",
        "stack",
        "split",
        "split-end",
        "center",
        "statement",
        "module",
        "fork",
        "divider-2",
        "week",
        "plan",
        "showcase",
        ...presets.map((name) => `showcase-${name}`),
        "closing",
      ],
    );
    assert.deepEqual(
      slideData.map((slide) => slide.number),
      slideData.map((_, i) => i + 1),
    );
  });
});
