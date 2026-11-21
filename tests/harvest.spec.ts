import { expect, test, type Page } from "@playwright/test";
import { slideContent, type Block } from "../src/deck/content";
import { langs } from "../src/deck/langs";
import { slides } from "../src/deck/slides";

// Single tests kept from origin specs that are otherwise not carried (their
// origin is listed in docs/carried/tests.md): the square window's 16:9
// slide, glass cards fading on their own glass, the centre layout's one
// vertical axis, the print page count and `**bold**` key phrases. Each finds
// its placeholder slide in the data.

const current = (page: Page) => page.locator("main:not([aria-hidden])");
const lang = langs[0];

/** A block that holds glass cards (SlideBody's `holdsGlass`, for the blocks
 *  the template keeps). */
const holdsGlass = (block: Block) =>
  block.type === "facts" ||
  block.type === "org" ||
  block.type === "fork" ||
  block.type === "week" ||
  (block.type === "points" && (block.style ?? "cards") !== "numbered");

/** The first slide (1-based) whose content matches, or 0. */
const first = (match: (id: string) => boolean, from = 0) =>
  slides.findIndex((slide, i) => i >= from && match(slide.id)) + 1;

// ---------- From the review spec ----------

async function openDeck(page: Page, query: string) {
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

test("a square window keeps the 16:9 slide; the phone reflow is for narrow screens", async ({
  page,
}) => {
  const s = first((id) => Boolean(slideContent(id).headline));
  expect(s, "a slide with a headline").toBeGreaterThan(0);
  await page.setViewportSize({ width: 1000, height: 1000 });
  await openDeck(page, `?s=${s}`);
  // The landscape footer: wordmark (the row's first part) and section label
  // shown.
  await expect(
    page
      .getByRole("contentinfo")
      .locator(":scope > div")
      .first()
      .locator(":scope > *")
      .first(),
  ).toBeVisible();
  const box = await current(page)
    .locator("[data-kind]")
    .evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight }));
  expect(box.sh).toBeLessThanOrEqual(box.ch + 1);
});

test("glass cards fade on their own glass as the slide enters", async ({
  page,
}) => {
  // A slide after the first that holds glass cards: the step onto it is
  // measured.
  const glass = first((id) => slideContent(id).blocks.some(holdsGlass), 1);
  expect(glass, "a slide after the first holding glass cards").toBeGreaterThan(
    1,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openDeck(page, `?s=${glass - 1}`);
  const low = await page.evaluate(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    let worst = 1;
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const tick = () => {
        for (const glass of document.querySelectorAll<HTMLElement>(
          "main [data-slide-body] *",
        )) {
          if (getComputedStyle(glass).backdropFilter === "none") continue;
          for (
            let a = glass.parentElement;
            a && a.tagName !== "MAIN";
            a = a.parentElement
          )
            worst = Math.min(worst, Number(getComputedStyle(a).opacity));
        }
        if (performance.now() - t0 < 900) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return worst;
  });
  await expect(page).toHaveURL(new RegExp(`s=${glass}(?!\\d)`));
  expect(low).toBe(1);
});

// ---------- From the layout fixes spec ----------

type Size = { width: number; height: number };
const desk: Size = { width: 1440, height: 900 };
const square: Size = { width: 1000, height: 1000 };
const phone: Size = { width: 390, height: 844 };
const name = (s: Size) => `${s.width}x${s.height}`;

async function openSized(page: Page, size: Size, query: string) {
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  const q = query.replace(/^\?/, "");
  await page.goto(`/?${q}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
  await settle(page);
}

/** Waits until the current slide's boxes stop moving (fonts, entrances). */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const read = () =>
      JSON.stringify(
        [
          ...document.querySelectorAll(
            "main:not([aria-hidden]) [data-kind], main:not([aria-hidden]) [data-kind] *",
          ),
        ].map((e) => {
          const r = e.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10));
        }),
      );
    const frame = () =>
      new Promise((done) => setTimeout(() => requestAnimationFrame(done), 120));
    let last = read();
    for (let i = 0; i < 40; i++) {
      await frame();
      const now = read();
      if (now === last) return;
      last = now;
    }
  });
}

test.describe("centre layout: one vertical axis", () => {
  const centred = slides
    .map((slide, i) => ({ slide, at: i + 1 }))
    .filter(({ slide }) => {
      const content = slideContent(slide.id);
      return content.headline && content.layout === "center";
    });

  test("the deck has a centred slide", () => {
    expect(centred.length).toBeGreaterThan(0);
  });

  for (const { slide, at } of centred)
    for (const lang of langs)
      test(`slide ${at} in ${lang}: title, headline and lead share the slide's centre`, async ({
        page,
      }, info) => {
        test.skip(info.project.name !== "desktop", "sizes itself; runs once");
        const lead = slideContent(slide.id).blocks.some(
          (b) => b.type === "lead",
        );
        for (const size of [desk, square, phone]) {
          await openSized(page, size, `?s=${at}&lang=${lang}`);
          const r = await current(page)
            .locator("[data-kind]")
            .evaluate((slide) => {
              const s = slide.getBoundingClientRect();
              const mid = s.left + s.width / 2;
              // Text by its ink (the range over its contents).
              const ink = (e: Element) => {
                const range = document.createRange();
                range.selectNodeContents(e);
                const r = range.getBoundingClientRect();
                return r.left + r.width / 2;
              };
              const parts: [string, number][] = [];
              const head = slide.firstElementChild!;
              const title = head.querySelector("h1");
              if (title) parts.push(["title", ink(title)]);
              const headline = head.querySelector(
                "[data-variant='display']:not(h1)",
              );
              if (headline) parts.push(["headline", ink(headline)]);
              for (const lead of slide.querySelectorAll('[data-block="lead"]'))
                parts.push(["lead", ink(lead)]);
              return {
                layout: slide.getAttribute("data-layout"),
                off: parts.map(([n, x]) => [
                  n,
                  Math.round((x - mid) * 10) / 10,
                ]),
              };
            });
          expect(r.layout).toBe("center");
          const names = r.off.map(([n]) => n);
          expect(names, name(size)).toEqual(
            expect.arrayContaining([
              "title",
              "headline",
              ...(lead ? ["lead"] : []),
            ]),
          );
          for (const [part, off] of r.off)
            expect(
              Math.abs(off as number),
              `${name(size)} ${part}: px off the slide's centre`,
            ).toBeLessThanOrEqual(1);
        }
      });
});

// ---------- From the text deck spec ----------

const pad = (n: number) => String(n).padStart(2, "0");

test("/print renders the deck: one page per slide", async ({ page }) => {
  for (const lang of langs) {
    await page.goto(`/print?lang=${lang}`);
    const pages = page.locator("[data-print-page]");
    await expect(pages).toHaveCount(slides.length);
    await expect(pages.last()).toContainText(
      `${pad(slides.length)} / ${pad(slides.length)}`,
    );
  }
});

test("bold key phrases render, words unchanged", async ({ page }) => {
  // The first slide whose body marks a key phrase as **bold**.
  const index = first((id) =>
    JSON.stringify(slideContent(id).blocks).includes("**"),
  );
  expect(index, "a slide with a **bold** key phrase").toBeGreaterThan(0);
  for (const lang of langs) {
    await openDeck(page, `?s=${index}&lang=${lang}`);
    const strong = current(page).locator("[data-slide-body] strong");
    expect(await strong.count()).toBeGreaterThan(0);
    await expect(current(page).locator("[data-kind]")).not.toContainText("**");
    expect(
      await strong.first().evaluate((el) => getComputedStyle(el).fontWeight),
    ).toBe("600");
  }
  // Still in print, bold too.
  await page.goto(`/print?lang=${lang}`);
  const printed = page.locator("[data-print-page]").nth(index - 1);
  expect(await printed.locator("strong").count()).toBeGreaterThan(0);
});
