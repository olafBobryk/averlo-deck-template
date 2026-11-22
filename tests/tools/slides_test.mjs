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
  readSlideFile,
  renderData,
  renderIndex,
  renderPresetData,
  renderPresetIndex,
  scanPresets,
  scanSlides,
} from "../../scripts/slides-index.mjs";
import { registry } from "../../src/presets/registry.ts";

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

describe("the preset files (J3, T330)", () => {
  const presets = join(root, "src", "presets", "slides");

  test("are listed by path: the examples, then each subfolder's", () => {
    const dir = folder({});
    mkdirSync(join(dir, "alternates"));
    writeFileSync(join(dir, "b-chart.tsx"), slideFile());
    writeFileSync(join(dir, "a-chart.tsx"), slideFile());
    writeFileSync(join(dir, "alternates", "a-chart.tsx"), slideFile());
    writeFileSync(join(dir, "index.ts"), "export const presetFiles = [];");
    assert.deepEqual(
      scanPresets(dir).map((file) => file.id),
      ["a-chart", "b-chart", "alternates/a-chart"],
    );
  });

  test("a preset file without meta, or with copy that is not a literal, fails and names it", () => {
    const dir = folder({ "a-chart.tsx": slideFile({ meta: false }) });
    assert.throws(() => scanPresets(dir), /a-chart\.tsx.*meta/);
  });

  test("a slide file that re-exports another's slide reads that file's data", () => {
    const dir = folder({
      "source.tsx": slideFile(),
      "01-copy.tsx": 'export { copy, default, meta } from "./source";\n',
    });
    assert.deepEqual(readSlideFile(join(dir, "01-copy.tsx")), {
      meta: { kind: "slide" },
      copy: { en: { title: "Placeholder title" } },
    });
    const bad = folder({
      "source.tsx": slideFile(),
      "01-copy.tsx": 'export { copy, default } from "./source";\n',
    });
    assert.throws(() => scanSlides(bad), /01-copy\.tsx.*meta/);
  });

  test("src/presets/slides/index.ts and data.ts match the files", async () => {
    const files = scanPresets(presets);
    assert.equal(
      readFileSync(join(presets, "index.ts"), "utf8"),
      await renderPresetIndex(files),
      "src/presets/slides/index.ts is stale: run npm run slides",
    );
    assert.equal(
      readFileSync(join(presets, "data.ts"), "utf8"),
      await renderPresetData(files),
      "src/presets/slides/data.ts is stale: run npm run slides",
    );
  });

  test("every preset has its example file and a second example, and nothing else is a preset", () => {
    const ids = scanPresets(presets).map((file) => file.id);
    for (const entry of registry) {
      assert.ok(ids.includes(entry.file), `${entry.name}: ${entry.file}.tsx`);
      assert.ok(
        ids.includes(`alternates/${entry.file}`),
        `${entry.name}: alternates/${entry.file}.tsx`,
      );
    }
    const top = ids.filter((id) => !id.includes("/"));
    assert.deepEqual(
      top.sort(),
      registry.map((entry) => entry.file).sort(),
      "one example file per preset in src/presets/slides/",
    );
  });

  test("the registry holds no data examples", () => {
    for (const entry of registry) {
      assert.ok(!("example" in entry), `${entry.name}: example`);
      assert.ok(!("alternate" in entry), `${entry.name}: alternate`);
    }
  });

  test("each example's title is its preset's name, and its layout the registry's", () => {
    const files = new Map(scanPresets(presets).map((file) => [file.id, file]));
    for (const entry of registry) {
      const file = files.get(entry.file);
      assert.ok(file, entry.name);
      for (const words of Object.values(file.copy))
        assert.equal(words.title, entry.name);
      assert.equal(file.meta.layout, entry.layout, entry.name);
    }
  });

  test("no preset file names an image src: each shows the placeholder", () => {
    for (const file of scanPresets(presets))
      assert.doesNotMatch(
        readFileSync(join(presets, file.name), "utf8"),
        /\bsrc=/,
        file.name,
      );
  });

  test("the deck's showcase draws the preset files, in the registry's order", () => {
    const slides = scanSlides(join(root, "src", "slides"));
    const at = slides.findIndex((slide) => slide.id === "showcase");
    assert.ok(at > 0, "the showcase's divider");
    registry.forEach((entry, i) => {
      const slide = slides[at + 1 + i];
      assert.ok(slide, entry.name);
      assert.match(
        readFileSync(join(root, "src", "slides", slide.name), "utf8"),
        new RegExp(
          `^export \\{ copy, default, meta \\} from "@/presets/slides/${entry.file}";$`,
          "m",
        ),
        `${slide.name} re-exports ${entry.file}`,
      );
    });
  });
});
