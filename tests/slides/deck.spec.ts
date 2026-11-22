import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Every placeholder slide keeps its look and its order (feature 003, US3,
// T320): after the placeholder deck moved from data into slide files
// (src/slides/), slide n of the deck is drawn as slide n of the J1 build
// was, at 390 and 1440 (the two projects). Each slide's markup (its frame,
// generated ids left out) and the whole page's screenshot are compared with
// the J1 build's, recorded once with --update-snapshots. The screenshot
// allows a colour tolerance for anti-aliasing and at most 50 pixels over it.
//
// The slides are counted from /print, not read from the deck's data, so the
// same spec records on the data deck and compares on the file deck.
//
// The baselines are this machine's (constitution V) and the template's
// placeholder deck's, so they are not committed (.gitignore): a deck made
// from the template, or a machine without them, skips this spec. Record
// them on the J1 build with
// `npx playwright test tests/slides/deck.spec.ts --update-snapshots`;
// a copy is kept in .local/baselines/j1-slides/.

const pad = (n: number) => String(n).padStart(2, "0");

/** Opens slide `n` (1-based) once it has arrived and stopped moving. */
async function open(page: Page, n: number) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`/?s=${n}&intro=off`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 15_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  // Charts draw once their box is measured; every animation has ended.
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .every((a) => a.playState === "finished" || a.playState === "idle"),
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

/** A slide's markup with the values React and recharts generate per render
 *  (ids and the references to them) replaced by a stand-in. */
const dom = (html: string) =>
  html
    .replace(
      /\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g,
      ' $1="…"',
    )
    .replace(/url\(#[^)]*\)/g, "url(#…)")
    .replace(/></g, ">\n<");

test("every placeholder slide keeps its look and its place", async ({
  page,
}) => {
  const info = test.info();
  const recording = ["all", "changed"].includes(info.config.updateSnapshots);
  test.skip(
    !recording && !existsSync(info.snapshotPath("slide-01.png")),
    "no J1 baseline on this machine (see the comment at the top)",
  );
  test.setTimeout(600_000);
  await page.goto("/print");
  const count = await page.locator("[data-print-page]").count();
  expect(count).toBeGreaterThan(0);
  if (!recording)
    // As many slides as the J1 build had: one baseline per slide, none left.
    expect(
      existsSync(info.snapshotPath(`slide-${pad(count + 1)}.png`)),
      "the J1 build had more slides",
    ).toBe(false);
  for (let n = 1; n <= count; n++) {
    await open(page, n);
    const current = page.locator("main:not([aria-hidden])");
    await expect(current).toHaveAttribute("aria-label", `${n} / ${count}`);
    const slide = current.locator("[data-kind]");
    expect
      .soft(dom(await slide.evaluate((el) => el.outerHTML)))
      .toMatchSnapshot(`slide-${pad(n)}.html`);
    // A per-pixel colour tolerance for anti-aliasing, and almost no pixel
    // over it: a whole page hides a shifted line in a ratio.
    await expect.soft(page).toHaveScreenshot(`slide-${pad(n)}.png`, {
      maxDiffPixels: 50,
      threshold: 0.2,
      animations: "disabled",
    });
  }
});
