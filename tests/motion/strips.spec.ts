import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type BrowserContextOptions } from "@playwright/test";
import { deviceOptions, diff, jumps, runStrip, type Baseline } from "./sampler";
import { strips } from "./strips";

// The motion frame diff (FR-015, research R8): every strip replayed against
// TARGET_URL with the recording's inputs and sampler, resampled onto the
// same grid and compared with its baseline within the recorded tolerance;
// and, under reduced motion, no intermediate frames. Only under
// playwright.strips.config.ts, never in smoke.

const dir = fileURLToPath(
  new URL("../../specs/001-deck-template/references/strips/", import.meta.url),
);

function target() {
  const url = process.env.TARGET_URL;
  if (!url) throw new Error("TARGET_URL is not set");
  return url.replace(/\/$/, "");
}

test.beforeEach(({}, testInfo) => {
  testInfo.skip(
    basename(testInfo.config.configFile ?? "") !==
      "playwright.strips.config.ts",
    "motion strips run only under playwright.strips.config.ts",
  );
});

const device = (use: unknown) => deviceOptions(use as BrowserContextOptions);

for (const strip of strips)
  test(`${strip.name} keeps its baseline`, async ({ browser }, testInfo) => {
    test.setTimeout(strip.duration + 60_000);
    const { width } = (testInfo.project.use as BrowserContextOptions).viewport!;
    const baseline = JSON.parse(
      readFileSync(`${dir}${strip.name}-${width}.json`, "utf8"),
    ) as Baseline;
    const run = await runStrip(
      browser,
      strip,
      target(),
      device(testInfo.project.use),
    );
    const failures = diff(strip, baseline, run);
    expect(failures, failures.slice(0, 40).join("\n")).toEqual([]);
  });

test.describe("reduced motion", () => {
  for (const strip of strips.filter((s) => s.name !== "intro"))
    test(`${strip.name} has no intermediate frames`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(strip.duration + 60_000);
      const use = testInfo.project.use as BrowserContextOptions;
      const run = await runStrip(
        browser,
        strip,
        target(),
        device(use),
        "reduce",
      );
      const failures = jumps(strip, run, use.viewport!.width);
      // What each value showed, in order, for the report.
      const states = Object.fromEntries(
        Object.values(strip.groups)
          .flatMap((g) => Object.keys(g.values))
          .map((k) => [
            k,
            run.frames
              .map((f) => f.values[k] ?? null)
              .filter((v, i, all) => i === 0 || v !== all[i - 1]),
          ]),
      );
      test.info().annotations.push({
        type: "states under reduced motion",
        description: JSON.stringify(states),
      });
      expect(failures, failures.slice(0, 40).join("\n")).toEqual([]);
    });

  test("the intro is skipped", async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      ...device(testInfo.project.use),
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        const w = window as unknown as { __shown: number; __frames: number };
        w.__shown = 0;
        w.__frames = 0;
        const tick = () => {
          const gate = document.querySelector("[data-gate]");
          if (
            document.documentElement.hasAttribute("data-intro") ||
            (gate && getComputedStyle(gate).display !== "none")
          )
            w.__shown++;
          w.__frames++;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await page.goto(`${target()}/?s=3`);
      await expect(
        page.locator('main[aria-roledescription="slide"]'),
      ).toHaveCount(1);
      await page.waitForTimeout(2500);
      const { shown, frames } = await page.evaluate(() => {
        const w = window as unknown as { __shown: number; __frames: number };
        return { shown: w.__shown, frames: w.__frames };
      });
      expect(frames).toBeGreaterThan(10);
      expect(shown, "frames showing the intro").toBe(0);
    } finally {
      await context.close();
    }
  });
});
