#!/usr/bin/env node
// The deck's checks (`npm run check:deck`, feature 004, FR-003, FR-004;
// research R1). A deck made from the template runs these before it shows a
// slide; the template itself keeps `npm run gate`. In order:
//
//   check        lint, format and types (`npm run check`)
//   build        the production build and its PDFs (`npm run build`)
//   fit          the specs tagged @deck, at 390 and 1440 (the two projects),
//                against that build: every slide of the deck and of the
//                preset gallery fits its stage, and every preset file
//                copied into a deck renders and fits
//   inline-text  every word and figure sits in a slide's `copy`
//   trace        the trace check reads every slide's `copy`
//                (tests/docs/workflow-trace.spec.ts; no browser, no server)
//
// It never runs the motion strips, the ports drift test or the public scan:
// those are the template's (constitution, Principles II, VIII and IX). A
// deck that is public can turn the scan on by its own list.
//
// It uses the gate's runner (scripts/gate.mjs), so each check is reported as
// passed, failed or not run; fit is not run when the build did not pass.
// The report is printed and written to gate-results/deck-report.md. It
// needs no .local/ file; .local/env is read only when it is there (a
// machine whose browser needs LD_LIBRARY_PATH, say).
//
// The module exports its pieces for tests/tools/check-deck_test.mjs; main()
// runs only when the file is invoked directly.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  exitCode,
  formatReport,
  loadEnv,
  runGate,
  stopGroupsOnExit,
} from "./gate.mjs";

export const DECK_CHECKS = ["check", "build", "fit", "inline-text", "trace"];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Loads .local/env into `env` when the file is there; true if it was. */
export function loadDeckEnv(root, env = process.env) {
  const file = join(root, ".local", "env");
  if (!existsSync(file)) return false;
  loadEnv(file, env);
  return true;
}

export function deckChecks(root, env) {
  const port = env.SMOKE_PORT || "3198";
  // The specs run against a server this script starts and stops
  // (playwright.config.ts: SMOKE_SERVER=external), not one Playwright builds.
  const playwright = { SMOKE_PORT: port, SMOKE_SERVER: "external" };
  return [
    { name: "check", cmd: ["npm", "run", "check"] },
    { name: "build", cmd: ["npm", "run", "build"] },
    {
      name: "fit",
      cmd: ["npx", "playwright", "test", "--grep", "@deck"],
      env: playwright,
      needsBuild: true,
      servers: () => [
        {
          name: "deck",
          cmd: [
            "npx",
            "next",
            "start",
            "--hostname",
            "127.0.0.1",
            "--port",
            port,
          ],
          cwd: root,
          url: `http://127.0.0.1:${port}/print`,
        },
      ],
    },
    {
      name: "inline-text",
      cmd: [process.execPath, join(root, "scripts", "check-inline-text.mjs")],
    },
    {
      name: "trace",
      cmd: ["npx", "playwright", "test", "tests/docs/workflow-trace.spec.ts"],
      env: playwright,
    },
  ];
}

/**
 * Runs the checks in order with the gate's runner. A check marked
 * `needsBuild` is not run when the build did not pass.
 */
export async function runDeckChecks(checks, options = {}) {
  const results = [];
  for (const check of checks) {
    const build = results.find((r) => r.name === "build");
    const blocked =
      check.needsBuild && build && build.status !== "passed"
        ? `the build ${build.status === "failed" ? "failed" : "was not run"}`
        : null;
    const run = blocked ? { ...check, notRun: () => blocked } : check;
    results.push(...(await runGate([run], options)));
  }
  return results;
}

/** The gate's report, titled for the deck, with no .local/env line. */
export function formatDeckReport(results, meta) {
  return formatReport(results, { ...meta, missingEnv: [] }).replace(
    /^# Gate report/,
    "# Deck check report",
  );
}

// ----------------------------------------------------------------- main ----

function gitValue(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

async function main() {
  stopGroupsOnExit();
  loadDeckEnv(repoRoot);
  const results = await runDeckChecks(deckChecks(repoRoot, process.env), {
    cwd: repoRoot,
    env: process.env,
    output: process.stdout,
    logDir: join(repoRoot, "gate-results", "deck-logs"),
  });

  const dirty = gitValue(["status", "--porcelain"]);
  const report = formatDeckReport(results, {
    date: new Date().toISOString(),
    branch: gitValue(["rev-parse", "--abbrev-ref", "HEAD"]),
    commit:
      gitValue(["rev-parse", "--short", "HEAD"]) +
      (dirty && dirty !== "unknown" ? " (with uncommitted changes)" : ""),
  });
  const reportFile = join(repoRoot, "gate-results", "deck-report.md");
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, report);
  console.log(`\n${report}`);
  console.log("Written to gate-results/deck-report.md");
  process.exitCode = exitCode(results);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
