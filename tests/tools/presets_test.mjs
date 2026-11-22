// Unit tests for the preset registry and its validator (feature 002, T100).
// The registry (src/presets/registry.ts) lists every preset: its name, its
// family, the block it draws, the source structure it fits and its example
// file in src/presets/slides/, with a second, different example in
// alternates/ (SC-005; feature 003, T331). The template-owned validator
// (src/presets/validate.ts) enforces data-model.md's limits on a block.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { scanPresets } from "../../scripts/slides-index.mjs";
import { langs } from "../../src/deck/langs.ts";
import { families, registry } from "../../src/presets/registry.ts";
import { presetTypes, validateBlock } from "../../src/presets/validate.ts";

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

/** A text in every configured language. */
const t = (words) => Object.fromEntries(langs.map((lang) => [lang, words]));
const text = t("Placeholder text");
const point = { label: t("Placeholder title") };
const items = (n, make) => Array.from({ length: n }, (_, i) => make(i));
const ok = (block) => assert.deepEqual(validateBlock(block, langs), []);
const bad = (block, pattern) => {
  const problems = validateBlock(block, langs);
  assert.ok(
    problems.length > 0,
    `expected a problem: ${JSON.stringify(block)}`,
  );
  if (pattern)
    assert.ok(
      problems.some((p) => pattern.test(p)),
      `no problem matches ${pattern}: ${problems.join("; ")}`,
    );
};

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

describe("the validator", () => {
  test("knows the fourteen preset block types", () => {
    assert.deepEqual([...presetTypes].sort(), [
      "agenda",
      "chart",
      "compare",
      "custom",
      "cycle",
      "flow",
      "image",
      "imageGrid",
      "matrix",
      "orgchart",
      "quote",
      "stat",
      "table",
      "timeline",
    ]);
  });

  test("a text needs every configured language", () => {
    bad({ type: "quote", text: {} }, /text/);
    bad({ type: "quote", text: "Placeholder text" }, /text/);
    ok({ type: "quote", text, by: text, role: text });
  });

  describe("chart", () => {
    const chart = (over) => ({
      type: "chart",
      kind: "bar",
      categories: [text, text],
      series: [{ name: text, values: [10, 20] }], // placeholder numbers
      ...over,
    });
    test("a bar chart with one value per category validates", () =>
      ok(chart({ unit: text, source: text })));
    test("a series with fewer values than categories is rejected", () =>
      bad(chart({ series: [{ name: text, values: [10] }] }), /value/));
    test("a series with more values than categories is rejected", () =>
      bad(chart({ series: [{ name: text, values: [10, 20, 30] }] }), /value/));
    test("a value must be a finite number", () =>
      bad(chart({ series: [{ name: text, values: [10, Number.NaN] }] })));
    test("an unknown kind is rejected", () => bad(chart({ kind: "pie" })));
    test("a donut has one series", () => {
      ok(chart({ kind: "donut" }));
      bad(
        chart({
          kind: "donut",
          series: [
            { name: text, values: [10, 20] },
            { name: text, values: [30, 40] },
          ],
        }),
        /series/,
      );
    });
    test("at most 12 categories", () => {
      const values = items(12, () => 10);
      ok(
        chart({
          categories: items(12, () => text),
          series: [{ name: text, values }],
        }),
      );
      bad(
        chart({
          categories: items(13, () => text),
          series: [{ name: text, values: [...values, 10] }],
        }),
        /12/,
      );
    });
    test("at least one category and one series", () => {
      bad(chart({ categories: [], series: [{ name: text, values: [] }] }));
      bad(chart({ series: [] }));
    });
  });

  describe("stat", () => {
    const stat = (n) => ({
      type: "stat",
      items: items(n, () => ({
        value: "10",
        label: text,
        unit: text,
        note: text,
      })),
    });
    test("1 to 4 items", () => {
      for (const n of [1, 4]) ok(stat(n));
      bad(stat(0), /1 to 4/);
      bad(stat(5), /1 to 4/);
    });
    test("a value is a string, kept as written", () => {
      bad({ type: "stat", items: [{ value: 10, label: text }] }, /value/);
      bad({ type: "stat", items: [{ value: "", label: text }] }, /value/);
    });
  });

  describe("the ordered diagrams", () => {
    const run = (type, key, make, min, max) => {
      const block = (n) => ({ type, [key]: items(n, make) });
      for (const n of [min, max]) ok(block(n));
      bad(block(min - 1), new RegExp(`${min} to ${max}`));
      bad(block(max + 1), new RegExp(`${min} to ${max}`));
    };
    test("flow: 2 to 7 steps", () =>
      run("flow", "steps", () => ({ label: text, text }), 2, 7));
    test("timeline: 2 to 8 events", () =>
      run(
        "timeline",
        "events",
        () => ({ when: text, label: text, text }),
        2,
        8,
      ));
    test("cycle: 3 to 6 stages", () =>
      run("cycle", "stages", () => ({ label: text }), 3, 6));
    test("agenda: 2 to 8 items", () =>
      run("agenda", "items", () => ({ label: text, text }), 2, 8));
    test("every step, event and stage needs its label", () => {
      bad({ type: "flow", steps: [{ label: text }, { text }] }, /label/);
      bad(
        {
          type: "timeline",
          events: [{ when: text, label: text }, { when: text }],
        },
        /label/,
      );
      bad(
        { type: "cycle", stages: [{ label: text }, { label: text }, {}] },
        /label/,
      );
    });
    test("a timeline event needs its date", () =>
      bad(
        { type: "timeline", events: items(2, () => ({ label: text })) },
        /when/,
      ));
  });

  describe("orgchart", () => {
    test("two levels below the root validates", () =>
      ok({
        type: "orgchart",
        root: point,
        children: [{ node: point, children: [point, point] }, { node: point }],
      }));
    test("a third level below the root is rejected", () =>
      bad(
        {
          type: "orgchart",
          root: point,
          children: [
            { node: point, children: [{ ...point, children: [point] }] },
          ],
        },
        /two levels/,
      ));
    test("a root or a node that carries its own children is rejected", () => {
      // Below the root, levels are only `children` and their `children`:
      // a Point holding children would be a hidden or a third level.
      bad(
        {
          type: "orgchart",
          root: { ...point, children: [point] },
          children: [{ node: point }],
        },
        /two levels/,
      );
      bad(
        {
          type: "orgchart",
          root: point,
          children: [{ node: { ...point, children: [point] } }],
        },
        /two levels/,
      );
    });
    test("at least one node below the root", () =>
      bad({ type: "orgchart", root: point, children: [] }));
    test("the root and every node need a label", () => {
      bad({ type: "orgchart", root: {}, children: [{ node: point }] }, /label/);
      bad({ type: "orgchart", root: point, children: [{ node: {} }] }, /label/);
    });
  });

  describe("table", () => {
    const table = (columns, rows, cells = columns) => ({
      type: "table",
      columns: items(columns, () => text),
      rows: items(rows, () => ({
        label: text,
        cells: items(cells, () => text),
      })),
    });
    test("at most 5 columns and 8 rows", () => {
      ok(table(5, 8));
      ok(table(1, 1));
      bad(table(6, 2), /5 columns/);
      bad(table(2, 9), /8 rows/);
      bad(table(0, 1));
      bad(table(2, 0));
    });
    test("each row has one cell per column", () => {
      bad(table(3, 2, 2), /cell/);
      bad(table(3, 2, 4), /cell/);
    });
    test("each row needs its label", () =>
      bad(
        { type: "table", columns: [text], rows: [{ cells: [text] }] },
        /label/,
      ));
  });

  describe("matrix", () => {
    const matrix = (over) => ({
      type: "matrix",
      x: text,
      y: text,
      quadrants: [point, point, point, point],
      items: [
        { label: text, x: 0, y: 1 },
        { label: text, x: 0.5, y: 0.5 },
      ],
      ...over,
    });
    test("four quadrants and items from 0 to 1 validate", () => ok(matrix()));
    test("exactly four quadrants", () =>
      bad(matrix({ quadrants: [point, point, point] }), /four quadrants/));
    test("items are optional; each needs a label", () => {
      ok(matrix({ items: undefined }));
      bad(matrix({ items: [{ x: 0.5, y: 0.5 }] }), /label/);
    });
    test("x and y are numbers, not strings", () =>
      bad(matrix({ items: [{ label: text, x: "0.5", y: 0.5 }] }), /0 to 1/));
    test("the axes need their labels", () => {
      bad(matrix({ x: undefined }), /^x:/);
      bad(matrix({ y: undefined }), /^y:/);
    });
    test("x and y run from 0 to 1", () => {
      bad(matrix({ items: [{ label: text, x: 1.5, y: 0.5 }] }), /0 to 1/);
      bad(matrix({ items: [{ label: text, x: 0.5, y: -0.1 }] }), /0 to 1/);
    });
  });

  describe("compare", () => {
    const side = { title: text, points: [text, text] };
    test("two sides with a title and points validate", () =>
      ok({ type: "compare", left: side, right: side }));
    test("each side needs a title and at least one point", () => {
      bad({ type: "compare", left: side, right: { title: text, points: [] } });
      bad({ type: "compare", left: { points: [text] }, right: side }, /title/);
    });
  });

  describe("images", () => {
    test("an image needs alt text; src, fit and bleed are optional", () => {
      ok({ type: "image", alt: text });
      ok({
        type: "image",
        src: "/images/placeholder.jpg",
        alt: text,
        caption: text,
        fit: "contain",
        bleed: true,
      });
      bad({ type: "image" }, /alt/);
    });
    test("src is a path under public/images/", () =>
      bad(
        { type: "image", src: "https://example.com/a.jpg", alt: text },
        /images/,
      ));
    test("fit is cover or contain", () =>
      bad({ type: "image", alt: text, fit: "fill" }, /fit/));
    test("an image grid has 2 to 6 images, each with alt text", () => {
      const grid = (n) => ({
        type: "imageGrid",
        images: items(n, () => ({ alt: text })),
      });
      ok(grid(2));
      ok(grid(6));
      bad(grid(1), /2 to 6/);
      bad(grid(7), /2 to 6/);
      bad({ type: "imageGrid", images: [{ alt: text }, {}] }, /alt/);
    });
  });

  describe("custom", () => {
    // The deck's own visuals are the names src/deck/visuals/index.ts
    // exports (T140, research D3); the caller passes them.
    const visuals = ["Example"];
    const check = (block) => validateBlock(block, langs, visuals);
    test("names a visual of the deck and passes its props", () =>
      assert.deepEqual(
        check({ type: "custom", visual: "Example", props: {} }),
        [],
      ));
    test("needs a visual name and a props object", () => {
      assert.ok(
        check({ type: "custom", visual: "", props: {} }).some((p) =>
          /visual/.test(p),
        ),
      );
      assert.ok(
        check({ type: "custom", visual: "Example" }).some((p) =>
          /props/.test(p),
        ),
      );
    });
    test("a visual missing from src/deck/visuals/index.ts is rejected", () => {
      const problems = check({ type: "custom", visual: "Missing", props: {} });
      assert.ok(
        problems.some((p) => /Missing/.test(p) && /src\/deck\/visuals/.test(p)),
        problems.join("; ") || "no problem reported",
      );
    });
    test("without the deck's visuals, no custom block validates: the template's map is empty", () =>
      bad({ type: "custom", visual: "Example", props: {} }, /visual/));
  });

  test("feature 001's blocks pass as they are; an unknown type is rejected", () => {
    // The statement preset is the carried `lead` block (data-model.md).
    ok({ type: "lead", item: { text }, size: "statement" });
    bad({ type: "unknown" }, /block type/);
  });
});
