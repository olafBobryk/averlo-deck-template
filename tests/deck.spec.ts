import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { langs } from "../src/deck/langs";
import { pdfHref } from "../src/deck/model";
import { slides } from "../src/deck/slides";

// The template's own checks of the placeholder deck (User Story 1): the
// menu's PDF download hands over a real file, and every placeholder slide
// fits its stage at 390 and 1440 (SC-005). Runs in both projects.

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

test("the menu's PDF download returns the deck as a file", async ({ page }) => {
  await openDeck(page, 1);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Download", exact: true }).click();
  const item = page.getByRole("menuitem").first();
  await expect(item).toHaveAttribute("href", pdfHref(langs[0]));
  const saved = page.waitForEvent("download");
  await item.click();
  const download = await saved;
  // Named from the deck title, ending in its language (the slug itself is
  // fixed by T036).
  expect(download.suggestedFilename()).toMatch(
    new RegExp(`^[a-z0-9][a-z0-9-]*-${langs[0]}\\.pdf$`),
  );
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
