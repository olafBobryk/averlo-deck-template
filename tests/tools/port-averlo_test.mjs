// Fixture tests for scripts/port-averlo.mjs, the closure rule (research
// R3a): it follows TS/JS imports, CSS @import and url(), and asset imports
// from the manifest's entries, resolves aliases with the source's own
// tsconfig, stops at npm packages and records their lockfile versions,
// copies every file unchanged to the same path relative to src/, writes
// the closure to docs/design-source.md and scripts/ports.lock.json, and
// stops on a collision, a blocked term or an asset without a licence.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import { git, leaksNoTerm, runScript, write } from "./fixtures.mjs";
import {
  SOURCE,
  assetRows,
  makePortFixture,
  sourceFiles,
} from "./ports-fixtures.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function fixture(options) {
  const f = makePortFixture(options);
  cleanups.push(f.cleanup);
  return f;
}

const port = (f, env = {}) =>
  runScript("port-averlo.mjs", [], { cwd: f.root, env: { ...f.env, ...env } });

const CLOSURE = [
  "src/components/ui/Card.tsx",
  "src/components/ui/card-base.css",
  "src/components/ui/card.css",
  "src/components/ui/grain.png",
  "src/components/ui/mark.svg",
  "src/lib/base.ts",
  "src/lib/tone.ts",
];

const lockOf = (f) =>
  JSON.parse(readFileSync(join(f.root, "scripts/ports.lock.json"), "utf8"));

function assertStopped(f, result, pattern) {
  assert.notEqual(result.code, 0, `expected a stop, got:\n${result.out}`);
  if (pattern) assert.match(result.out, pattern);
  assert.ok(leaksNoTerm(result.out), `output leaks a term:\n${result.out}`);
  // Nothing is copied or recorded when the script stops.
  assert.equal(existsSync(join(f.root, "src/lib/tone.ts")), false);
  assert.equal(existsSync(join(f.root, "scripts/ports.lock.json")), false);
}

describe("port-averlo", () => {
  test("copies the whole closure unchanged and records it", () => {
    const f = fixture();
    const result = port(f);
    assert.equal(result.code, 0, result.out);
    const repo = join(f.sourcesDir, SOURCE);
    for (const path of CLOSURE) {
      const ported = readFileSync(join(f.root, path));
      const source = Buffer.from(
        git(repo, "show", `${f.commit}:${path}`),
        "utf8",
      );
      assert.ok(ported.equals(source), `${path} is a byte-identical copy`);
    }
    // Not reached from an entry, or only named in a comment.
    assert.equal(existsSync(join(f.root, "src/unrelated.ts")), false);

    const [source] = lockOf(f).sources;
    assert.equal(source.repo, SOURCE);
    assert.equal(source.commit, f.commit.slice(0, 7));
    assert.deepEqual(
      source.files.map((file) => file.target),
      CLOSURE,
    );
    assert.deepEqual(
      source.files.map((file) => file.source),
      CLOSURE,
    );
    // npm packages are not followed, and are recorded with the lockfile's
    // version (a subpath import names its package).
    assert.deepEqual(
      Object.fromEntries(source.packages.map((p) => [p.name, p.version])),
      {
        "@fake/icons": "3.0.0",
        clsx: "2.1.1",
        react: "19.0.0",
        tailwindcss: null,
      },
    );

    const page = readFileSync(join(f.root, "docs/design-source.md"), "utf8");
    assert.ok(
      page.startsWith("# Design source\n\nA hand-written introduction"),
    );
    assert.match(
      page,
      /A hand-written closing section that the port script keeps\./,
    );
    for (const path of CLOSURE) assert.ok(page.includes(path), path);
    assert.match(page, new RegExp(`${SOURCE}.*${f.commit.slice(0, 7)}`));
    assert.match(page, /clsx/);
    // The template's pin wins for react (research R2), and is recorded.
    assert.match(page, /react.*19\.0\.0.*19\.3\.1/);

    // The drift test passes on what the port script wrote.
    const drift = runScript("check-ports.mjs", [], { cwd: f.root, env: f.env });
    assert.equal(drift.code, 0, drift.out);
    assert.match(drift.out, /7 of 7 ports match their source \(100%\)/);
  });

  test("running it again changes nothing", () => {
    const f = fixture();
    assert.equal(port(f).code, 0);
    const before = readFileSync(join(f.root, "docs/design-source.md"), "utf8");
    const again = port(f);
    assert.equal(again.code, 0, again.out);
    assert.equal(
      readFileSync(join(f.root, "docs/design-source.md"), "utf8"),
      before,
    );
  });

  test("stops on a blocked term in a pulled file, without naming it", () => {
    const f = fixture({
      files: sourceFiles({
        "src/lib/base.ts": "export const base = 'Quuxcorp';\n",
      }),
    });
    const result = port(f);
    assertStopped(f, result, /src\/lib\/base\.ts.*term 2/);
  });

  test("stops on a pulled file under a template-owned path", () => {
    const f = fixture({
      files: sourceFiles({
        "src/lib/tone.ts":
          'import { slide } from "@/deck/slide";\nexport const tone = slide;\n',
        "src/deck/slide.ts": "export const slide = 1;\n",
      }),
    });
    const result = port(f);
    assertStopped(f, result, /src\/deck\/slide\.ts.*template-owned/);
  });

  test("stops on a pulled file that would overwrite a template file", () => {
    const f = fixture();
    write(f.root, "src/lib/base.ts", "export const base = 'template';\n");
    const result = port(f);
    assert.notEqual(result.code, 0, result.out);
    assert.match(result.out, /src\/lib\/base\.ts.*template file/);
    assert.equal(
      readFileSync(join(f.root, "src/lib/base.ts"), "utf8"),
      "export const base = 'template';\n",
    );
  });

  test("stops on an asset with no licence row", () => {
    const f = fixture({ rows: [] });
    const result = port(f);
    assertStopped(f, result, /src\/components\/ui\/mark\.svg.*licence/);
  });

  test("stops on an asset whose row forbids redistribution", () => {
    const f = fixture({
      rows: [
        "| `src/components/ui/mark.svg` | fixture | proprietary | no |",
        "| `src/components/ui/grain.png` | fixture | MIT | yes |",
      ],
    });
    const result = port(f);
    assertStopped(f, result, /src\/components\/ui\/mark\.svg.*redistribut/);
  });

  test("skips an excluded asset, keeps its reference, and records it", () => {
    const f = fixture({
      rows: ["| `src/components/ui/grain.png` | fixture | MIT | yes |"],
      manifestOverrides: {
        exclude: [
          { path: "src/components/ui/*.svg", reason: "may not be shared" },
        ],
      },
    });
    const result = port(f);
    assert.equal(result.code, 0, result.out);
    assert.equal(existsSync(join(f.root, "src/components/ui/mark.svg")), false);
    // The importer is copied unchanged, the reference left in place.
    assert.match(
      readFileSync(join(f.root, "src/components/ui/Card.tsx"), "utf8"),
      /import mark from "\.\/mark\.svg";/,
    );
    const [source] = lockOf(f).sources;
    assert.deepEqual(source.excluded, [
      { source: "src/components/ui/mark.svg", reason: "may not be shared" },
    ]);
    assert.match(
      readFileSync(join(f.root, "docs/design-source.md"), "utf8"),
      /\*\.svg.*may not be shared.*mark\.svg/,
    );
  });

  // T051: Averlo's favicon files live in the source's public/ folder, not
  // under src/. A public entry is ported unchanged to the same path, needs
  // its licence row like any asset, and is recorded for the drift test.
  test("ports a public file entry to the same path, unchanged", () => {
    const favicon =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="20"/></svg>';
    const f = fixture({
      files: sourceFiles({ "public/favicon.svg": favicon }),
      rows: [
        ...assetRows,
        "| `public/favicon.svg` | fixture | brand asset | yes (placeholder in this repo) |",
      ],
      manifestOverrides: {
        entries: [
          {
            source: "src/components/ui/Card.tsx",
            target: "src/components/ui/Card.tsx",
          },
          { source: "public/favicon.svg", target: "public/favicon.svg" },
        ],
      },
    });
    const result = port(f);
    assert.equal(result.code, 0, result.out);
    assert.equal(
      readFileSync(join(f.root, "public/favicon.svg"), "utf8"),
      favicon,
    );
    const [source] = lockOf(f).sources;
    assert.ok(
      source.files.some(
        (file) =>
          file.source === "public/favicon.svg" &&
          file.target === "public/favicon.svg",
      ),
      "the lock records the public file",
    );
    assert.match(
      readFileSync(join(f.root, "docs/design-source.md"), "utf8"),
      /`public\/favicon\.svg`/,
    );
    // Without its licence row, the port stops, as for any asset.
    const g = fixture({
      files: sourceFiles({ "public/favicon.svg": favicon }),
      manifestOverrides: {
        entries: [
          {
            source: "src/components/ui/Card.tsx",
            target: "src/components/ui/Card.tsx",
          },
          { source: "public/favicon.svg", target: "public/favicon.svg" },
        ],
      },
    });
    assertStopped(g, port(g), /public\/favicon\.svg.*licence/);
  });

  test("stops on an import it cannot resolve", () => {
    const f = fixture({
      files: sourceFiles({
        "src/lib/base.ts": 'export { gone } from "./gone";\n',
      }),
    });
    const result = port(f);
    assertStopped(f, result, /\.\/gone.*src\/lib\/base\.ts/);
  });

  test("stops when the source clone is missing", () => {
    const f = fixture();
    const result = port(f, { PORT_SOURCES_DIR: join(f.dir, "nowhere") });
    assertStopped(f, result, /PORT_SOURCES_DIR|fixture-source/);
  });

  test("the hand-written header is required", () => {
    const f = fixture();
    write(f.root, "docs/design-source.md", "# Design source\n");
    const result = port(f);
    assertStopped(f, result, /ports:begin/);
    assert.equal(
      readFileSync(join(f.root, "docs/design-source.md"), "utf8"),
      "# Design source\n",
    );
  });
});
