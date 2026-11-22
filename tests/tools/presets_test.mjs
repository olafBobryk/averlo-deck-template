// Unit tests for the preset registry and its validator (feature 002, T100).
// The registry (src/presets/registry.ts) lists every preset: its name, its
// family, the block it draws, the source structure it fits and its example
// file in src/presets/slides/, with a second, different example in
// alternates/ (SC-005; feature 003, T331). Each preset component's limits
// (src/components/deck/limits.ts; feature 003, T341) hold data-model.md's
// limits that its typed props cannot.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { scanPresets } from "../../scripts/slides-index.mjs";
import { langs } from "../../src/deck/langs.ts";
import { families, registry } from "../../src/presets/registry.ts";
import { limits } from "../../src/components/deck/limits.ts";

/** Each preset file's data and source, by its path in src/presets/slides/
 *  (feature 003): an entry's example is `entry.file`, its second example
 *  `alternates/<entry.file>`. */
const presetsDir = new URL("../../src/presets/slides/", import.meta.url);
const presetFiles = new Map(
  scanPresets(presetsDir.pathname).map((file) => [
    file.id,
    {
      ...file,
      words: file.copy[langs[0]],
      source: readFileSync(new URL(file.name, presetsDir), "utf8"),
    },
  ]),
);
const example = (entry) => presetFiles.get(entry.file);
const alternate = (entry) => presetFiles.get(`alternates/${entry.file}`);

const items = (n, make) => Array.from({ length: n }, (_, i) => make(i));

describe("the registry", () => {
  test("has the four families, in order", () => {
    assert.deepEqual(families, ["charts", "diagrams", "text", "images"]);
  });

  test("names are unique", () => {
    const names = registry.map((entry) => entry.name);
    assert.equal(new Set(names).size, names.length, names.join(", "));
  });

  test("every entry's family is one of the four", () => {
    for (const entry of registry)
      assert.ok(
        families.includes(entry.family),
        `${entry.name}: ${entry.family}`,
      );
  });

  test("every entry says in one line what it fits", () => {
    for (const entry of registry) {
      assert.equal(typeof entry.fits, "string", entry.name);
      assert.ok(entry.fits.trim().length > 0, entry.name);
      assert.ok(!entry.fits.includes("\n"), entry.name);
    }
  });

  test("every example and its alternate draw the preset's block", () => {
    for (const entry of registry)
      for (const [which, file] of [
        ["example", example(entry)],
        ["alternate", alternate(entry)],
      ]) {
        assert.ok(file, `${entry.name}: no ${which} file`);
        assert.match(
          file.source,
          new RegExp(`<Block type="${entry.block}">`),
          `${entry.name} ${which}`,
        );
        assert.equal(file.meta.layout, entry.layout, `${entry.name} ${which}`);
      }
  });

  test("every alternate's words differ from its example's", () => {
    for (const entry of registry)
      assert.notDeepEqual(
        { ...alternate(entry).words, title: "" },
        { ...example(entry).words, title: "" },
        entry.name,
      );
  });

  // Phase V1 (T110): the charts and stats family.
  test("has the bar, line and donut charts and the stat cards, in the charts family", () => {
    for (const kind of ["bar", "line", "donut"]) {
      const entries = registry.filter(
        (entry) =>
          entry.block === "chart" &&
          example(entry).source.includes(`kind="${kind}"`),
      );
      assert.equal(entries.length, 1, `one ${kind} chart entry`);
      assert.equal(entries[0].family, "charts", kind);
      assert.ok(
        alternate(entries[0]).source.includes(`kind="${kind}"`),
        `${kind} alternate`,
      );
    }
    const stats = registry.filter((entry) => entry.block === "stat");
    assert.equal(stats.length, 1, "one stat entry");
    assert.equal(stats[0].family, "charts");
  });

  test("a chart's example and alternate differ in shape, not only in words", () => {
    for (const entry of registry.filter((e) => e.block === "chart")) {
      const shape = ({ words }) => [
        words.categories.length,
        words.series.length,
        Boolean(words.unit),
        Boolean(words.source),
      ];
      assert.notDeepEqual(
        shape(alternate(entry)),
        shape(example(entry)),
        entry.name,
      );
    }
  });

  // Phase V3 (T130): the text layouts and the image slides.
  test("has the quote, agenda, compare, statement and image + text, in the text family", () => {
    const one = (what, match) => {
      const entries = registry.filter(match);
      assert.equal(entries.length, 1, `one ${what} entry`);
      assert.equal(entries[0].family, "text", what);
      return entries[0];
    };
    for (const block of ["quote", "agenda", "compare"])
      one(block, (entry) => entry.block === block);
    // The statement: the carried `statement` layout with a `lead` block.
    one(
      "statement",
      (entry) => entry.block === "lead" && entry.layout === "statement",
    );
    // Image + text: an `image` block in a `split` layout.
    one(
      "image + text",
      (entry) => entry.block === "image" && entry.layout === "split",
    );
  });

  test("has the full-bleed, captioned and grid images, in the images family", () => {
    const images = registry.filter((entry) => entry.family === "images");
    const bleed = images.filter(
      (entry) =>
        entry.block === "image" &&
        /<Image\b[^>]*\bbleed\b/.test(example(entry).source),
    );
    assert.equal(bleed.length, 1, "one full-bleed image entry");
    const captioned = images.filter(
      (entry) =>
        entry.block === "image" &&
        !bleed.includes(entry) &&
        example(entry).words.caption !== undefined,
    );
    assert.equal(captioned.length, 1, "one captioned image entry");
    assert.equal(
      images.filter((entry) => entry.block === "imageGrid").length,
      1,
      "one image grid entry",
    );
  });

  test("a layout is one of the deck's slide layouts", () => {
    const layouts = [
      "stack",
      "split",
      "split-end",
      "center",
      "statement",
      "module",
    ];
    for (const entry of registry)
      assert.ok(
        layouts.includes(entry.layout),
        `${entry.name}: ${entry.layout}`,
      );
  });

  // Phase V2 (T120): the diagrams. One entry for each diagram block, in the
  // diagrams family, and each example and alternate differs in shape, so the
  // gallery shows the preset with a second, different content (SC-005).
  const diagramShape = {
    flow: (w) => [w.steps.length, Boolean(w.stepTexts)],
    timeline: (w) => [w.events.length, Boolean(w.eventTexts)],
    cycle: (w) => [w.stages.length, Boolean(w.stageTexts)],
    orgchart: (w) => [w.branches.length, w.leaves.map((l) => l.length)],
    table: (w) => [w.columns.length, w.rows.length],
    matrix: (w) => [w.items.length, Boolean(w.quadrantTexts)],
  };

  test("has the flow, timeline, cycle, org chart, table and matrix, in the diagrams family", () => {
    for (const block of Object.keys(diagramShape)) {
      const entries = registry.filter((entry) => entry.block === block);
      assert.equal(entries.length, 1, `one ${block} entry`);
      assert.equal(entries[0].family, "diagrams", block);
    }
    for (const entry of registry.filter((e) => e.family === "diagrams"))
      assert.ok(entry.block in diagramShape, `${entry.name}: ${entry.block}`);
  });

  test("a diagram's example and alternate differ in shape, not only in words", () => {
    for (const entry of registry.filter((e) => e.block in diagramShape)) {
      const shape = diagramShape[entry.block];
      assert.notDeepEqual(
        shape(alternate(entry).words),
        shape(example(entry).words),
        entry.name,
      );
    }
  });
});

describe("the chart presets' colours", () => {
  // Colours come only from CSS variables (the Averlo tokens), never from a
  // literal: no hex, rgb() or hsl() in the charts' components
  // (src/components/deck/charts/, feature 003) or their styles
  // (src/presets/charts/).
  const dir = new URL("../../src/components/deck/charts/", import.meta.url);
  const styles = new URL("../../src/presets/charts/", import.meta.url);
  const literal = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

  test("the charts folder holds Bar, Line, Donut and Stat", () => {
    const files = existsSync(dir) ? readdirSync(dir) : [];
    for (const name of ["Bar.tsx", "Line.tsx", "Donut.tsx", "Stat.tsx"])
      assert.ok(files.includes(name), `src/components/deck/charts/${name}`);
  });

  test("no colour literal appears in the charts' files", () => {
    const files = [dir, styles].flatMap((folder) =>
      existsSync(folder)
        ? readdirSync(folder).map((name) => new URL(name, folder))
        : [],
    );
    assert.ok(files.length > 0, "the charts have files");
    for (const name of files) {
      const lines = readFileSync(name, "utf8").split("\n");
      lines.forEach((line, i) =>
        assert.ok(!literal.test(line), `${name}:${i + 1}: ${line.trim()}`),
      );
    }
  });
});

describe("the diagram presets' files", () => {
  // Phase V2 (T120): the components T121 and T122 build, on the Averlo
  // tokens only, like the charts: no colour literal in their folders
  // (src/components/deck/diagrams/ since feature 003, the styles in
  // src/presets/diagrams/).
  const dir = new URL("../../src/components/deck/diagrams/", import.meta.url);
  const styles = new URL("../../src/presets/diagrams/", import.meta.url);
  const literal = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
  const names = [
    "Flow.tsx",
    "Timeline.tsx",
    "Cycle.tsx",
    "OrgChart.tsx",
    "Table.tsx",
    "Matrix.tsx",
  ];

  test(`src/components/deck/diagrams/ holds ${names.join(", ")}`, () => {
    const files = existsSync(dir) ? readdirSync(dir) : [];
    for (const name of names)
      assert.ok(files.includes(name), `src/components/deck/diagrams/${name}`);
  });

  test("no colour literal appears in the diagrams' files", () => {
    const files = [dir, styles].flatMap((folder) =>
      existsSync(folder)
        ? readdirSync(folder).map((name) => new URL(name, folder))
        : [],
    );
    assert.ok(files.length > 0, "the diagrams have files");
    for (const name of files) {
      const lines = readFileSync(name, "utf8").split("\n");
      lines.forEach((line, i) =>
        assert.ok(!literal.test(line), `${name}:${i + 1}: ${line.trim()}`),
      );
    }
  });
});

describe("the text and image presets' files", () => {
  // Phase V3 (T130): the components T131 and T132 build, on the Averlo
  // tokens only, like the charts: no colour literal in their folders
  // (src/components/deck/<family>/ since feature 003, the styles in
  // src/presets/<family>/).
  const literal = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
  const folders = {
    text: ["Quote.tsx", "Agenda.tsx", "Compare.tsx"],
    images: ["Image.tsx", "ImageGrid.tsx", "ImagePlaceholder.tsx"],
  };
  for (const [folder, names] of Object.entries(folders)) {
    const dir = new URL(
      `../../src/components/deck/${folder}/`,
      import.meta.url,
    );
    const styles = new URL(`../../src/presets/${folder}/`, import.meta.url);
    test(`src/components/deck/${folder}/ holds ${names.join(", ")}`, () => {
      const files = existsSync(dir) ? readdirSync(dir) : [];
      for (const name of names)
        assert.ok(
          files.includes(name),
          `src/components/deck/${folder}/${name}`,
        );
    });
    test(`no colour literal appears in the ${folder} presets' files`, () => {
      const files = [dir, styles].flatMap((at) =>
        existsSync(at) ? readdirSync(at).map((name) => new URL(name, at)) : [],
      );
      assert.ok(files.length > 0, `the ${folder} presets have files`);
      for (const name of files) {
        const lines = readFileSync(name, "utf8").split("\n");
        lines.forEach((line, i) =>
          assert.ok(!literal.test(line), `${name}:${i + 1}: ${line.trim()}`),
        );
      }
    });
  }
});

// Feature 003 (T341): the data blocks and their validator are gone. A slide
// file passes its words to the components as typed props, so the type check
// holds a missing word or language, a chart's kind or an image's fit; the
// limits the types cannot hold (how many items, one value per category)
// are each component's own, in src/components/deck/limits.ts, reported in
// development.
describe("the components' limits", () => {
  const ok = (name, props) => assert.deepEqual(limits[name](props), []);
  const bad = (name, props, pattern) => {
    const problems = limits[name](props);
    assert.ok(
      problems.length > 0,
      `expected a problem: ${JSON.stringify(props)}`,
    );
    if (pattern)
      assert.ok(
        problems.some((p) => pattern.test(p)),
        `no problem matches ${pattern}: ${problems.join("; ")}`,
      );
  };
  const word = "Placeholder text";
  const entry = { label: "Placeholder title" };
  const words = (n) => items(n, () => word);
  const entries = (n) => items(n, () => entry);

  test("every preset component reports its limits in development", () => {
    const files = {
      Chart: "charts/Chart.tsx",
      Stat: "charts/Stat.tsx",
      Flow: "diagrams/Flow.tsx",
      Timeline: "diagrams/Timeline.tsx",
      Cycle: "diagrams/Cycle.tsx",
      OrgChart: "diagrams/OrgChart.tsx",
      Table: "diagrams/Table.tsx",
      Matrix: "diagrams/Matrix.tsx",
      Agenda: "text/Agenda.tsx",
      Compare: "text/Compare.tsx",
      Image: "images/Image.tsx",
      ImageGrid: "images/ImageGrid.tsx",
    };
    assert.deepEqual(Object.keys(files).sort(), Object.keys(limits).sort());
    for (const [name, file] of Object.entries(files)) {
      const source = readFileSync(
        new URL(`../../src/components/deck/${file}`, import.meta.url),
        "utf8",
      );
      assert.ok(
        source.includes(`reportLimits("${name}", props);`),
        `${file} reports ${name}'s limits`,
      );
    }
  });

  describe("chart", () => {
    const chart = (over) => ({
      kind: "bar",
      categories: [word, word],
      series: [{ name: word, values: [10, 20] }], // placeholder numbers
      ...over,
    });
    test("a bar chart with one value per category passes", () =>
      ok("Chart", chart()));
    test("a series with fewer or more values than categories is reported", () => {
      bad("Chart", chart({ series: [{ name: word, values: [10] }] }), /value/);
      bad(
        "Chart",
        chart({ series: [{ name: word, values: [10, 20, 30] }] }),
        /value/,
      );
    });
    test("a value must be a finite number", () =>
      bad(
        "Chart",
        chart({ series: [{ name: word, values: [10, Number.NaN] }] }),
      ));
    test("a donut has one series", () => {
      ok("Chart", chart({ kind: "donut" }));
      bad(
        "Chart",
        chart({
          kind: "donut",
          series: [
            { name: word, values: [10, 20] },
            { name: word, values: [30, 40] },
          ],
        }),
        /series/,
      );
    });
    test("at most 12 categories", () => {
      const values = items(12, () => 10);
      ok(
        "Chart",
        chart({ categories: words(12), series: [{ name: word, values }] }),
      );
      bad(
        "Chart",
        chart({
          categories: words(13),
          series: [{ name: word, values: [...values, 10] }],
        }),
        /12/,
      );
    });
    test("at least one category and one series", () => {
      bad(
        "Chart",
        chart({ categories: [], series: [{ name: word, values: [] }] }),
      );
      bad("Chart", chart({ series: [] }));
    });
  });

  test("stat: 1 to 4 items, each with its value as written", () => {
    const stat = (n) => ({
      items: items(n, () => ({ value: "10", label: word })),
    });
    for (const n of [1, 4]) ok("Stat", stat(n));
    bad("Stat", stat(0), /1 to 4/);
    bad("Stat", stat(5), /1 to 4/);
    bad("Stat", { items: [{ value: " ", label: word }] }, /value/);
  });

  test("the ordered diagrams: flow 2 to 7, timeline 2 to 8, cycle 3 to 6, agenda 2 to 8", () => {
    for (const [name, key, min, max] of [
      ["Flow", "steps", 2, 7],
      ["Timeline", "events", 2, 8],
      ["Cycle", "stages", 3, 6],
      ["Agenda", "items", 2, 8],
    ]) {
      for (const n of [min, max]) ok(name, { [key]: entries(n) });
      bad(name, { [key]: entries(min - 1) }, new RegExp(`${min} to ${max}`));
      bad(name, { [key]: entries(max + 1) }, new RegExp(`${min} to ${max}`));
    }
  });

  test("org chart: at least one node below the root", () => {
    ok("OrgChart", { root: entry, branches: [{ node: entry }] });
    bad("OrgChart", { root: entry, branches: [] }, /node/);
  });

  test("table: at most 5 columns and 8 rows, one cell per column", () => {
    const table = (columns, rows, cells = columns) => ({
      columns: words(columns),
      rows: items(rows, () => ({ label: word, cells: words(cells) })),
    });
    ok("Table", table(5, 8));
    ok("Table", table(1, 1));
    bad("Table", table(6, 2), /5 columns/);
    bad("Table", table(2, 9), /8 rows/);
    bad("Table", table(0, 1));
    bad("Table", table(2, 0));
    bad("Table", table(3, 2, 2), /cell/);
    bad("Table", table(3, 2, 4), /cell/);
  });

  test("matrix: items from 0 to 1 on both axes", () => {
    ok("Matrix", { items: [{ label: word, x: 0, y: 1 }] });
    ok("Matrix", {});
    bad("Matrix", { items: [{ label: word, x: 1.5, y: 0.5 }] }, /0 to 1/);
    bad("Matrix", { items: [{ label: word, x: 0.5, y: -0.1 }] }, /0 to 1/);
  });

  test("compare: at least one point on each side", () => {
    const side = { title: word, points: [word] };
    ok("Compare", { left: side, right: side });
    bad("Compare", { left: side, right: { title: word, points: [] } }, /right/);
  });

  test("images: a src is a path under public/images/; a grid has 2 to 6", () => {
    ok("Image", { alt: word });
    ok("Image", { alt: word, src: "/images/placeholder.png" });
    bad("Image", { alt: word, src: "https://example.com/a.png" }, /\/images\//);
    const grid = (n) => ({ images: items(n, () => ({ alt: word })) });
    ok("ImageGrid", grid(2));
    ok("ImageGrid", grid(6));
    bad("ImageGrid", grid(1), /2 to 6/);
    bad("ImageGrid", grid(7), /2 to 6/);
    bad(
      "ImageGrid",
      { images: [{ alt: word }, { alt: word, src: "a.png" }] },
      /image 2/,
    );
  });
});
