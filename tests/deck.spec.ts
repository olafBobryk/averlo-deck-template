import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { config } from "../src/brand/config";
import type { BranchesProps } from "../src/components/deck";
import { langs } from "../src/deck/langs";
import { pdfHref } from "../src/deck/model";
import { pdfName } from "../src/deck/pdf-name";
import { slides } from "../src/deck/slides";
import { registry } from "../src/presets/registry";
import { slideData } from "../src/slides/data";
import { printedBlocks } from "./printed";

// The template's own checks of the placeholder deck (User Story 1): it holds
// every kind, layout and generic block in placeholder text only (FR-002),
// the menu's PDF download hands over a real file, and every placeholder
// slide fits its stage at 390 and 1440 (SC-005). Runs in both projects.
//
// The deck is its slide files (src/slides/, feature 003): their kinds,
// layouts and words are read from the generated data file
// (src/slides/data.ts), and their blocks as /print draws them, each in its
// frame (`data-block`) with its style.

/** A type-level check, run by the typecheck: the org component takes no
 *  `style`. */
const orgHasNoStyle: "style" extends keyof BranchesProps ? false : true = true;

async function openDeck(page: Page, s: number) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`/?s=${s}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

/** Every string in a slide's words, in every language. */
const strings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(strings)
      : [];

/** A figure written as a string: a stat's value or a plan's month. */
const figure = (word: string) => /^[\d\s.,:%+-]+$/.test(word);

/** The showcase's slides: its divider, then one per preset. */
const showcaseAt = slideData.findIndex((slide) => slide.id === "showcase");
const shown = new Set(
  slideData
    .slice(showcaseAt, showcaseAt + 1 + registry.length)
    .map((slide) => slide.id),
);

test("the placeholder deck holds every kind, layout and block (FR-002)", async ({
  page,
}) => {
  const has = (list: string[], wanted: string[]) =>
    expect([...new Set(list)].sort()).toEqual(expect.arrayContaining(wanted));

  // The deck's slides are its files, in number order.
  expect(slides.map((slide) => slide.id)).toEqual(
    slideData.map((slide) => slide.id),
  );
  has(
    slideData.map((slide) => slide.meta.kind),
    ["title", "divider", "slide", "closing"],
  );
  has(
    slideData.flatMap((slide) =>
      slide.meta.layout ? [slide.meta.layout] : [],
    ),
    ["stack", "split", "split-end", "center", "statement", "module"],
  );
  const printed = await printedBlocks(page);
  expect(printed).toHaveLength(slideData.length);
  const blocks = printed.flat();
  has(
    blocks.map((block) => block.type),
    ["lead", "note", "points", "steps", "facts", "org", "fork", "week", "plan"],
  );
  // Each block's styles, its default included.
  const styles = (type: string) =>
    blocks.flatMap((block) =>
      block.type === type && block.style ? [block.style] : [],
    );
  has(styles("points"), ["cards", "numbered", "chips"]);
  has(styles("steps"), ["rail", "across"]);
  // The org block draws one way and has no style: the ledger was dropped,
  // and nothing reads a "tree" style.
  expect(blocks.filter((block) => block.type === "org").length).toBeGreaterThan(
    0,
  );
  expect(orgHasNoStyle).toBe(true);
  has(
    blocks.flatMap((block) =>
      block.type === "lead" ? [block.size ?? "normal"] : [],
    ),
    ["normal", "statement"],
  );

  // Placeholder text only (constitution III): every word a slide's copy
  // holds is "Placeholder title" or "Placeholder text", key-phrase markup
  // aside, or a figure. The presets' showcase is checked below.
  const own = slideData.filter((slide) => !shown.has(slide.id));
  const words = own.flatMap((slide) => strings(slide.copy));
  expect(words.length).toBeGreaterThan(0);
  for (const word of words.filter((word) => !figure(word)))
    expect(["Placeholder title", "Placeholder text"]).toContain(
      word.replaceAll("**", ""),
    );
});

// The presets in the demo (feature 002, "Session 2026-11-22 (owner, after
// the final build)": "Put them in the demo"): before the closing slide, a
// divider "Presets" and one slide per registry preset, in the registry's
// order, each with its visual in its layout. Its section and titles are
// the preset names, as the gallery's are; everything else is placeholder
// words and figures.
test("the placeholder deck ends with a showcase of every preset, before the closing", async ({
  page,
}) => {
  const at = showcaseAt;
  expect(at, "the showcase's divider").toBeGreaterThan(0);
  // Slides 1–12 stay as they were; the closing slide stays last.
  expect(at).toBeGreaterThanOrEqual(12);
  expect(slideData.at(-1)!.meta.kind).toBe("closing");
  const run = slideData.slice(at, -1);
  expect(run).toHaveLength(1 + registry.length);
  const [divider, ...rest] = run;
  expect(divider.meta.kind).toBe("divider");
  for (const lang of langs) {
    expect(divider.copy[lang][divider.meta.section!]).toBe("Presets");
    expect(divider.copy[lang].title).toBe("Presets");
  }
  const printed = await printedBlocks(page);
  expect(printed[at]).toEqual([]);
  const placeholders = [
    "Placeholder title",
    "Placeholder text",
    "Placeholder date",
    "Placeholder text, placeholder text, placeholder text, placeholder text.",
  ];
  for (const [i, entry] of registry.entries()) {
    const slide = rest[i];
    expect(slide.meta.kind, entry.name).toBe("slide");
    for (const lang of langs) {
      expect(slide.copy[lang][slide.meta.section!], entry.name).toBe("Presets");
      expect(slide.copy[lang].title, entry.name).toBe(entry.name);
      for (const [key, word] of Object.entries(slide.copy[lang]))
        if (key !== "title" && key !== slide.meta.section)
          for (const each of strings(word).filter((word) => !figure(word)))
            expect(placeholders, `${entry.name}: ${key}`).toContain(each);
    }
    expect(slide.meta.layout, entry.name).toBe(entry.layout ?? "stack");
    // T051 (owner on T050: "all these slides dont come with slide body
    // text, they porbably should"): a short body text, a plain lead, with
    // the visual; before it, or after it on the statement, whose visual is
    // the claim itself.
    const drawn = printed[at + 1 + i];
    expect(
      drawn.map((block) => block.type),
      entry.name,
    ).toEqual(
      entry.layout === "statement" ? ["lead", "lead"] : ["lead", entry.block],
    );
    const body = entry.layout === "statement" ? drawn[1] : drawn[0];
    expect(body.size, entry.name).toBeNull();
    if (entry.layout === "statement")
      expect(drawn[0].size, entry.name).toBe("statement");
  }
  // Ids of their own: the gallery's are not the deck's.
  const ids = slideData.map((slide) => slide.id);
  expect(new Set(ids).size).toBe(ids.length);
});

// T051 (owner on T050: "slides are too tight next to the header, more
// padding on top"): where the top bar shows, a content slide's first line
// starts well clear of it: from the logo's box to the first line's box,
// at least 4.5 slide units (--u), where it was 1.8 (26 px at 1440 × 900;
// about 40 px to the glyphs). Phones hide the bar.
test("a content slide's text starts well below the top bar", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let checked = 0;
  for (let s = 1; s <= slides.length; s++) {
    // A slide with a layout has a headline (src/deck/slide.ts).
    if (!slideData[s - 1].meta.layout) continue;
    await openDeck(page, s);
    const logo = page.locator(".aq .brand-logo").first();
    if (!(await logo.isVisible())) continue;
    const m = await page
      .locator("main:not([aria-hidden]) [data-kind]")
      .evaluate((slide) => {
        const range = document.createRange();
        let top = Infinity;
        const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          range.selectNodeContents(node);
          for (const r of range.getClientRects())
            if (r.height >= 1) top = Math.min(top, r.top);
        }
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        return { top, u: Math.min(width / 100, (height * 1.7778) / 100) };
      });
    const bottom = (await logo.boundingBox())!;
    const gap = (m.top - (bottom.y + bottom.height)) / m.u;
    expect(gap, `slide ${s}`).toBeGreaterThanOrEqual(4.5);
    checked++;
  }
  test.skip(checked === 0, "the top bar is hidden on this screen");
});

// T051: on a split preset slide the body text stands beside the visual,
// under the headline, so the slide shows text and a visual side by side.
test("a split showcase slide sets its body text beside the visual", async ({
  page,
}) => {
  const split = slideData
    .map((slide, i) => ({ slide, s: i + 1 }))
    .filter(
      ({ slide }) => shown.has(slide.id) && slide.meta.layout === "split",
    );
  expect(split.length).toBeGreaterThan(0);
  const phone = (page.viewportSize()?.width ?? 0) < 700;
  for (const { slide, s } of split) {
    await openDeck(page, s);
    const main = page.locator("main:not([aria-hidden])");
    const head = (await main
      .locator("[data-kind] > :first-child")
      .boundingBox())!;
    const lead = (await main.locator('[data-block="lead"]').boundingBox())!;
    const visual = (await main
      .locator('[data-block]:not([data-block="lead"])')
      .first()
      .boundingBox())!;
    // Under the headline, in every layout.
    expect(lead.y, slide.id).toBeGreaterThanOrEqual(head.y + head.height - 1);
    if (phone) {
      // One column: headline, body text, visual.
      expect(visual.y, slide.id).toBeGreaterThanOrEqual(
        lead.y + lead.height - 1,
      );
    } else {
      // Beside the visual, in the headline's column.
      expect(lead.x + lead.width, slide.id).toBeLessThanOrEqual(visual.x + 1);
      expect(Math.abs(lead.x - head.x), slide.id).toBeLessThanOrEqual(1);
    }
  }
});

test("the menu's PDF download returns the deck as a file", async ({ page }) => {
  await openDeck(page, 1);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Download", exact: true }).click();
  const item = page.getByRole("menuitem").first();
  // `<slug>-<lang>.pdf`, the slug made from the configured deck title (T036).
  const name = pdfName(config.deckTitle, langs[0]);
  expect(pdfHref(langs[0])).toBe(`/pdf/${name}`);
  await expect(item).toHaveAttribute("href", `/pdf/${name}`);
  const saved = page.waitForEvent("download");
  await item.click();
  const download = await saved;
  expect(download.suggestedFilename()).toBe(name);
  const file = readFileSync(await download.path());
  expect(file.length).toBeGreaterThan(1000);
  expect(file.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  const response = await page.request.get(pdfHref(langs[0]));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect((await response.body()).length).toBe(file.length);
});

test("every placeholder slide fits its stage (SC-005)", async ({ page }) => {
  test.setTimeout(120_000);
  for (let s = 1; s <= slides.length; s++) {
    await openDeck(page, s);
    const m = await page
      .locator("main:not([aria-hidden]) [data-kind]")
      .evaluate((slide) => {
        const box = slide.getBoundingClientRect();
        const footer = document
          .querySelector("footer")!
          .getBoundingClientRect();
        // The lowest and the widest line of slide text, as drawn.
        let top = box.bottom;
        let bottom = box.top;
        let right = box.left;
        let left = box.right;
        const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim() || !node.parentElement) continue;
          if (!node.parentElement.checkVisibility({ opacityProperty: true }))
            continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            if (r.width < 1 || r.height < 1) continue;
            top = Math.min(top, r.top);
            bottom = Math.max(bottom, r.bottom);
            right = Math.max(right, r.right);
            left = Math.min(left, r.left);
          }
        }
        // Every visible block's box.
        const blocks = {
          top: box.bottom,
          bottom: box.top,
          left: box.right,
          right: box.left,
        };
        for (const block of slide.querySelectorAll<HTMLElement>(
          "[data-block]",
        )) {
          if (!block.checkVisibility({ opacityProperty: true })) continue;
          const r = block.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          blocks.top = Math.min(blocks.top, r.top);
          blocks.bottom = Math.max(blocks.bottom, r.bottom);
          blocks.left = Math.min(blocks.left, r.left);
          blocks.right = Math.max(blocks.right, r.right);
        }
        return {
          sw: slide.scrollWidth,
          cw: slide.clientWidth,
          top,
          bottom,
          right,
          left,
          blocks,
          box: {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          },
          footerTop: footer.top,
          pageOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });
    const at = `slide ${s}: ${JSON.stringify(m)}`;
    // Fit means the content fits (owner, spec "During P4": "Fit = content
    // fits"): every visible line of text and every block stays inside the
    // slide's stage. The slide's empty bottom padding may run past it.
    // Nothing overflows sideways, and the page never scrolls sideways.
    expect(m.sw, at).toBeLessThanOrEqual(m.cw + 1);
    expect(m.pageOverflow, at).toBeLessThanOrEqual(0);
    // Every block is inside the slide.
    expect(m.blocks.top, at).toBeGreaterThanOrEqual(m.box.top - 0.5);
    expect(m.blocks.bottom, at).toBeLessThanOrEqual(m.box.bottom + 0.5);
    expect(m.blocks.left, at).toBeGreaterThanOrEqual(m.box.left - 0.5);
    expect(m.blocks.right, at).toBeLessThanOrEqual(m.box.right + 0.5);
    // Every line is inside the slide, and above the footer.
    expect(m.top, at).toBeGreaterThanOrEqual(m.box.top - 0.5);
    expect(m.left, at).toBeGreaterThanOrEqual(m.box.left - 0.5);
    expect(m.right, at).toBeLessThanOrEqual(m.box.right + 0.5);
    expect(m.bottom, at).toBeLessThanOrEqual(m.box.bottom + 0.5);
    expect(m.bottom, at).toBeLessThanOrEqual(m.footerTop + 0.5);
  }
});
