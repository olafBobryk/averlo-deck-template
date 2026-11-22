import { expect, test, type Page } from "@playwright/test";
import { langs } from "../src/deck/langs";
import { sectionLabel } from "../src/deck/model";
import { slides } from "../src/deck/slides";
import { slideData } from "../src/slides/data";

// The phone: portrait reading, the menu on a
// phone, the home-screen app. Each test sets its
// own viewport, so both projects run the same checks.

const TOTAL = slides.length;
const PHONE_MIN = 28; // the phone minimum title size
const MARGIN = 24; // the side margins
const EDGE = 12; // the phone menu's edge and inset
/** A title-only slide with a section: the first slide without a headline
 *  whose footer names a section. Its title's size in 16:9 units, by kind
 *  (deck.module.css). */
const TITLED =
  slideData.findIndex((slide) => slide.meta.section && !slide.meta.layout) + 1;
const titleUnits = { title: 10, divider: 7.2, slide: 4.4, closing: 6 };

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Opens the placeholder deck at a slide. */
async function openDeck(page: Page, query: string) {
  // No key: mark the intro as played this session, so the
  // deck opens straight away as on a repeat visit.
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`/?${query.replace(/^\?/, "")}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** The footer's section label: the first part of its row. */
const sectionPart = (page: Page) =>
  page
    .getByRole("contentinfo")
    .locator(":scope > div")
    .first()
    .locator(":scope > *")
    .first();

/** The live title's size and box, the slide's stage (below the top bar),
 *  and whether anything scrolls sideways. */
const measureTitle = (page: Page) =>
  page.evaluate(() => {
    // The slide's largest text: its title, or its headline.
    const title = document.querySelector<HTMLElement>(
      "main:not([aria-hidden]) [data-variant='display']",
    )!;
    const box = title.getBoundingClientRect();
    const stage = title.closest("main")!.getBoundingClientRect();
    const root = document.documentElement;
    return {
      text: title.textContent,
      fontSize: parseFloat(getComputedStyle(title).fontSize),
      left: box.left,
      right: box.right,
      titleOverflow: title.scrollWidth - title.clientWidth,
      pageOverflow: root.scrollWidth - root.clientWidth,
      width: innerWidth,
      stageWidth: stage.width,
      stageHeight: stage.height,
    };
  });

/** A 16:9 unit of the slide's stage: min(width, 1.7778 × height) / 100. */
const unitOf = (m: { stageWidth: number; stageHeight: number }) =>
  Math.min(m.stageWidth, 1.7778 * m.stageHeight) / 100;

async function expectPortraitFooter(page: Page, slide: number) {
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText(`${pad(slide)} / ${pad(TOTAL)}`)).toBeVisible();
  await expect(
    footer.getByRole("button", { name: "Menu", exact: true }),
  ).toBeVisible();
  // The section label (a <p>, empty on the title slide) is not shown.
  expect(
    await footer
      .locator("p")
      .evaluateAll((labels) => labels.filter((p) => p.checkVisibility())),
  ).toHaveLength(0);
  await expect(footer.getByRole("progressbar")).toBeVisible();
}

async function expectLandscapeFooter(page: Page, label: string, slide: number) {
  const footer = page.getByRole("contentinfo");
  await expect(sectionPart(page)).toBeVisible();
  await expect(sectionPart(page)).toHaveText(label);
  await expect(footer.getByText(`${pad(slide)} / ${pad(TOTAL)}`)).toBeVisible();
  await expect(
    footer.getByRole("button", { name: "Menu", exact: true }),
  ).toBeVisible();
  await expect(footer.getByRole("progressbar")).toBeVisible();
}

test.describe("portrait reading", () => {
  test.use({ reducedMotion: "reduce" });

  for (const [width, height] of [
    [390, 844],
    [430, 932],
  ] as const) {
    test(`${width}×${height}: every title is readable, wraps, never overflows`, async ({
      page,
    }) => {
      const errors = watchConsole(page);
      await page.setViewportSize({ width, height });
      for (const lang of langs) {
        await openDeck(page, `?s=1&lang=${lang}`);
        for (let s = 1; s <= TOTAL; s++) {
          await expect(page).toHaveURL(new RegExp(`s=${s}(?!\\d)`));
          const m = await measureTitle(page);
          const at = `${lang} slide ${s} "${m.text}": ${JSON.stringify(m)}`;
          expect(m.fontSize, at).toBeGreaterThanOrEqual(PHONE_MIN);
          expect(m.left, at).toBeGreaterThanOrEqual(MARGIN - 0.5);
          expect(m.right, at).toBeLessThanOrEqual(width - MARGIN + 0.5);
          expect(m.titleOverflow, at).toBeLessThanOrEqual(0);
          expect(m.pageOverflow, at).toBeLessThanOrEqual(0);
          await expectPortraitFooter(page, s);
          await page.keyboard.press("ArrowRight");
        }
      }
      expect(errors).toEqual([]);
    });
  }

  for (const [width, height] of [
    [844, 390],
    [1440, 900],
  ] as const) {
    test(`${width}×${height} landscape keeps the footer and the 16:9 title`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      // A title-only slide.
      expect(TITLED, "a title-only slide with a section").toBeGreaterThan(0);
      const slide = slides[TITLED - 1];
      await openDeck(page, `?s=${TITLED}`);
      await expectLandscapeFooter(page, sectionLabel(slide, langs[0]), TITLED);
      // The 16:9 title: its units of the slide's stage (below the top bar,
      // where the bar shows).
      const m = await measureTitle(page);
      expect(m.stageWidth).toBeCloseTo(width, 0);
      expect(m.fontSize).toBeCloseTo(unitOf(m) * titleUnits[slide.kind], 0);
    });
  }

  test("rotating keeps the slide and switches the layout with no reload", async ({
    page,
  }) => {
    const errors = watchConsole(page);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(TITLED, "a title-only slide with a section").toBeGreaterThan(0);
    const slide = slides[TITLED - 1];
    await openDeck(page, `?s=${TITLED}`);
    await page.evaluate(() => Object.assign(window, { __sameDocument: true }));
    const heading = page
      .locator("main:not([aria-hidden])")
      .getByRole("heading", { name: slide.title[langs[0]] });
    await expect(heading).toBeVisible();
    await expectPortraitFooter(page, TITLED);
    const portraitSize = (await measureTitle(page)).fontSize;

    await page.setViewportSize({ width: 844, height: 390 });
    await expectLandscapeFooter(page, sectionLabel(slide, langs[0]), TITLED);
    await expect(heading).toBeVisible();
    const landscape = await measureTitle(page);
    expect(landscape.fontSize).toBeCloseTo(
      unitOf(landscape) * titleUnits[slide.kind],
      0,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await expectPortraitFooter(page, TITLED);
    expect((await measureTitle(page)).fontSize).toBeCloseTo(portraitSize, 1);
    await expect(page).toHaveURL(new RegExp(`s=${TITLED}(?!\\d)`));
    expect(
      await page.evaluate(
        () => (window as { __sameDocument?: boolean }).__sameDocument,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
});

const card = (page: Page) => page.locator("[data-menu-card]");
const cardBox = (page: Page) =>
  card(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
const clipping = (page: Page) =>
  card(page).evaluate((el) =>
    el
      .getAnimations()
      .some((animation) =>
        (animation.effect as KeyframeEffect | null)
          ?.getKeyframes()
          .some((frame) => "clipPath" in frame),
      ),
  );

test.describe("the menu on a phone", () => {
  test("390×844: the popup spans the width, Expand fills the screen at 12", async ({
    page,
  }) => {
    const errors = watchConsole(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openDeck(page, "?s=3");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await expect.poll(() => clipping(page)).toBe(false);
    const popup = await cardBox(page);
    expect(Math.abs(popup.width - (390 - 2 * EDGE))).toBeLessThanOrEqual(1);
    expect(Math.abs(popup.left - EDGE)).toBeLessThanOrEqual(1);
    // Its bottom stays on the menu button's, as in landscape.
    const button = (await page
      .getByRole("button", { name: "Menu", exact: true })
      .boundingBox())!;
    expect(
      Math.abs(popup.top + popup.height - (button.y + button.height)),
    ).toBeLessThanOrEqual(1);

    // Expand, sampled per frame: monotonic, never narrower than the popup.
    await page.evaluate(() => {
      const w = window as unknown as { __boxes: DOMRect[]; __on: boolean };
      w.__boxes = [];
      w.__on = true;
      const tick = () => {
        const el = document.querySelector("[data-menu-card]");
        if (el) w.__boxes.push(el.getBoundingClientRect());
        if (w.__on) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await card(page).getByRole("button", { name: "Expand" }).click();
    await expect
      .poll(async () => (await cardBox(page)).top)
      .toBeCloseTo(EDGE, 0);
    await page.waitForTimeout(400);
    const frames = await page.evaluate(() => {
      const w = window as unknown as {
        __boxes: { left: number; top: number; width: number; height: number }[];
        __on: boolean;
      };
      w.__on = false;
      return w.__boxes.map(({ left, top, width, height }) => ({
        left,
        top,
        width,
        height,
      }));
    });
    expect(
      frames.filter((f) => f.top > EDGE + 0.5 && f.top < popup.top - 0.5)
        .length,
    ).toBeGreaterThanOrEqual(1);
    frames.forEach((frame, i) => {
      const at = `expand frame ${i}: ${JSON.stringify(frame)}`;
      expect(frame.width, at).toBeGreaterThanOrEqual(popup.width - 0.5);
      const before = frames[i - 1];
      if (!before) return;
      expect(frame.width - before.width, at).toBeGreaterThan(-0.5);
      expect(frame.height - before.height, at).toBeGreaterThan(-0.5);
      expect(before.top - frame.top, at).toBeGreaterThan(-0.5);
    });
    const rest = frames.at(-1)!;
    expect(Math.abs(rest.left - EDGE)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(rest.top - EDGE)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(rest.width - (390 - 2 * EDGE))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(rest.height - (844 - 2 * EDGE))).toBeLessThanOrEqual(0.5);
    expect(errors).toEqual([]);
  });

  test("turning the phone re-places the open card", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "?s=3");
    await page.keyboard.press("m");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await expect
      .poll(async () => (await cardBox(page)).width)
      .toBeCloseTo(390 - 2 * EDGE, 0);

    // Landscape: the popup, 560 at most, 16 from the left.
    await page.setViewportSize({ width: 844, height: 390 });
    const button = (await page
      .getByRole("button", { name: "Menu", exact: true })
      .boundingBox())!;
    const side = 844 - button.x - button.width;
    await expect
      .poll(async () => (await cardBox(page)).width)
      .toBeCloseTo(Math.min(560, 844 - side - 16), 0);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(async () => (await cardBox(page)).width)
      .toBeCloseTo(390 - 2 * EDGE, 0);
    await page.keyboard.press("o");
    await expect
      .poll(async () => cardBox(page))
      .toEqual({
        left: EDGE,
        top: EDGE,
        width: 390 - 2 * EDGE,
        height: 844 - 2 * EDGE,
      });
    // Landscape expanded keeps the inset of 40.
    await page.setViewportSize({ width: 844, height: 390 });
    await expect
      .poll(async () => cardBox(page))
      .toEqual({ left: 40, top: 40, width: 844 - 80, height: 390 - 80 });
  });

  test("no Fullscreen control where the browser cannot go fullscreen", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(Document.prototype, "fullscreenEnabled", {
        configurable: true,
        get: () => false,
      }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await openDeck(page, "?s=3");
    await page.keyboard.press("m");
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: /Next/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Fullscreen/ })).toHaveCount(
      0,
    );
  });

  test("the Fullscreen control stays where the browser can", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDeck(page, "?s=3");
    expect(await page.evaluate(() => document.fullscreenEnabled)).toBe(true);
    await page.keyboard.press("m");
    await expect(
      page
        .getByRole("dialog", { name: "Menu" })
        .getByRole("button", { name: /Fullscreen/ }),
    ).toBeVisible();
  });
});

test.describe("no key hints on a touch screen", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("the popup and the overview draw no key hint", async ({ page }) => {
    await openDeck(page, "?s=3");
    expect(
      await page.evaluate(
        () => matchMedia("(hover: none) and (pointer: coarse)").matches,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Menu", exact: true }).tap();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    const hints = card(page).locator("kbd");
    // The hints are there for a keyboard, and none is drawn.
    expect(await hints.count()).toBeGreaterThan(0);
    for (const hint of await hints.all()) await expect(hint).toBeHidden();
    await menu.getByRole("button", { name: "Expand" }).tap();
    await expect(page.getByRole("dialog", { name: "Overview" })).toBeVisible();
    expect(await hints.count()).toBeGreaterThan(0);
    for (const hint of await hints.all()) await expect(hint).toBeHidden();
  });
});

test.describe("home-screen fullscreen", () => {
  test("the manifest and icons are served", async ({ playwright, baseURL }) => {
    const locked = await playwright.request.newContext({ baseURL });
    const response = await locked.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.name).toMatch(/\S/);
    expect(manifest.short_name).toMatch(/\S/);
    expect(manifest.start_url).toBe("/");
    expect(manifest.background_color).toBe("#000002");
    expect(manifest.theme_color).toBe("#000002");
    for (const icon of manifest.icons ?? []) {
      const image = await locked.get(icon.src);
      expect(image.status(), icon.src).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/png");
    }
    await locked.dispose();
  });

  test("the page links the manifest and has the Apple web-app tags", async ({
    page,
  }) => {
    await page.goto("/?intro=off");
    const head = page.locator("head");
    await expect(head.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /\/manifest\.webmanifest/,
    );
    await expect(
      head.locator('meta[name="apple-mobile-web-app-capable"]'),
    ).toHaveAttribute("content", "yes");
    await expect(
      head.locator('meta[name="mobile-web-app-capable"]'),
    ).toHaveAttribute("content", "yes");
    await expect(
      head.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
    ).toHaveAttribute("content", "black-translucent");
    await expect(
      head.locator('meta[name="apple-mobile-web-app-title"]'),
    ).toHaveAttribute("content", /\S/);
  });
});
