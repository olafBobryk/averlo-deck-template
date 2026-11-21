import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { config } from "../src/brand/config";
import { langs } from "../src/deck/langs";
import { pdfHref } from "../src/deck/model";
import { pdfName } from "../src/deck/pdf-name";
import { slideContent, type Block } from "../src/deck/content";
import { slides } from "../src/deck/slides";

// The template's own checks of the placeholder deck (User Story 1): it holds
// every kind, layout and generic block in placeholder text only (FR-002),
// the menu's PDF download hands over a real file, and every placeholder
// slide fits its stage at 390 and 1440 (SC-005). Runs in both projects.

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
  has(styles("steps", "rail"), ["rail", "nodes"]);
  has(styles("org", "tree"), ["tree"]);
  has(
    blocks.flatMap((block) =>
      block.type === "lead" ? [block.size ?? "normal"] : [],
    ),
    ["normal", "statement"],
  );

  // Placeholder text only (constitution III): every string a slide shows is
  // "Placeholder title" or "Placeholder text", key-phrase markup aside.
  const words = [...slides, ...contents].flatMap(texts);
  expect(words.length).toBeGreaterThan(0);
  for (const word of words)
    expect(["Placeholder title", "Placeholder text"]).toContain(
      word.replaceAll("**", ""),
    );
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
            bottom = Math.max(bottom, r.bottom);
            right = Math.max(right, r.right);
            left = Math.min(left, r.left);
          }
        }
        return {
          sw: slide.scrollWidth,
          cw: slide.clientWidth,
          sh: slide.scrollHeight,
          ch: slide.clientHeight,
          bottom,
          right,
          left,
          box: { left: box.left, right: box.right, bottom: box.bottom },
          footerTop: footer.top,
          pageOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });
    const at = `slide ${s}: ${JSON.stringify(m)}`;
    // Nothing overflows the slide, either way, and the page never scrolls
    // sideways.
    expect(m.sw, at).toBeLessThanOrEqual(m.cw + 1);
    expect(m.sh, at).toBeLessThanOrEqual(m.ch + 1);
    expect(m.pageOverflow, at).toBeLessThanOrEqual(0);
    // Every line is inside the slide, and above the footer.
    expect(m.left, at).toBeGreaterThanOrEqual(m.box.left - 0.5);
    expect(m.right, at).toBeLessThanOrEqual(m.box.right + 0.5);
    expect(m.bottom, at).toBeLessThanOrEqual(m.box.bottom + 0.5);
    expect(m.bottom, at).toBeLessThanOrEqual(m.footerTop + 0.5);
  }
});
