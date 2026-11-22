import { expect, type Page } from "@playwright/test";

// The visible-content fit check of tests/deck.spec.ts ("every placeholder
// slide fits its stage", SC-005), for the slide on screen: every visible
// line of text and every block stays inside the slide's stage and above the
// footer, nothing overflows sideways, and the page never scrolls sideways.
// Copied, not shared, so feature 001's spec stays as it is.

export async function measureFit(page: Page) {
  return page
    .locator("main:not([aria-hidden]) [data-kind]")
    .evaluate((slide) => {
      const box = slide.getBoundingClientRect();
      const footer = document.querySelector("footer")!.getBoundingClientRect();
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
      const blocks = {
        top: box.bottom,
        bottom: box.top,
        left: box.right,
        right: box.left,
      };
      for (const block of slide.querySelectorAll<HTMLElement>("[data-block]")) {
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
}

/** The slide on screen fits its stage; `at` names it in a failure. */
export async function expectFits(page: Page, at: string) {
  const m = await measureFit(page);
  const where = `${at}: ${JSON.stringify(m)}`;
  expect(m.sw, where).toBeLessThanOrEqual(m.cw + 1);
  expect(m.pageOverflow, where).toBeLessThanOrEqual(0);
  expect(m.blocks.top, where).toBeGreaterThanOrEqual(m.box.top - 0.5);
  expect(m.blocks.bottom, where).toBeLessThanOrEqual(m.box.bottom + 0.5);
  expect(m.blocks.left, where).toBeGreaterThanOrEqual(m.box.left - 0.5);
  expect(m.blocks.right, where).toBeLessThanOrEqual(m.box.right + 0.5);
  expect(m.top, where).toBeGreaterThanOrEqual(m.box.top - 0.5);
  expect(m.left, where).toBeGreaterThanOrEqual(m.box.left - 0.5);
  expect(m.right, where).toBeLessThanOrEqual(m.box.right + 0.5);
  expect(m.bottom, where).toBeLessThanOrEqual(m.box.bottom + 0.5);
  expect(m.bottom, where).toBeLessThanOrEqual(m.footerTop + 0.5);
}
