// Fixture tests for scripts/scan-public.mjs (research R5, FR-017..FR-019).
// Each case builds a fresh temp git repo with invented terms only.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import {
  commitAll,
  dummyTerms,
  git,
  leaksNoTerm,
  licences,
  makeRepo,
  runScript,
  tempDir,
  write,
} from "./fixtures.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function fixture(options) {
  const f = makeRepo(options);
  cleanups.push(f.cleanup);
  return f;
}

function scan(f, args = [], extra = {}) {
  return runScript("scan-public.mjs", args, {
    cwd: f.repo,
    env: { SCAN_TERMS_FILE: f.termsFile, ...extra.env },
    input: extra.input,
  });
}

function assertFails(result, pattern) {
  assert.notEqual(result.code, 0, `expected a failure, got:\n${result.out}`);
  if (pattern) assert.match(result.out, pattern);
  assert.ok(leaksNoTerm(result.out), `output leaks a term:\n${result.out}`);
}

describe("scan-public", () => {
  test("a clean fixture passes", () => {
    const f = fixture();
    const result = scan(f);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /passed/);
  });

  test("fails when the terms list is missing", () => {
    const f = fixture({ terms: null });
    assertFails(scan(f), /terms file .*(missing|not found)/i);
  });

  test("fails when the terms list is empty", () => {
    const f = fixture();
    writeFileSync(f.termsFile, "\n   \n\n");
    assertFails(scan(f), /no terms/i);
  });

  test("fails on a term in a tracked file, naming file, line and term number", () => {
    const f = fixture();
    write(f.repo, "notes/plan.md", "line one\nwe met QUUXCORP today\n");
    commitAll(f.repo, "Add notes");
    assertFails(scan(f), /notes\/plan\.md:2: term 2/);
  });

  test("fails on a term only in history (added, then removed)", () => {
    const f = fixture();
    write(f.repo, "old.txt", "keep\nthe zorblax plan\n");
    commitAll(f.repo, "Add a file");
    const added = git(f.repo, "rev-parse", "--short=7", "HEAD").trim();
    write(f.repo, "old.txt", "keep\n");
    commitAll(f.repo, "Remove a line");
    const result = scan(f);
    assertFails(result, /history/i);
    assert.match(result.out, new RegExp(`${added}.*old\\.txt:2.*term 1`));
    assert.doesNotMatch(result.out, /^old\.txt:/m);
  });

  test("fails on a term in a commit message", () => {
    const f = fixture();
    write(f.repo, "a.txt", "plain\n");
    commitAll(f.repo, "Plain subject\n\nBody naming Zorblax here");
    const sha = git(f.repo, "rev-parse", "--short=7", "HEAD").trim();
    const result = scan(f);
    assertFails(result, /commit message/i);
    assert.match(result.out, new RegExp(`${sha}.*line 3.*term 1`));
  });

  test("fails on a term in a branch name", () => {
    const f = fixture();
    git(f.repo, "branch", "feature/quuxcorp-pitch");
    assertFails(scan(f), /(branch|ref).*term 2/i);
  });

  test("fails on a term in a tracked path without printing the path", () => {
    const f = fixture();
    write(f.repo, "docs/zorblax-notes.txt", "plain\n");
    commitAll(f.repo, "Add a file");
    assertFails(scan(f), /path matches term 1/);
  });

  test("fails on an image missing from the licence list", () => {
    const f = fixture();
    write(
      f.repo,
      "public/brand/pic.png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1]),
    );
    commitAll(f.repo, "Add an image");
    assertFails(scan(f), /public\/brand\/pic\.png.*not (covered|listed)/);
  });

  test("passes when a glob row covers the image", () => {
    const f = fixture();
    write(
      f.repo,
      "public/brand/pic.png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1]),
    );
    write(
      f.repo,
      "docs/licences.md",
      licences(["| `public/brand/**` | own work | MIT | yes |"]),
    );
    commitAll(f.repo, "Add an image");
    const result = scan(f);
    assert.equal(result.code, 0, result.out);
  });

  test("fails when a row marks a present file as not redistributable", () => {
    const f = fixture();
    write(f.repo, "fonts/face.woff2", Buffer.from([0x77, 0x4f, 0x46, 0x32, 0]));
    write(
      f.repo,
      "docs/licences.md",
      licences(["| `fonts/face.woff2` | vendor | proprietary | no |"]),
    );
    commitAll(f.repo, "Add a font");
    assertFails(scan(f), /fonts\/face\.woff2.*not redistributable/);
  });

  test("accepts the brand-asset licence value", () => {
    const f = fixture();
    write(f.repo, "src/brand/mark.svg", "<svg></svg>\n");
    write(
      f.repo,
      "docs/licences.md",
      licences([
        "| `src/brand/mark.svg` | Averlo | brand asset (not under MIT) | yes (placeholder in this repo) |",
      ]),
    );
    commitAll(f.repo, "Add a mark");
    const result = scan(f);
    assert.equal(result.code, 0, result.out);
  });

  test("fails on a dependency missing from the licence list", () => {
    const f = fixture();
    write(
      f.repo,
      "package.json",
      JSON.stringify({
        dependencies: { "fake-dep": "1.0.0", "unlisted-lib": "2.0.0" },
        devDependencies: { "@fake/dev-tool": "1.0.0" },
      }),
    );
    commitAll(f.repo, "Add a dependency");
    assertFails(scan(f), /unlisted-lib.*not (covered|listed)/);
  });

  test("fails on a port target missing from the licence list", () => {
    const f = fixture();
    write(
      f.repo,
      "scripts/ports.manifest.json",
      JSON.stringify({
        ports: [{ source: "x/a.tsx", target: "src/lib/a.tsx" }],
      }),
    );
    commitAll(f.repo, "Add a manifest");
    assertFails(scan(f), /src\/lib\/a\.tsx.*not (covered|listed)/);
  });

  test("--text passes on clean text and fails on a hit with line and term number", () => {
    const f = fixture();
    const { dir, cleanup } = tempDir();
    cleanups.push(cleanup);
    const clean = join(dir, "clean.md");
    const dirty = join(dir, "dirty.md");
    writeFileSync(clean, "# Gate report\n\nAll passed.\n");
    writeFileSync(dirty, "# PR\n\nfirst\nthanks to zOrBlAx\n");
    const ok = scan(f, ["--text", clean]);
    assert.equal(ok.code, 0, ok.out);
    const bad = scan(f, ["--text", dirty]);
    assertFails(bad, /line 4: term 1/);
  });

  test("--text reads stdin", () => {
    const f = fixture();
    const bad = scan(f, ["--text", "-"], { input: "one\ntwo Quuxcorp\n" });
    assertFails(bad, /line 2: term 2/);
    const ok = scan(f, ["--text"], { input: "nothing here\n" });
    assert.equal(ok.code, 0, ok.out);
  });

  test("the output never contains a term, even with many hits", () => {
    const f = fixture();
    write(f.repo, "a.txt", dummyTerms.join(" ") + "\n");
    write(f.repo, "zorblax/b.txt", "quuxcorp\n");
    commitAll(f.repo, "Zorblax and Quuxcorp everywhere");
    git(f.repo, "branch", "zorblax");
    const result = scan(f);
    assertFails(result);
  });
});
