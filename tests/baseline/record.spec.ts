import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { test, type BrowserContextOptions } from "@playwright/test";
import { evidence } from "../evidence";
import {
  aggregate,
  compactRun,
  deviceOptions,
  expandRun,
  formatBaseline,
  runStrip,
  type Run,
} from "../motion/sampler";
import { strips } from "../motion/strips";

// Records the motion baseline (research R8, task T008) from the unchanged
// origin build at ORIGIN_URL: every strip, 3 runs each, in a fresh browser
// context per run. Opt-in: RECORD=1 writes the baselines,
// references/strips/<strip>-<width>.json; EVIDENCE=1 also writes each run
// through the evidence writer, as references/strips/runs/<strip>.run<n>-<project>.json.
// RECORD=runs aggregates those written runs again, without recording.
// Only under playwright.strips.config.ts, never in smoke.

const dir = fileURLToPath(
  new URL("../../specs/001-deck-template/references/strips/", import.meta.url),
);
const RUNS = 3;

test.beforeEach(({}, testInfo) => {
  testInfo.skip(
    basename(testInfo.config.configFile ?? "") !==
      "playwright.strips.config.ts",
    "motion strips run only under playwright.strips.config.ts",
  );
  testInfo.skip(
    process.env.RECORD !== "runs" &&
      (process.env.RECORD !== "1" || !process.env.ORIGIN_URL),
    "recording is opt-in: RECORD=1 with ORIGIN_URL, or RECORD=runs",
  );
});

for (const strip of strips)
  test(`record ${strip.name}`, async ({ browser }, testInfo) => {
    test.setTimeout(RUNS * (strip.duration + 30_000));
    const use = testInfo.project.use as BrowserContextOptions;
    const viewport = use.viewport!;
    const runs: Run[] = [];
    mkdirSync(`${dir}runs`, { recursive: true });
    for (let i = 1; i <= RUNS; i++) {
      if (process.env.RECORD === "runs") {
        const file = `${dir}runs/${strip.name}.run${i}-${testInfo.project.name}.json`;
        runs.push(expandRun(JSON.parse(readFileSync(file, "utf8")).data));
        continue;
      }
      const run = await runStrip(
        browser,
        strip,
        process.env.ORIGIN_URL!.replace(/\/$/, ""),
        deviceOptions(use),
      );
      evidence(`runs/${strip.name}.run${i}`, compactRun(run));
      runs.push(run);
    }
    writeFileSync(
      `${dir}${strip.name}-${viewport.width}.json`,
      formatBaseline(aggregate(strip, runs, viewport)),
    );
  });
