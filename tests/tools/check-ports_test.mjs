// Fixture tests for scripts/check-ports.mjs, the drift test (FR-009,
// research R3a step 9): every port listed in scripts/ports.lock.json is
// compared byte for byte with its source at the pinned commit. Each case
// builds a temp source repository and a temp template root.
import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import { commitAll, git, leaksNoTerm, runScript, write } from "./fixtures.mjs";
import { SOURCE, makePortFixture, manifest } from "./ports-fixtures.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

const PORTED = {
  "src/components/ui/Card.tsx": null, // filled from the source
  "src/lib/tone.ts": null,
};

/** A template root whose ports were copied from the source by hand, with a
 *  lock naming them: what the port script leaves behind. */
function fixture({ lock: lockOverrides = {}, files = PORTED } = {}) {
  const f = makePortFixture();
  cleanups.push(f.cleanup);
  const sourceRepo = join(f.sourcesDir, SOURCE);
  const entries = Object.keys(files);
  for (const path of entries) {
    const content = git(sourceRepo, "show", `${f.commit}:${path}`);
    write(f.root, path, content);
  }
  const lock = {
    sources: [
      {
        repo: SOURCE,
        commit: f.commit.slice(0, 7),
        entries: ["src/components/ui/Card.tsx"],
        files: entries.map((path) => ({ source: path, target: path })),
        excluded: [],
        packages: [],
        ...lockOverrides,
      },
    ],
  };
  write(f.root, "scripts/ports.lock.json", JSON.stringify(lock, null, 2));
  return f;
}

function check(f, env = {}) {
  return runScript("check-ports.mjs", [], {
    cwd: f.root,
    env: { ...f.env, ...env },
  });
}

const lastLine = (out) => out.trim().split("\n").at(-1).trim();

describe("check-ports", () => {
  test("ports equal to their source pass, at 100%", () => {
    const f = fixture();
    const result = check(f);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /2 of 2 ports match their source \(100%\)/);
  });

  test("an edited port fails and is named", () => {
    const f = fixture();
    write(f.root, "src/lib/tone.ts", "export const tone = 2; // edited\n");
    const result = check(f);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /src\/lib\/tone\.ts/);
    assert.match(result.out, /differs/);
    assert.doesNotMatch(result.out, /Card\.tsx.*differs/);
    assert.match(result.out, /1 of 2 ports match/);
  });

  test("a port whose line endings or trailing newline changed fails", () => {
    const f = fixture();
    const path = join(f.root, "src/lib/tone.ts");
    const original = git(
      join(f.sourcesDir, SOURCE),
      "show",
      `${f.commit}:src/lib/tone.ts`,
    );
    writeFileSync(path, original.replace(/\n$/, ""));
    const result = check(f);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /src\/lib\/tone\.ts/);
  });

  test("a missing port fails and is named", () => {
    const f = fixture();
    rmSync(join(f.root, "src/components/ui/Card.tsx"));
    const result = check(f);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /src\/components\/ui\/Card\.tsx/);
    assert.match(result.out, /missing/);
  });

  test("a lock that no longer matches the manifest's pin fails", () => {
    const f = fixture();
    // A re-pin to a newer commit, without re-running the port script.
    const repo = join(f.sourcesDir, SOURCE);
    write(repo, "src/lib/tone.ts", "export const tone = 3;\n");
    commitAll(repo, "A newer source");
    const newer = git(repo, "rev-parse", "--short=7", "HEAD").trim();
    write(
      f.root,
      "scripts/ports.manifest.json",
      JSON.stringify(manifest(newer), null, 2),
    );
    const result = check(f);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /does not match.*port-averlo/);
  });

  test("a pin the clone does not have reports not run", () => {
    const f = fixture();
    write(
      f.root,
      "scripts/ports.manifest.json",
      JSON.stringify(manifest("abcdef0"), null, 2),
    );
    const result = check(f);
    assert.equal(result.code, 3, result.out);
    assert.match(lastLine(result.out), /^not run — .*abcdef0/);
  });

  test("a missing lock fails", () => {
    const f = fixture();
    rmSync(join(f.root, "scripts/ports.lock.json"));
    const result = check(f);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /ports\.lock\.json/);
  });

  test("without PORT_SOURCES_DIR it reports not run with the reason", () => {
    const f = fixture();
    const result = check(f, { PORT_SOURCES_DIR: "" });
    assert.equal(result.code, 3, result.out);
    assert.match(lastLine(result.out), /^not run — .*PORT_SOURCES_DIR/);
  });

  test("with a missing source clone it reports not run with the reason", () => {
    const f = fixture();
    rmSync(join(f.sourcesDir, SOURCE), { recursive: true, force: true });
    const result = check(f);
    assert.equal(result.code, 3, result.out);
    assert.match(lastLine(result.out), /^not run — .*fixture-source/);
  });

  test("with a folder that does not exist it reports not run", () => {
    const f = fixture();
    const result = check(f, { PORT_SOURCES_DIR: join(f.dir, "nowhere") });
    assert.equal(result.code, 3, result.out);
    assert.match(lastLine(result.out), /^not run — /);
  });

  test("PORT_SOURCES_DIR defaults to the line in .local/origin.md", () => {
    const f = fixture();
    write(
      f.root,
      ".local/origin.md",
      `# Origin\n\n- Port sources folder (PORT_SOURCES_DIR): \`${f.sourcesDir}\`.\n`,
    );
    const result = check(f, { PORT_SOURCES_DIR: "" });
    assert.equal(result.code, 0, result.out);
  });

  test("a deck can turn the drift test off in its manifest", () => {
    const f = fixture();
    const data = manifest(f.commit.slice(0, 7));
    data.driftTest = false;
    write(f.root, "scripts/ports.manifest.json", JSON.stringify(data));
    write(f.root, "src/lib/tone.ts", "export const tone = 'changed';\n");
    const result = check(f);
    assert.equal(result.code, 3, result.out);
    assert.match(lastLine(result.out), /^not run — .*turned off/);
  });

  test("its output names no blocked term", () => {
    const f = fixture();
    write(f.root, "src/lib/tone.ts", "export const tone = 'Zorblax';\n");
    const result = check(f);
    assert.equal(result.code, 1, result.out);
    assert.ok(leaksNoTerm(result.out), result.out);
  });
});
