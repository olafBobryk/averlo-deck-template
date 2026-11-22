// Fixture tests for scripts/check-deck.mjs (feature 004, T400; FR-003,
// FR-004; research R1): the deck's check command runs check, the build, the
// fit and slide specs at 390 and 1440, the inline-text check and the trace
// check, never the strips, the ports drift test or the public scan, and
// reports each check as passed, failed or not run. It needs no .local/
// files. The fresh-copy script runs it in a clone without .local/.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import {
  DECK_CHECKS,
  deckChecks,
  formatDeckReport,
  loadDeckEnv,
  runDeckChecks,
} from "../../scripts/check-deck.mjs";
import { freshCopySteps } from "../../scripts/fresh-copy.mjs";
import { repoRoot, tempDir, write } from "./fixtures.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

const node = process.execPath;
const quiet = { write() {} };
const read = (path) => readFileSync(join(repoRoot, path), "utf8");

/** Every command a check would run: its own, its setup and its servers'. */
function commands(check) {
  const value = (v) => (typeof v === "function" ? v() : v);
  return [
    check.cmd,
    ...(value(check.before) ?? []),
    ...(value(check.servers) ?? []).map((server) => server.cmd),
  ].map((cmd) => cmd.join(" "));
}

describe("check:deck", () => {
  test("package.json runs it as npm run check:deck", () => {
    const { scripts } = JSON.parse(read("package.json"));
    assert.equal(scripts["check:deck"], "node scripts/check-deck.mjs");
  });

  test("runs check, the build, fit, inline-text and trace, in that order", () => {
    assert.deepEqual(DECK_CHECKS, [
      "check",
      "build",
      "fit",
      "inline-text",
      "trace",
    ]);
    const checks = deckChecks(repoRoot, {});
    assert.deepEqual(
      checks.map((check) => check.name),
      DECK_CHECKS,
    );
    const by = Object.fromEntries(checks.map((c) => [c.name, commands(c)]));
    assert.equal(by.check[0], "npm run check");
    assert.equal(by.build[0], "npm run build");
    assert.match(by["inline-text"][0], /scripts\/check-inline-text\.mjs$/);
    assert.match(
      by.trace[0],
      /playwright test tests\/docs\/workflow-trace\.spec\.ts/,
    );
  });

  test("fit runs the @deck specs in both projects, at 390 and 1440", () => {
    const fit = deckChecks(repoRoot, {}).find((c) => c.name === "fit");
    const [cmd] = commands(fit);
    assert.match(cmd, /playwright test --grep @deck/);
    assert.doesNotMatch(cmd, /--project/, "both projects run");
    const config = read("playwright.config.ts");
    assert.match(config, /width: 390/);
    assert.match(config, /width: 1440/);
    // Against the build it just made: a server it starts on the smoke port.
    const servers = fit.servers();
    assert.equal(servers.length, 1);
    assert.match(servers[0].cmd.join(" "), /next start/);
  });

  test("the deck's fit and slide specs carry the @deck tag", () => {
    const tagged = (path, title) =>
      new RegExp(
        `(test|test\\.describe)\\(\\s*${JSON.stringify(title).replace(/[()]/g, "\\$&")},\\s*\\{\\s*tag: "@deck"`,
      ).test(read(path));
    assert.ok(
      tagged(
        "tests/deck.spec.ts",
        "every placeholder slide fits its stage (SC-005)",
      ),
      "the deck's own slides fit",
    );
    assert.ok(
      tagged(
        "tests/presets/gallery.spec.ts",
        "every gallery slide fits its stage (SC-002)",
      ),
      "the preset gallery fits",
    );
    assert.ok(
      tagged(
        "tests/presets/gallery.spec.ts",
        "each preset renders its example and its alternate, and both fit (SC-005)",
      ),
      "each preset fits",
    );
    assert.ok(
      tagged(
        "tests/slides/presets.spec.ts",
        "every preset file, copied into a deck",
      ),
      "a preset file copied into a deck renders and fits",
    );
  });

  test("never runs the strips, the ports drift test or the public scan", () => {
    for (const check of deckChecks(repoRoot, {})) {
      for (const cmd of commands(check)) {
        assert.doesNotMatch(
          cmd,
          /strips|check:ports|check-ports|scan:public|scan-public|\bgate\b|test:smoke/,
          `${check.name}: ${cmd}`,
        );
      }
    }
  });

  test("needs no .local/ file: nothing fails or is skipped for a missing one", () => {
    const { dir, cleanup } = tempDir("check-deck-root-");
    cleanups.push(cleanup);
    for (const check of deckChecks(dir, {})) {
      assert.equal(check.requires, undefined, check.name);
      assert.equal(check.failIf?.() ?? null, null, check.name);
      assert.equal(check.notRun?.() ?? null, null, check.name);
    }
  });

  test("reads .local/env only when it is there", () => {
    const { dir, cleanup } = tempDir("check-deck-env-");
    cleanups.push(cleanup);
    const env = {};
    assert.equal(loadDeckEnv(dir, env), false);
    assert.deepEqual(env, {});
    write(dir, ".local/env", "LD_LIBRARY_PATH=/opt/libs\n");
    assert.equal(loadDeckEnv(dir, env), true);
    assert.equal(env.LD_LIBRARY_PATH, "/opt/libs");
  });

  test("reports each check as passed, failed or not run; fit is not run when the build fails", async () => {
    const checks = [
      { name: "check", cmd: [node, "-e", ""] },
      { name: "build", cmd: [node, "-e", "process.exit(1)"] },
      { name: "fit", cmd: [node, "-e", ""], needsBuild: true },
      { name: "inline-text", cmd: [node, "-e", "process.exit(1)"] },
      { name: "trace", cmd: [node, "-e", ""] },
    ];
    const results = await runDeckChecks(checks, {
      cwd: repoRoot,
      output: quiet,
    });
    assert.deepEqual(
      results.map((r) => [r.name, r.status]),
      [
        ["check", "passed"],
        ["build", "failed"],
        ["fit", "not run"],
        ["inline-text", "failed"],
        ["trace", "passed"],
      ],
    );
    assert.equal(results[2].reason, "the build failed");
    const report = formatDeckReport(results, {
      date: "d",
      branch: "b",
      commit: "c",
    });
    assert.match(report, /^# Deck check report/);
    for (const name of DECK_CHECKS) {
      assert.match(report, new RegExp(`\\| ${name} \\| `), name);
    }
    assert.match(report, /\| fit \| not run \| not run — the build failed \|/);
    assert.match(report, /Overall: failed \(2 failed, 1 not run\)/);
    assert.doesNotMatch(report, /\.local\/env/);
  });

  test("fit runs once the build passed", async () => {
    const results = await runDeckChecks(
      [
        { name: "build", cmd: [node, "-e", ""] },
        { name: "fit", cmd: [node, "-e", ""], needsBuild: true },
      ],
      { cwd: repoRoot, output: quiet },
    );
    assert.deepEqual(
      results.map((r) => r.status),
      ["passed", "passed"],
    );
  });
});

describe("fresh-copy --deck", () => {
  test("clones without .local/, installs and runs check:deck", () => {
    assert.deepEqual(freshCopySteps({ deck: true }), [
      "clone",
      "npm ci",
      "npm run check:deck",
    ]);
  });

  test("the template's own run still copies .local/ and steps through the deck", () => {
    assert.deepEqual(freshCopySteps({ deck: false }), [
      "clone",
      "copy .local/",
      "npm ci",
      "npm run build",
      "start",
      "step through the deck",
    ]);
  });
});
