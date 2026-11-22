import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { config } from "../src/brand/config";
import { langs } from "../src/deck/langs";
import { pdfHref } from "../src/deck/model";
import { pdfName } from "../src/deck/pdf-name";
import { slideContent, stepsStyle, type Block } from "../src/deck/content";
import { slides } from "../src/deck/slides";
import { registry } from "../src/presets/registry";
import { showcase } from "../src/presets/showcase";

// The template's own checks of the placeholder deck (User Story 1): it holds
// every kind, layout and generic block in placeholder text only (FR-002),
// the menu's PDF download hands over a real file, and every placeholder
// slide fits its stage at 390 and 1440 (SC-005). Runs in both projects.

/** A type-level check, run by the typecheck: the org block's type has no
 *  `style` field. */
const orgHasNoStyle: "style" extends keyof Extract<Block, { type: "org" }>
  ? false
  : true = true;

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

/** Every `Text` in a value: an object whose values are the languages'
 *  strings. */
function texts(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const entries = Object.entries(value);
  if (
    entries.length === langs.length &&
    langs.every(
      (lang) => typeof (value as Record<string, unknown>)[lang] === "string",
    )
  )
    return langs.map((lang) => (value as Record<string, string>)[lang]);
  return entries.flatMap(([, v]) => texts(v));
}

test("the placeholder deck holds every kind, layout and block (FR-002)", () => {
  const contents = slides.map((slide) => slideContent(slide.id));
  const blocks: Block[] = contents.flatMap((content) => content.blocks);
  const has = (list: string[], wanted: string[]) =>
    expect([...new Set(list)].sort()).toEqual(expect.arrayContaining(wanted));

  has(
    slides.map((slide) => slide.kind),
    ["title", "divider", "slide", "closing"],
  );
  has(
    contents.map((content) => content.layout ?? "stack"),
    ["stack", "split", "split-end", "center", "statement", "module"],
  );
  has(
    blocks.map((block) => block.type),
    ["lead", "note", "points", "steps", "facts", "org", "fork", "week", "plan"],
  );
  // Each block's styles, its default included.
  const styles = (type: Block["type"], fallback: string) =>
    blocks.flatMap((block) =>
      block.type === type
        ? [("style" in block && block.style) || fallback]
        : [],
    );
  has(styles("points", "cards"), ["cards", "numbered", "chips"]);
  has(
    blocks.flatMap((block) =>
      block.type === "steps" ? [stepsStyle(block.style)] : [],
    ),
    ["rail", "across"],
  );
  // The org block draws one way and has no style: the ledger was dropped,
  // and nothing reads a "tree" style.
  const orgs = blocks.filter((block) => block.type === "org");
  expect(orgs.length).toBeGreaterThan(0);
  for (const org of orgs) expect(Object.keys(org)).not.toContain("style");
  expect(orgHasNoStyle).toBe(true);
  has(
    blocks.flatMap((block) =>
      block.type === "lead" ? [block.size ?? "normal"] : [],
    ),
    ["normal", "statement"],
  );

  // Placeholder text only (constitution III): every string a slide shows is
  // "Placeholder title" or "Placeholder text", key-phrase markup aside. The
  // presets' showcase is checked against the registry below.
  const own = slides.filter((slide) => !shown.has(slide.id));
  const words = [...own, ...own.map((slide) => slideContent(slide.id))].flatMap(
    texts,
  );
  expect(words.length).toBeGreaterThan(0);
  for (const word of words)
    expect(["Placeholder title", "Placeholder text"]).toContain(
      word.replaceAll("**", ""),
    );
});

/** The showcase's slides, by id. */
const shown = new Set(showcase().slides.map((slide) => slide.id));

// The presets in the demo (feature 002, "Session 2026-11-22 (owner, after
// the final build)": "Put them in the demo"): before the closing slide, a
// divider "Presets" and one slide per registry preset, in the registry's
// order, each with its example in its layout. Its section and titles are
// the preset names, as the gallery's are; everything else is the
// registry's placeholder content.
test("the placeholder deck ends with a showcase of every preset, before the closing", () => {
  const at = slides.findIndex((slide) => slide.id === showcase().slides[0].id);
  expect(at, "the showcase's divider").toBeGreaterThan(0);
  // Slides 1–12 stay as they were; the closing slide stays last.
  expect(at).toBeGreaterThanOrEqual(12);
  expect(slides.at(-1)!.kind).toBe("closing");
  const run = slides.slice(at, -1);
  expect(run).toHaveLength(1 + registry.length);
  const [divider, ...rest] = run;
  expect(divider.kind).toBe("divider");
  for (const lang of langs) {
    expect(divider.section?.[lang]).toBe("Presets");
    expect(divider.title[lang]).toBe("Presets");
  }
  expect(slideContent(divider.id).blocks).toEqual([]);
  for (const [i, entry] of registry.entries()) {
    const slide = rest[i];
    expect(slide.kind, entry.name).toBe("slide");
    for (const lang of langs) {
      expect(slide.section?.[lang], entry.name).toBe("Presets");
      expect(slide.title[lang], entry.name).toBe(entry.name);
    }
    const content = slideContent(slide.id);
    expect(content.blocks, entry.name).toEqual([entry.example]);
    expect(content.layout ?? "stack", entry.name).toBe(entry.layout ?? "stack");
    for (const word of texts(content.headline))
      expect(word, entry.name).toBe("Placeholder text");
  }
  // Ids of their own: the gallery's are not the deck's.
  const ids = slides.map((slide) => slide.id);
  expect(new Set(ids).size).toBe(ids.length);
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
