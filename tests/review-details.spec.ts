import { expect, test, type Page } from "@playwright/test";
import { slideContent } from "../src/deck/content";
import { slides } from "../src/deck/slides";

// The owner's second look at the merged build (spec 001, "After reviewing
// the merged build"): branching lines in solid colours, so overlapping
// pieces never add up; the divider between the logo and the deck's title;
// and the footer's slide number in the header step label's muted style.

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
}

const forkSlide =
  slides.findIndex((slide) =>
    slideContent(slide.id).blocks.some((block) => block.type === "fork"),
  ) + 1;

/** The alpha of a computed colour (1 when the colour has none). */
function alphaOf(colour: string) {
  const slash = /\/\s*([\d.]+)\s*\)$/.exec(colour);
  if (slash) return Number(slash[1]);
  const rgba = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/.exec(colour);
  return rgba ? Number(rgba[1]) : 1;
}

test("branching lines are drawn in solid colours", async ({ page }) => {
  expect(forkSlide, "a slide with a fork").toBeGreaterThan(0);
  await openDeck(page, forkSlide);
  const colours = await page
    .locator("main:not([aria-hidden]) [data-split]")
    .first()
    .evaluate((split) => {
      const out: string[] = [];
      const pieces = [split, ...split.querySelectorAll("[data-split-item]")];
      for (const el of pieces)
        for (const which of ["::before", "::after"] as const) {
          const s = getComputedStyle(el, which);
          if (s.content === "none" || s.display === "none") continue;
          if (parseFloat(s.width) === 0 && parseFloat(s.height) === 0) continue;
          for (const value of [
            s.backgroundColor,
            s.borderTopColor,
            s.borderBottomColor,
            s.borderLeftColor,
            s.borderRightColor,
          ])
            if (!/^rgba\(0, 0, 0, 0\)$|transparent/.test(value))
              out.push(value);
        }
      return out;
    });
  expect(colours.length, "the split draws its line").toBeGreaterThan(0);
  for (const colour of colours) expect(alphaOf(colour), colour).toBe(1);
});

test("the header shows a divider between the logo and the deck's title", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the top bar is hidden on phones");
  await openDeck(page, 1);
  const divider = page.locator("header.top .brand-divider");
  await expect(divider).toBeVisible();
  const look = await divider.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      width: r.width,
      height: r.height,
      colour: getComputedStyle(el).backgroundColor,
      page: getComputedStyle(document.body).backgroundColor,
    };
  });
  expect(look.width).toBeGreaterThanOrEqual(1);
  expect(look.height).toBeGreaterThanOrEqual(16);
  expect(alphaOf(look.colour)).toBe(1);
  expect(look.colour).not.toBe(look.page);
});

test("the footer's slide number uses the header step label's muted style", async ({
  page,
}) => {
  await openDeck(page, 3);
  const look = await page
    .locator(
      "footer [data-slide-number], footer button[aria-label^='Go to slide']",
    )
    .first()
    .evaluate((el) => {
      const count = el.closest("[class*='count']") ?? el;
      const s = getComputedStyle(count);
      const probe = document.createElement("span");
      probe.style.color = "var(--color-muted)";
      document.body.append(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      return {
        colour: s.color,
        muted,
        weight: s.fontWeight,
        size: parseFloat(s.fontSize),
      };
    });
  expect(look.colour).toBe(look.muted);
  expect(look.weight).toBe("400");
  expect(look.size).toBe(12);
});
