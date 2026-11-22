import { existsSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { Slide } from "../../src/deck/model";
import { slides } from "../../src/deck/slides";
import { gallery } from "../../src/presets/gallery";

// Every block drawn as a component (feature 003, US3, T310): each block of
// the placeholder deck and of the preset gallery renders as it did before
// its renderer moved into src/components/deck/. Each block's DOM (its
// markup and classes, generated ids left out) and its screenshot are
// compared with the J0 build's, recorded once with --update-snapshots, at
// 390 and 1440 (the two projects). The screenshot allows a small pixel
// tolerance for anti-aliasing.
//
// The baselines are this machine's (constitution V) and the template's
// placeholder deck's, so they are not committed (.gitignore): a deck made
// from the template, or a machine without them, skips this spec. Record
// them on the J0 build with
// `npx playwright test tests/slides/components.spec.ts --update-snapshots`;
// a copy is kept in .local/baselines/j0-components/.
//
// The blocks a slide should show are its baselines: their number and type
// come from the recorded files, not from the slide's data, so the spec
// compares the placeholder deck as slide files (J2) with the J0 build's
// data slides. A slide with no baseline holds no block.

type Target = { deck: "deck" | "gallery"; path: string; list: Slide[] };
const decks: Target[] = [
  { deck: "deck", path: "/", list: slides },
  { deck: "gallery", path: "/gallery", list: gallery.slides },
];

/** Opens slide `n` (1-based) once it has arrived and stopped moving. */
async function open(page: Page, path: string, n: number) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`${path}?s=${n}&intro=off`);
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

/** A block's markup with the values React and recharts generate per render
 *  (ids and the references to them) replaced by a stand-in. */
const dom = (html: string) =>
  html
    .replace(
      /\s(id|for|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g,
      ' $1="…"',
    )
    .replace(/url\(#[^)]*\)/g, "url(#…)")
    .replace(/></g, ">\n<");

/** A slide's recorded blocks, in order: their types, from the baselines'
 *  names (`<deck>-<id>-<n>-<type>-<project>-<platform>.png`). */
function recorded(info: TestInfo, deck: Target["deck"], id: string): string[] {
  const dir = dirname(info.snapshotPath("any.png"));
  if (!existsSync(dir)) return [];
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const name = new RegExp(
    `^${deck}-${escape(id)}-(\\d+)-([a-zA-Z]+)-${escape(info.project.name)}-${escape(info.snapshotSuffix)}\\.png$`,
  );
  return readdirSync(dir)
    .map((file) => name.exec(file))
    .filter((match) => match !== null)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((match) => match[2]);
}

for (const { deck, path, list } of decks)
  list.forEach((slide, i) => {
    test(`${deck} ${i + 1} (${slide.id}): every block renders as before`, async ({
      page,
    }) => {
      const info = test.info();
      const recording = ["all", "changed"].includes(
        info.config.updateSnapshots,
      );
      const types = recorded(info, deck, slide.id);
      test.skip(
        !recording && !existsSync(dirname(info.snapshotPath("any.png"))),
        "no J0 baseline on this machine (see the comment at the top)",
      );
      await open(page, path, i + 1);
      const blocks = page.locator("main:not([aria-hidden]) [data-block]");
      if (!recording) await expect(blocks).toHaveCount(types.length);
      const count = await blocks.count();
      for (let b = 0; b < count; b++) {
        const block = blocks.nth(b);
        const type = await block.getAttribute("data-block");
        if (!recording) expect(type, `block ${b + 1}`).toBe(types[b]);
        const name = `${deck}-${slide.id}-${b + 1}-${type}`;
        expect(dom(await block.evaluate((el) => el.outerHTML))).toMatchSnapshot(
          `${name}.html`,
        );
        await expect(block).toHaveScreenshot(`${name}.png`, {
          maxDiffPixelRatio: 0.01,
          threshold: 0.2,
          animations: "disabled",
        });
      }
    });
  });
