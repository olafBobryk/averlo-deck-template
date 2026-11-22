import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { expectFits } from "../presets/fit";
import { blockTypes, editJsx } from "./jsx";
import { devDeck, removeScratch, scratchDeck } from "./scratch";

// A preset is a slide file to copy (feature 003, US2, SC-002; T330): every
// file in src/presets/slides/ (each preset's example, its second example in
// alternates/, and the composed visual example in composed/) renders as a
// slide when copied unchanged into a deck's slide folder with a number, and
// still renders after its JSX is changed: two of its blocks swapped, or one
// part removed (./jsx). The spec builds one scratch deck (./scratch) of
// every file, then every edited file, and runs it on a dev server on its
// own port, at 390 and 1440. A copied file fits its stage; an edited one
// draws its blocks in their new order.

const root = fileURLToPath(new URL("../../", import.meta.url));
const presets = join(root, "src", "presets", "slides");
const port = Number(process.env.PRESETS_PORT ?? 3194);
const pad = (n: number) => String(n).padStart(2, "0");
const widths = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

/** Every slide file under src/presets/slides/, by its path there. */
function presetFiles(dir = presets): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return presetFiles(path);
      return /^[a-z0-9-]+\.tsx$/.test(name) ? [relative(presets, path)] : [];
    });
}

const files = presetFiles();
type Copied = {
  from: string;
  edited: boolean;
  number: number;
  name: string;
  source: string;
  blocks: string[];
};
const copies: Copied[] = [];
for (const edited of [false, true])
  for (const from of files) {
    const original = readFileSync(join(presets, from), "utf8");
    const source = edited ? editJsx(original).source : original;
    const number = copies.length + 1;
    copies.push({
      from,
      edited,
      number,
      name: `${pad(number)}-${edited ? "edited-" : ""}${from.replace(/\//g, "-")}`,
      source,
      blocks: blockTypes(source),
    });
  }

test("src/presets/slides/ holds slide files", () => {
  expect(files.length).toBeGreaterThan(0);
});

test.describe("every preset file, copied into a deck", { tag: "@deck" }, () => {
  let deck: { origin: string; stop: () => void } | undefined;
  let dir = "";
  test.beforeAll(async ({}, info) => {
    test.skip(
      info.project.name !== "desktop",
      "one dev server per folder: the desktop project sets both widths",
    );
    test.setTimeout(300_000);
    dir = scratchDeck(
      "presets",
      Object.fromEntries(copies.map((copy) => [copy.name, copy.source])),
    );
    deck = await devDeck(dir, port, ["/print", "/?intro=off"]);
  });
  test.afterAll(() => {
    deck?.stop();
    if (dir) removeScratch(dir);
  });

  async function open(page: Page, n: number) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() =>
      sessionStorage.setItem("deck:intro-played", "1"),
    );
    await page.goto(`${deck!.origin}/?s=${n}&intro=off`);
    await page.waitForFunction(
      () =>
        document.getElementById("deck-boot")?.dataset.state === "done" &&
        !document.documentElement.hasAttribute("data-arriving"),
      undefined,
      { timeout: 60_000 },
    );
    await page.evaluate(() => document.fonts.ready);
  }

  test("each prints on its own page, with its blocks in its order", async ({
    page,
  }) => {
    await page.goto(`${deck!.origin}/print`);
    const pages = page.locator("[data-print-page]");
    await expect(pages).toHaveCount(copies.length);
    const drawn = await pages.evaluateAll((list) =>
      list.map((printed) =>
        [...printed.querySelectorAll<HTMLElement>("[data-block]")].map(
          (block) => block.dataset.block!,
        ),
      ),
    );
    for (const copy of copies)
      expect(drawn[copy.number - 1], copy.name).toEqual(copy.blocks);
  });

  for (const size of widths)
    test(`at ${size.width}, each renders live; a copied file fits its stage`, async ({
      page,
    }) => {
      test.setTimeout(60_000 + copies.length * 8_000);
      await page.setViewportSize(size);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        // In development only, the ported top bar's header hydrates at its
        // phone height over the server's (`top-inner`), on every slide at
        // 390: the port's own warning, not a slide's.
        if (/hydration-mismatch[\s\S]*top-inner/.test(message.text())) return;
        errors.push(message.text());
      });
      for (const copy of copies) {
        await open(page, copy.number);
        const current = page.locator("main:not([aria-hidden])");
        await expect(current, copy.name).toHaveAttribute(
          "aria-label",
          `${copy.number} / ${copies.length}`,
        );
        await expect(
          current.locator("[data-kind] h1").first(),
          copy.name,
        ).toBeVisible();
        await expect(current.locator("[data-block]"), copy.name).toHaveCount(
          copy.blocks.length,
        );
        if (!copy.edited) await expectFits(page, copy.name);
      }
      expect(errors).toEqual([]);
    });
});
