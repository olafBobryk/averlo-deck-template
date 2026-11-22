import { expect, test, type Page } from "@playwright/test";
import { langs } from "../src/deck/langs";
import { pdfHref, sectionLabel } from "../src/deck/model";
import { slides } from "../src/deck/slides";
import { progressFillPosition } from "../src/questionnaire/progress-model";
import { evidence } from "./evidence";

// User Story 1, presenting the deck. Runs at 390
// and 1440 against the local production build.

// The placeholder deck (src/deck/slides.ts) is the deck, in /print and the
// PDFs too. Its slides are told apart by position, not by title.
const TOTAL = slides.length;
const PRINT_TOTAL = slides.length;
const lang = langs[0];
const title = (n: number) => slides[n - 1].title[lang];
/** The first slide with a section, as the footer names it. */
const sectioned = slides.findIndex((slide) => slide.section) + 1;
const pad = (n: number) => String(n).padStart(2, "0");

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function unlock(page: Page) {
  // No key: mark the intro as played this session, so the
  // deck opens straight away as on a repeat visit.
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
}

/** Open the deck at slide `s` and wait until the hard-load screen has lifted
    and the page has arrived, so a step runs on the real motion tokens. */
async function openDeck(page: Page, query: string) {
  await unlock(page);
  await page.goto(`/?${query.replace(/^\?/, "")}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
}

type Frame = {
  t: number;
  /** The 0-based index of the slide whose heading section is sampled. */
  index: number | null;
  x: number | null;
  opacity: number | null;
  oldX: number | null;
  oldOpacity: number | null;
  progress: number | null;
  filtered: string[];
  dimmed: string[];
};

/** Press `key` and sample every frame for `ms`: the entering section's x and
    opacity, the leaving snapshot's x and opacity, the progress bar's real
    width, and any element with a filter or a dimmed ancestor. */
async function sampleStep(page: Page, key: string, ms = 900) {
  await page.evaluate((ms) => {
    const w = window as unknown as {
      __frames: Frame[];
      __sampled: boolean;
    };
    w.__frames = [];
    w.__sampled = false;
    // The top bar's resting opacities, before the step: its surface waits
    // for a scroll and its mound's label for a hover, at 0. Holding them is
    // not dimming; changing them during the step would be.
    const rest = new Map(
      [...document.querySelectorAll<HTMLElement>(".aq *")].map((element) => [
        element,
        getComputedStyle(element).opacity,
      ]),
    );
    let t0 = -1;
    addEventListener("keydown", () => (t0 = performance.now()), {
      capture: true,
      once: true,
    });
    const matrixX = (transform: string) =>
      transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
    const tick = () => {
      if (t0 < 0) return void requestAnimationFrame(tick);
      const t = performance.now() - t0;
      // The slide's heading section (its blocks follow as a
      // second, staggered section).
      const section = document.querySelector<HTMLElement>(
        "main [data-kind] > [data-page-section]:first-child",
      );
      const style = section ? getComputedStyle(section) : null;
      const old = document
        .getAnimations()
        .find((animation) =>
          (
            animation.effect as KeyframeEffect | null
          )?.pseudoElement?.startsWith("::view-transition-old"),
        );
      let oldX: number | null = null;
      let oldOpacity: number | null = null;
      if (old) {
        const pseudo = (old.effect as KeyframeEffect).pseudoElement!;
        const oldStyle = getComputedStyle(document.documentElement, pseudo);
        oldX = matrixX(oldStyle.transform);
        oldOpacity = Number(oldStyle.opacity);
      }
      const fill = document.querySelector<HTMLElement>(
        "[data-progress] .progress-track > div",
      );
      const filtered: string[] = [];
      const dimmed: string[] = [];
      const boot = document.getElementById("deck-boot");
      for (const element of document.body.querySelectorAll<HTMLElement>("*")) {
        if (boot?.contains(element)) continue;
        if (element.closest("script, style, noscript")) continue;
        const own = getComputedStyle(element);
        if (own.filter !== "none")
          filtered.push(`${element.tagName}.${element.className}`);
        // Only the entering slide's sections (and what is inside them) may
        // fade: its heading, then its blocks.
        const entering = section?.closest("main");
        if (
          Number(own.opacity) < 1 &&
          !(entering && entering.contains(element)) &&
          own.visibility !== "hidden" &&
          rest.get(element) !== own.opacity
        )
          dimmed.push(`${element.tagName}.${element.className}`);
      }
      w.__frames.push({
        t,
        index: section
          ? Number(section.closest("main")?.dataset.slideIndex)
          : null,
        x: style ? matrixX(style.transform) : null,
        opacity: style ? Number(style.opacity) : null,
        oldX,
        oldOpacity,
        progress: fill ? fill.getBoundingClientRect().width : null,
        filtered,
        dimmed,
      });
      if (t < ms) requestAnimationFrame(tick);
      else w.__sampled = true;
    };
    requestAnimationFrame(tick);
  }, ms);
  await page.keyboard.press(key);
  await page.waitForFunction(
    () => (window as unknown as { __sampled: boolean }).__sampled,
  );
  return page.evaluate(
    () => (window as unknown as { __frames: Frame[] }).__frames,
  );
}

const progressWidth = (page: Page) =>
  page
    .locator("[data-progress] .progress-track > div")
    .evaluate((fill) => fill.getBoundingClientRect().width);

/** The page step, sampled per frame. `target` is the entering slide's
    0-based index. */
async function expectPageStep(
  page: Page,
  key: string,
  target: number,
  sign: 1 | -1,
) {
  const before = await progressWidth(page);
  const frames = await sampleStep(page, key);
  const after = await progressWidth(page);

  // The entering title: from 120px on the end side (forward) or the start
  // side (back), one direction only, to rest at 0; fading in.
  const entering = frames.filter((f) => f.index === target);
  expect(entering.length).toBeGreaterThan(10);
  const xs = entering.map((f) => f.x! * sign);
  expect(xs[0]).toBeGreaterThan(95);
  expect(Math.max(...xs)).toBeLessThanOrEqual(120.5);
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.5);
  for (let i = 1; i < xs.length; i++)
    expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] + 0.01);
  expect(xs.at(-1)).toBeCloseTo(0, 1);
  // Several frames on the way: it slides, it does not jump.
  expect(xs.filter((x) => x > 1 && x < 119).length).toBeGreaterThan(5);
  expect(entering[0].opacity!).toBeLessThan(1);
  expect(entering.at(-1)!.opacity).toBe(1);

  // The leaving snapshot: toward the other side, fading, gone by ~150ms.
  const leaving = frames.filter((f) => f.oldX !== null);
  expect(leaving.length).toBeGreaterThan(2);
  for (const f of leaving) {
    expect(f.oldX! * sign).toBeLessThanOrEqual(0.01);
    expect(f.oldX! * sign).toBeGreaterThanOrEqual(-120.5);
  }
  const oldSpan = leaving.at(-1)!.t - leaving[0].t;
  expect(oldSpan).toBeLessThan(150 + 50);

  // No filter and no dimming anywhere but the entering title's own fade.
  for (const f of frames) {
    expect(f.filtered).toEqual([]);
    expect(f.dimmed).toEqual([]);
  }

  // The progress bar's real width moves one way to its new value, over
  // several frames, never in one jump.
  const widths = frames.map((f) => f.progress!);
  expect(after).not.toBeCloseTo(before, 0);
  const way = Math.sign(after - before);
  expect(widths[0]).toBeCloseTo(before, 0);
  for (let i = 1; i < widths.length; i++)
    expect((widths[i] - widths[i - 1]) * way).toBeGreaterThanOrEqual(-0.01);
  expect(widths.at(-1)).toBeCloseTo(after, 0);
  const steps = widths.slice(1).map((w, i) => Math.abs(w - widths[i]));
  expect(Math.max(...steps)).toBeLessThan(Math.abs(after - before) * 0.6);
  expect(
    widths.filter(
      (w) => Math.abs(w - before) > 0.5 && Math.abs(w - after) > 0.5,
    ).length,
  ).toBeGreaterThan(5);

  evidence(
    `page-step-${sign === 1 ? "forward" : "back"}`,
    frames.map(({ t, x, opacity, oldX, oldOpacity, progress }) => ({
      t,
      enterX: x,
      enterOpacity: opacity,
      leaveX: oldX,
      leaveOpacity: oldOpacity,
      progress,
    })),
  );
  test.info().annotations.push({
    type: `page step ${key}`,
    description: JSON.stringify({
      enterFirstX: entering[0].x,
      enterFrames: entering.length,
      enterSettledMs: Math.round(
        entering.find((f) => Math.abs(f.x!) < 0.5)!.t - entering[0].t,
      ),
      leaveFrames: leaving.length,
      leaveSpanMs: Math.round(oldSpan),
      leaveLastX: leaving.at(-1)!.oldX,
      progress: [before, after],
    }),
  });
}

test.describe("page step", () => {
  test("→ and ← step by the page step, sampled per frame", async ({ page }) => {
    const errors = watchConsole(page);
    await openDeck(page, "?s=2");
    await expectPageStep(page, "ArrowRight", 2, 1);
    await expect(page).toHaveURL(/s=3(?!\d)/);
    await expectPageStep(page, "ArrowLeft", 1, -1);
    await expect(page).toHaveURL(/s=2(?!\d)/);
    expect(errors).toEqual([]);
  });
});

test("every key and click steps as the deck contract says", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await openDeck(page, "?s=1");
  // The slide shown: its position, and its title as its heading.
  const shown = async (n: number) => {
    const main = page.locator("main:not([aria-hidden])");
    await expect(main).toHaveAttribute("aria-label", `${n} / ${TOTAL}`);
    await expect(
      main.getByRole("heading", { name: title(n), exact: true }),
    ).toBeVisible();
  };
  for (const key of ["ArrowRight", "ArrowDown", "Space", "PageDown"]) {
    await page.keyboard.press(key);
  }
  await expect(page).toHaveURL(/s=5(?!\d)/);
  await shown(5);
  for (const key of ["ArrowLeft", "ArrowUp", "Shift+Space", "PageUp"]) {
    await page.keyboard.press(key);
  }
  await expect(page).toHaveURL(/s=1(?!\d)/);
  await shown(1);
  await page.keyboard.press("End");
  await expect(page).toHaveURL(new RegExp(`s=${TOTAL}(?!\\d)`));
  await shown(TOTAL);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp(`s=${TOTAL}(?!\\d)`));
  await page.keyboard.press("Home");
  await expect(page).toHaveURL(/s=1(?!\d)/);
  await shown(1);

  // Click the right three quarters for next, the left quarter for previous.
  const size = page.viewportSize()!;
  await page.mouse.click(size.width * 0.3, size.height * 0.4);
  await expect(page).toHaveURL(/s=2(?!\d)/);
  await page.mouse.click(size.width * 0.2, size.height * 0.4);
  await expect(page).toHaveURL(/s=1(?!\d)/);

  // Rapid presses land on the right slide.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/s=4(?!\d)/);
  await shown(4);

  // L is not a key any more; language lives in the menu.
  await page.keyboard.press("l");
  await expect(page).not.toHaveURL(/lang=/);

  // While the menu is open (MenuCard sets data-menu), slide keys do nothing.
  await page.evaluate(() => (document.documentElement.dataset.menu = "popup"));
  await page.keyboard.press("ArrowRight");
  await page.mouse.click(size.width * 0.8, size.height * 0.4);
  await expect(page).toHaveURL(/s=4(?!\d)/);
  await page.evaluate(() => delete document.documentElement.dataset.menu);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/s=5(?!\d)/);
  expect(errors).toEqual([]);
});

test("F enters and leaves fullscreen", async ({ page }) => {
  await openDeck(page, "?s=1");
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press("f");
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
});

test("a shared link opens its slide; steps keep it", async ({ page }) => {
  await openDeck(page, "?s=3");
  const main = page.locator("main:not([aria-hidden])");
  await expect(main).toHaveAttribute("aria-label", `3 / ${TOTAL}`);
  await expect(main.getByRole("heading", { name: title(3) })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/s=4(?!\d)/);
  await expect(main).toHaveAttribute("aria-label", `4 / ${TOTAL}`);
  // Out of range clamps; an unknown language is the first one.
  await page.goto("/?s=99&lang=xx");
  await expect(main).toHaveAttribute("aria-label", `${TOTAL} / ${TOTAL}`);
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
});

test.describe("footer", () => {
  test("section label, slide number and progress", async ({ page }) => {
    // The full row is landscape's; portrait keeps the number and Menu only
    // (tests/portrait.spec.ts), so the phone is turned here.
    const size = page.viewportSize()!;
    if (size.width < size.height)
      await page.setViewportSize({ width: size.height, height: size.width });
    await openDeck(page, `?s=${sectioned}`);
    const footer = page.getByRole("contentinfo");
    const label = sectionLabel(slides[sectioned - 1], lang);
    const number = `${pad(sectioned)} / ${pad(TOTAL)}`;
    // The section label: the row's first part (no wordmark: "no branding
    // in the footer").
    const first = footer
      .locator(":scope > div")
      .first()
      .locator(":scope > *")
      .first();
    await expect(first).toBeVisible();
    await expect(first).toHaveText(label);
    await expect(footer.getByText(number)).toBeVisible();
    await expect(footer.locator("[data-footer-menu]")).toHaveCount(1);
    // One row: label and number share a line.
    const tops = await Promise.all(
      [first, footer.getByText(number)].map(async (part) => {
        const box = (await part.boundingBox())!;
        return box.y + box.height / 2;
      }),
    );
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(4);
    // The navigator under the row, its fill at its share of the track, as
    // the questionnaire's model places it.
    const track = (await page
      .locator("[data-progress] .progress-track")
      .boundingBox())!;
    const fill = (await page
      .locator("[data-progress] .progress-track > div")
      .boundingBox())!;
    expect(fill.width).toBeCloseTo(
      progressFillPosition((sectioned / TOTAL) * 100, track.width, TOTAL),
      0,
    );
    const counter = (await footer.getByText(number).boundingBox())!;
    expect(track.y).toBeGreaterThan(counter.y + counter.height - 1);
    await page.keyboard.press("Home");
    await expect(footer.getByText(`01 / ${pad(TOTAL)}`)).toBeVisible();
  });

  test("the footer's menu slot holds MenuCard's Menu button", async ({
    page,
  }) => {
    await openDeck(page, "?s=2");
    await expect(
      page
        .getByRole("contentinfo")
        .locator("[data-footer-menu]")
        .getByRole("button", { name: "Menu" }),
    ).toBeVisible();
  });
});

test.describe("hard load", () => {
  test("shows the hard-load screen, lifts within 3 s, no entrance motion", async ({
    page,
  }) => {
    await unlock(page);
    await page.addInitScript(() => {
      const w = window as unknown as {
        __load: {
          t: number;
          arriving: boolean;
          boot: string | null;
          x: number | null;
          opacity: number | null;
        }[];
      };
      w.__load = [];
      const tick = () => {
        const section = document.querySelector<HTMLElement>(
          "main [data-kind] > [data-page-section]:first-child",
        );
        const style = section ? getComputedStyle(section) : null;
        w.__load.push({
          t: performance.now(),
          arriving: document.documentElement.hasAttribute("data-arriving"),
          boot: document.getElementById("deck-boot")?.dataset.state ?? null,
          x: style
            ? style.transform === "none"
              ? 0
              : new DOMMatrixReadOnly(style.transform).m41
            : null,
          opacity: style ? Number(style.opacity) : null,
        });
        if (performance.now() < 5000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/?s=2");
    await page.waitForFunction(() => performance.now() > 4500, undefined, {
      timeout: 10_000,
    });
    const frames = await page.evaluate(
      () =>
        (
          window as unknown as {
            __load: {
              t: number;
              arriving: boolean;
              boot: string | null;
              x: number | null;
              opacity: number | null;
            }[];
          }
        ).__load,
    );
    expect(frames[0].arriving).toBe(true);
    expect(frames[0].boot).toBe("loading");
    const done = frames.find((f) => f.boot === "done");
    expect(done).toBeDefined();
    expect(done!.t).toBeLessThan(3000);
    const drawn = frames.filter((f) => f.x !== null);
    expect(drawn[0].arriving).toBe(true);
    for (const f of drawn) {
      expect(f.x).toBe(0);
      expect(f.opacity).toBe(1);
    }
    await expect(
      page
        .locator("main:not([aria-hidden])")
        .getByRole("heading", { name: title(2) }),
    ).toBeVisible();
    // The placeholder mark stands where the orb was: an image the boot
    // script waits on, and no video.
    await expect(page.locator("#deck-boot img")).toHaveCount(1);
    await expect(page.locator("#deck-boot video")).toHaveCount(0);
  });

  test("/print renders no hard-load screen", async ({ page }) => {
    await unlock(page);
    await page.goto(`/print?lang=${lang}`);
    await expect(
      page.getByText(title(2), { exact: true }).first(),
    ).toBeVisible();
    expect(await page.locator("#deck-boot").count()).toBe(0);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("slides change with no intermediate frames", async ({ page }) => {
    await openDeck(page, "?s=2");
    const before = await progressWidth(page);
    const frames = await sampleStep(page, "ArrowRight", 600);
    const after = await progressWidth(page);
    await expect(page).toHaveURL(/s=3(?!\d)/);
    const entering = frames.filter((f) => f.index === 2);
    expect(entering.length).toBeGreaterThan(0);
    for (const f of entering) {
      expect(f.x).toBe(0);
      expect(f.opacity).toBe(1);
    }
    for (const f of frames) {
      if (f.oldOpacity !== null) expect(f.oldOpacity).toBe(0);
      const w = f.progress!;
      expect(Math.abs(w - before) < 0.5 || Math.abs(w - after) < 0.5).toBe(
        true,
      );
    }
  });
});

test("print renders every slide and the footer, with no menu", async ({
  page,
}) => {
  await unlock(page);
  await page.goto(`/print?lang=${lang}`);
  const pages = page.locator("[data-print-page]");
  await expect(pages).toHaveCount(PRINT_TOTAL);
  const box = (await pages.first().boundingBox())!;
  expect(box.width).toBe(1920);
  expect(box.height).toBe(1080);
  // The first slide with a section: the footer names its part.
  await expect(
    pages
      .nth(sectioned - 1)
      .getByText(sectionLabel(slides[sectioned - 1], lang), { exact: true }),
  ).toBeVisible();
  await expect(
    pages
      .nth(sectioned - 1)
      .getByText(`${pad(sectioned)} / ${pad(PRINT_TOTAL)}`),
  ).toBeVisible();
  expect(await page.locator("[data-footer-menu]").count()).toBe(0);
  expect(await page.locator("video").count()).toBe(0);
  // The build rendered every language's PDF, one page per slide.
  for (const lang of langs) {
    const pdf = await page.request.get(pdfHref(lang));
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    const pageCount = (
      (await pdf.body()).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []
    ).length;
    expect(pageCount).toBe(PRINT_TOTAL);
  }
});
