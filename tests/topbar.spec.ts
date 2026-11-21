import {
  expect,
  test,
  type Browser,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { slides } from "../src/deck/slides";
import {
  buildReference,
  findReference,
  serveReference,
} from "./fixtures/questionnaire-top";

// The top bar (User Story 2, scenario 3; FR-005, FR-012, FR-013; T028).
// Runs at 390 and 1440 (the two projects) against the local production build.
//
// The bar is the questionnaire's whole top, ported as it is (research R4):
// its header band (`header.top[data-site-header]`: brand on the left,
// controls on the right), its step label (`.topline`, without the Review
// button) and its progress navigator (`.inline-progress >
// .progress-navigator`), inside a template-owned `.aq` wrapper that sets the
// `--aq-*` variables and `--font-sf-pro: var(--font-inter)` inline.
//
// Parity reference: tests/fixtures/questionnaire-top.ts builds the
// questionnaire's own runtime from its clone under PORT_SOURCES_DIR (at the
// commit the manifest pins, else the clone's HEAD) into the ignored
// .local/questionnaire-top/, as a static page with the same font override and
// as many steps as the deck has slides, and serves it from this process on
// REFERENCE_PORT (default 3195, plus the worker's parallel index). Without the
// clone those tests are skipped as "not run", as check:ports is. Parity is
// checked three ways, each against the reference at the same viewport and
// step, with reduced motion so nothing is mid-spring:
//   - DOM: the same elements, classes, roles and attribute names for the
//     header band, the step label and the navigator (text and aria values
//     may differ; the header's right-hand controls and the Review caption
//     are left out, as the deck has neither the save chip nor Review);
//   - boxes: the same position and size for every part whose size does not
//     follow its text;
//   - pixels: the top, from the page's top edge to the navigator's track,
//     with the text-bearing parts hidden in both, within a small tolerance.

const TOTAL = slides.length;
const reference = findReference();

/** Open the deck at `query` with the intro already played this session, and
 *  wait until the hard-load screen has lifted and the page has arrived. */
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

const slideParam = (page: Page) => new URL(page.url()).searchParams.get("s");

/** The live slide is slide `n` (1-based), alone, and the URL says so. */
async function expectSlide(page: Page, n: number) {
  await expect.poll(() => slideParam(page)).toBe(String(n));
  await expect(page.locator("main[data-slide-index]")).toHaveCount(1);
  await expect(
    page.locator(`main[data-slide-index="${n - 1}"]:not([aria-hidden])`),
  ).toHaveCount(1);
}

/** The bar's parts, in the deck and in the reference alike. */
const bar = {
  header: "header.top[data-site-header]",
  navigator: ".aq .inline-progress .progress-navigator",
  track: ".aq .inline-progress .progress-track",
  moundButton: ".aq .progress-mound-button",
  label: ".aq .topline .progress-caption-step small",
};

/** The x of step `step`'s middle on the navigator's track. */
async function stepX(page: Page, step: number, total: number) {
  const navigator = page.locator(bar.navigator);
  await expect(navigator, "the progress navigator").toBeVisible();
  const box = (await navigator.boundingBox())!;
  return { x: box.x + (box.width * (step - 0.5)) / total, top: box.y };
}

/** A pointer press on the step track: move over step `step`, wait for the
 *  mound to rise and name that step, then press it. */
async function pressTrack(page: Page, step: number, total: number) {
  const { x, top } = await stepX(page, step, total);
  await page.mouse.move(x, top + 1, { steps: 4 });
  await page.waitForFunction(
    ([selector, label]) => {
      const button = document.querySelector<HTMLButtonElement>(selector);
      return !!button && !button.disabled && button.textContent === label;
    },
    [bar.moundButton, String(step)] as const,
  );
  await page.locator(bar.moundButton).click();
}

/** A finger drag along the step track from step `from` to step `to`, through
 *  Chromium's touch input (the navigator's touch zone shows on a coarse
 *  pointer, so the page must be in a `hasTouch` context). */
async function dragTrack(page: Page, from: number, to: number, total: number) {
  const a = await stepX(page, from, total);
  const b = await stepX(page, to, total);
  const y = a.top + 10;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: a.x, y }],
  });
  for (let i = 1; i <= 8; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 8, y }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

// ---------------------------------------------------------------- the bar ---

test("the bar spans the full width at the top of every slide, with the stage below it", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDeck(page, "s=1");
  for (let n = 1; n <= TOTAL; n++) {
    if (n > 1) await page.keyboard.press("ArrowRight");
    await expectSlide(page, n);
    const header = page.locator(bar.header);
    await expect(header, `slide ${n}: the header band`).toHaveCount(1);
    await expect(header).toBeVisible();
    const layout = await page.evaluate((selectors) => {
      const header = document.querySelector(selectors.header)!;
      const wrapper = header.closest(".aq");
      const track = document.querySelector(selectors.track);
      const slide = document.querySelector("main:not([aria-hidden])")!;
      const h = header.getBoundingClientRect();
      const t = track?.getBoundingClientRect();
      const hit = document.elementFromPoint(innerWidth / 2, h.top + 2);
      return {
        viewport: innerWidth,
        wrapped: !!wrapper,
        header: { left: h.left, top: h.top, width: h.width, bottom: h.bottom },
        trackBottom: t ? t.bottom : null,
        slideTop: slide.getBoundingClientRect().top,
        onTop: !!hit && !!wrapper?.contains(hit),
      };
    }, bar);
    expect(layout.wrapped, `slide ${n}: the bar is inside .aq`).toBe(true);
    expect(layout.header.left, `slide ${n}: left edge`).toBeCloseTo(0, 0);
    expect(layout.header.top, `slide ${n}: top edge`).toBeCloseTo(0, 0);
    expect(layout.header.width, `slide ${n}: full width`).toBeCloseTo(
      layout.viewport,
      0,
    );
    expect(layout.onTop, `slide ${n}: nothing covers the bar`).toBe(true);
    expect(layout.trackBottom, `slide ${n}: the navigator`).not.toBeNull();
    const bottom = Math.max(layout.header.bottom, layout.trackBottom!);
    expect(
      layout.slideTop,
      `slide ${n}: the stage starts below the bar (${bottom} px)`,
    ).toBeGreaterThanOrEqual(bottom - 0.5);
  }
});

// ---------------------------------------------------------- the navigator ---

test("pressing the navigator's step track jumps to that slide, and ?s= follows", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDeck(page, "s=1");
  const forward = Math.ceil(TOTAL / 2) + 1;
  const back = 2;
  await pressTrack(page, forward, TOTAL);
  await expectSlide(page, forward);
  await pressTrack(page, back, TOTAL);
  await expectSlide(page, back);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("dragging the navigator's step track jumps to the slide where it lets go, and ?s= follows", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    const to = TOTAL - 1;
    await dragTrack(page, 2, to, TOTAL);
    await expectSlide(page, to);
    await dragTrack(page, to, 3, TOTAL);
    await expectSlide(page, 3);
  });
});

test("the step label takes a slide number and jumps to it", async ({
  page,
}) => {
  await openDeck(page, "s=1");
  const to = TOTAL - 2;
  const button = page.locator(`${bar.label} .step-jump-button`);
  await expect(button, "the step label's button").toBeVisible();
  await button.click();
  const input = page.locator(`${bar.label} .step-jump-input`);
  await expect(input).toBeFocused();
  await input.fill(String(to));
  await input.press("Enter");
  await expectSlide(page, to);
  await expect(page.locator(bar.label)).toHaveText(`${to} / ${TOTAL}`);
});

// ------------------------------------------------------------- the footer ---

test("the footer keeps its progress indicator and parts, with no divider line", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const n = 3;
  await openDeck(page, `s=${n}`);
  const footer = page.locator("footer:has([data-progress])");
  await expect(footer).toHaveCount(1);
  const progress = footer.locator("[data-progress]");
  const fill = footer.locator("[data-progress-fill]");
  await expect(progress).toBeVisible();
  await expect(fill).toBeVisible();
  await expect(progress).toHaveAttribute("aria-valuenow", String(n));
  const pad = (k: number) => String(k).padStart(2, "0");
  await expect(footer.getByText(`${pad(n)} / ${pad(TOTAL)}`)).toBeVisible();
  await expect(footer.locator("[data-footer-menu] button")).toBeVisible();
  const ratio = await page.evaluate(() => {
    const bar = document.querySelector("footer [data-progress]")!;
    const fill = document.querySelector("footer [data-progress-fill]")!;
    return (
      fill.getBoundingClientRect().width / bar.getBoundingClientRect().width
    );
  });
  expect(ratio, "the fill follows the slide").toBeCloseTo(n / TOTAL, 2);

  // No divider: nothing draws a line along the top of the footer, between the
  // stage and the footer row. The progress bar is the only full-width line
  // the footer keeps, at its bottom edge.
  const lines = await page.evaluate(() => {
    const footer = document.querySelector("footer:has([data-progress])")!;
    const progress = footer.querySelector("[data-progress]")!;
    const top = footer.getBoundingClientRect().top;
    const width = innerWidth;
    const found: string[] = [];
    const name = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/).join(".")}` : ""}`;
    const clear = (color: string) =>
      color === "transparent" || /rgba\(.*,\s*0\)$/.test(color);
    // Borders, shadows and drawn pseudo-elements on the footer and its rows.
    for (const el of [footer, ...footer.children]) {
      if (el === progress) continue;
      for (const pseudo of [null, "::before", "::after"] as const) {
        const style = getComputedStyle(el, pseudo);
        if (pseudo && (style.content === "none" || style.content === "normal"))
          continue;
        for (const side of ["Top", "Bottom"] as const) {
          const w = parseFloat(
            style.getPropertyValue(`border-${side.toLowerCase()}-width`),
          );
          const s = style.getPropertyValue(
            `border-${side.toLowerCase()}-style`,
          );
          const c = style.getPropertyValue(
            `border-${side.toLowerCase()}-color`,
          );
          if (w > 0 && s !== "none" && s !== "hidden" && !clear(c))
            found.push(`${name(el)}${pseudo ?? ""}: border-${side}`);
        }
        if (!pseudo && style.boxShadow !== "none")
          found.push(`${name(el)}: box-shadow`);
        if (pseudo) {
          const h = parseFloat(style.height);
          const w = parseFloat(style.width);
          if (h <= 3 && w >= width / 2 && !clear(style.backgroundColor))
            found.push(`${name(el)}${pseudo}: a drawn line`);
        }
      }
    }
    // A rule element in the footer.
    for (const el of footer.querySelectorAll("hr, [role='separator']"))
      if (el.checkVisibility()) found.push(`${name(el)}: a rule`);
    // Any thin, wide box along the footer's top edge, outside the slides and
    // the progress bar.
    for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
      if (progress.contains(el) || el.closest("main[data-slide-index]"))
        continue;
      if (!el.checkVisibility({ opacityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width < width / 2) continue;
      const style = getComputedStyle(el);
      if (r.height <= 3 && Math.abs(r.top - top) <= 6)
        if (!clear(style.backgroundColor)) found.push(`${name(el)}: a line`);
    }
    return found;
  });
  expect(lines, `${info.project.name}: divider lines`).toEqual([]);
});

// -------------------------------------------------- brand slot and wordmark ---

test("the brand slot shows the Averlo logo and the footer wordmark reads Averlo (default brand, FR-005)", async ({
  page,
}, info) => {
  await openDeck(page, "s=1");
  const brand = page.locator(`${bar.header} .brand`);
  await expect(brand).toHaveCount(1);
  const logo = brand.locator(".brand-logo");
  await expect(logo).toBeVisible();
  // The Averlo mark, as the questionnaire's Logo draws it.
  await expect(logo.locator("svg[viewBox='0 0 40 42'] path")).toHaveCount(1);
  // Not the "your logo" placeholder.
  await expect(brand.locator("img[src*='your-logo']")).toHaveCount(0);

  const footer = page.locator("footer:has([data-progress])");
  const wordmark = footer.getByText("Averlo", { exact: true });
  await expect(wordmark).toHaveCount(1);
  // On a portrait phone the footer hides its wordmark (deck.module.css).
  if (info.project.name === "desktop") await expect(wordmark).toBeVisible();
  await expect(footer.getByText("Deck", { exact: true })).toHaveCount(0);
});

// Brand `owner` without a logo: the slot shows the "your logo" placeholder
// mark plus the brand's name as text, and the footer wordmark reads the name.
// Checking it needs the deck built with another src/brand/config.ts; P6/P7
// add that config fixture (and the build that uses it).
test.fixme("brand owner without a logo: placeholder mark plus the name as text (FR-005)", async ({
  page,
}) => {
  const name = "Placeholder brand";
  await openDeck(page, "s=1");
  const brand = page.locator(`${bar.header} .brand`);
  await expect(brand.locator("img[src*='your-logo']")).toBeVisible();
  await expect(brand.locator(".brand-logo svg")).toHaveCount(0);
  await expect(brand).toContainText(name);
  await expect(
    page.locator("footer:has([data-progress])").getByText(name, {
      exact: true,
    }),
  ).toHaveCount(1);
});

// ---------------------------------------------------------------- the font ---

test("the bar's text is set in Inter, through the wrapper's font override", async ({
  page,
}) => {
  await openDeck(page, "s=1");
  await expect(page.locator(bar.header)).toHaveCount(1);
  const font = await page.evaluate(async (selectors) => {
    await document.fonts.ready;
    const header = document.querySelector(selectors.header)!;
    const wrapper = header.closest<HTMLElement>(".aq")!;
    const first = (family: string) =>
      family
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");
    const inter = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-inter")
      .trim();
    const texts = [
      header.querySelector(".brand-sub"),
      document.querySelector(selectors.label),
    ].map((el) => (el ? getComputedStyle(el).fontFamily : null));
    const family = texts[0] ? first(texts[0]) : "";
    return {
      inline: wrapper.getAttribute("style") ?? "",
      sfPro: getComputedStyle(wrapper).getPropertyValue("--font-sf-pro").trim(),
      inter,
      texts,
      family,
      loaded: [...document.fonts].some(
        (face) => first(face.family) === family && face.status === "loaded",
      ),
      check: family ? document.fonts.check(`16px "${family}"`) : false,
    };
  }, bar);
  expect(font.inline).toMatch(/--font-sf-pro:\s*var\(--font-inter\)/);
  expect(font.inter, "--font-inter is set").not.toBe("");
  expect(font.sfPro, "--font-sf-pro resolves to --font-inter").toBe(font.inter);
  for (const family of font.texts) {
    expect(family, "bar text").not.toBeNull();
    expect(family!).not.toMatch(/SF Pro/i);
    expect(family!.split(",")[0]).toMatch(/Inter/);
  }
  expect(font.family).toMatch(/Inter/);
  expect(font.loaded, `a loaded font face named ${font.family}`).toBe(true);
  expect(font.check).toBe(true);
});

// ------------------------------------------------ parity with the reference ---

type Shape = {
  tag: string;
  class: string;
  role: string | null;
  type: string | null;
  aria: string[];
  data: string[];
  children: Shape[];
};

/** The element tree under `selector`: tags, classes, roles and attribute
 *  names, without text. `drop` removes matching elements; `empty` keeps an
 *  element but not its children. Runs in the page. */
function shapeOf({
  selector,
  drop,
  empty,
}: {
  selector: string;
  drop: string[];
  empty: string[];
}) {
  const walk = (el: Element): Shape => ({
    tag: el.tagName.toLowerCase(),
    class: [...el.classList].sort().join(" "),
    role: el.getAttribute("role"),
    type: el.getAttribute("type"),
    aria: el
      .getAttributeNames()
      .filter((n) => n.startsWith("aria-"))
      .sort(),
    data: el
      .getAttributeNames()
      .filter((n) => n.startsWith("data-"))
      .sort(),
    children: empty.some((s) => el.matches(s))
      ? []
      : [...el.children]
          .filter((child) => !drop.some((s) => child.matches(s)))
          .map(walk),
  });
  const el = document.querySelector(selector);
  return el ? walk(el) : null;
}

const parts = [
  { selector: bar.header, drop: [], empty: [".header-right"] },
  {
    selector: ".aq .topline",
    drop: ["[data-progress-review-action]", ".progress-caption-review"],
    empty: [],
  },
  { selector: ".aq .inline-progress", drop: [], empty: [] },
];

/** Boxes compared between the deck and the reference, and which sides: the
 *  parts whose size follows their text keep only their position. */
const boxes: [string, ("x" | "y" | "width" | "height")[]][] = [
  [bar.header, ["x", "y", "width", "height"]],
  [`${bar.header} .header-surface`, ["x", "y", "width", "height"]],
  [`${bar.header} .top-inner`, ["x", "y", "width", "height"]],
  [`${bar.header} .brand`, ["x", "y", "height"]],
  [`${bar.header} .brand-logo`, ["x", "y", "width", "height"]],
  [`${bar.header} .brand-divider`, ["x", "y", "width", "height"]],
  [`${bar.header} .brand-sub`, ["x", "y", "height"]],
  [".aq .topline", ["x", "y", "width", "height"]],
  [".aq .inline-progress", ["x", "y", "width", "height"]],
  [bar.navigator, ["x", "y", "width", "height"]],
  [bar.track, ["x", "y", "width", "height"]],
  [`${bar.track} > div`, ["x", "y", "width", "height"]],
];

/** Hides what carries text or the questionnaire's own controls, in both. */
const hideText = `.aq .brand-sub, .aq .header-right > *, .aq [data-progress-review-action],
.aq .progress-caption-review { visibility: hidden !important; }`;

const wrapperVariables = [
  "--aq-accent",
  "--aq-accent-text",
  "--aq-accent-rgb",
  "--aq-hover-rgb",
  "--aq-active-rgb",
];

async function openReference(browser: Browser, info: TestInfo, url: string) {
  const use = info.project.use;
  const context = await browser.newContext({
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor ?? 1,
    hasTouch: use.hasTouch ?? false,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(url);
  await page
    .getByRole("button", { name: "Start questionnaire", exact: true })
    .click();
  await page.locator(bar.navigator).waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector(".aq[inert]") &&
      !document.querySelector("[data-questionnaire-surface][aria-hidden]"),
  );
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function measure(page: Page) {
  return page.evaluate(
    ({ boxes, variables, header }) => {
      const wrapper = document.querySelector(header)?.closest(".aq");
      const style = wrapper ? getComputedStyle(wrapper) : null;
      return {
        boxes: Object.fromEntries(
          boxes.map(([selector]) => {
            const el = document.querySelector(selector);
            const r = el?.getBoundingClientRect();
            return [
              selector,
              r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
            ];
          }),
        ),
        variables: Object.fromEntries(
          variables.map((name) => [
            name,
            style?.getPropertyValue(name).trim() ?? null,
          ]),
        ),
      };
    },
    { boxes, variables: wrapperVariables, header: bar.header },
  );
}

/** The share of pixels that differ by more than a small amount between two
 *  PNGs of the same size, compared in the page's canvas. */
async function pixelDifference(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([a, b]) => {
      const load = async (base64: string) =>
        createImageBitmap(
          await (await fetch(`data:image/png;base64,${base64}`)).blob(),
        );
      const [one, two] = await Promise.all([load(a), load(b)]);
      if (one.width !== two.width || one.height !== two.height)
        return { size: false, share: 1 };
      const pixels = (image: ImageBitmap) => {
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const p = pixels(one);
      const q = pixels(two);
      let differing = 0;
      for (let i = 0; i < p.length; i += 4) {
        const delta = Math.max(
          Math.abs(p[i] - q[i]),
          Math.abs(p[i + 1] - q[i + 1]),
          Math.abs(p[i + 2] - q[i + 2]),
        );
        if (delta > 40) differing++;
      }
      return { size: true, share: differing / (p.length / 4) };
    },
    [a.toString("base64"), b.toString("base64")] as const,
  );
}

test.describe("parity with the questionnaire's own top", () => {
  test.skip(
    !reference.available,
    `not run — ${reference.available ? "" : reference.reason}`,
  );

  let url = "";
  let close: (() => Promise<void>) | undefined;

  test.beforeAll(async ({}, info) => {
    if (!reference.available) return;
    // The first run builds the reference (about a minute); later runs reuse it.
    test.setTimeout(600_000);
    const out = await buildReference(reference, TOTAL);
    const port =
      Number(process.env.REFERENCE_PORT ?? 3195) + info.parallelIndex;
    const served = await serveReference(out, port);
    url = served.url;
    close = served.close;
  });

  test.afterAll(async () => {
    await close?.();
  });

  test("the reference's own navigator answers the same press and drag (checks the helpers)", async ({
    browser,
  }, info) => {
    const ref = await openReference(browser, info, url);
    await pressTrack(ref, 5, TOTAL);
    await expect(ref.locator(bar.label)).toHaveText(`5 / ${TOTAL}`);
    await ref.context().close();

    const touch = await browser.newContext({
      viewport: info.project.use.viewport,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const page = await touch.newPage();
    await page.goto(url);
    await page
      .getByRole("button", { name: "Start questionnaire", exact: true })
      .click();
    await page.locator(bar.navigator).waitFor();
    await dragTrack(page, 2, TOTAL - 1, TOTAL);
    await expect(page.locator(bar.label)).toHaveText(`${TOTAL - 1} / ${TOTAL}`);
    await touch.close();
  });

  test("DOM: the same structure, classes and roles as the reference", async ({
    page,
    browser,
  }, info) => {
    const ref = await openReference(browser, info, url);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    for (const part of parts) {
      const want = await ref.evaluate(shapeOf, part);
      expect(want, `the reference has ${part.selector}`).not.toBeNull();
      const got = await page.evaluate(shapeOf, part);
      expect(got, part.selector).toEqual(want);
    }
    const [deck, theirs] = [await measure(page), await measure(ref)];
    expect(deck.variables, "the wrapper's --aq-* variables").toEqual(
      theirs.variables,
    );
    await ref.context().close();
  });

  test("boxes: every part sits and sizes as in the reference", async ({
    page,
    browser,
  }, info) => {
    const ref = await openReference(browser, info, url);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    const [deck, theirs] = [await measure(page), await measure(ref)];
    for (const [selector, sides] of boxes) {
      const want = theirs.boxes[selector];
      expect(want, `the reference has ${selector}`).not.toBeNull();
      const got = deck.boxes[selector];
      expect(got, selector).not.toBeNull();
      for (const side of sides)
        expect(
          Math.abs(got![side] - want![side]),
          `${selector} ${side}: ${got![side]} vs ${want![side]}`,
        ).toBeLessThanOrEqual(1);
    }
    await ref.context().close();
  });

  test("pixels: the top looks as the reference, text hidden", async ({
    page,
    browser,
  }, info) => {
    const ref = await openReference(browser, info, url);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    await expect(page.locator(bar.track)).toHaveCount(1);
    const bottom = await ref
      .locator(bar.track)
      .evaluate((el) => Math.ceil(el.getBoundingClientRect().bottom));
    const width = info.project.use.viewport!.width;
    const clip = { x: 0, y: 0, width, height: bottom };
    const shots: Buffer[] = [];
    for (const target of [page, ref]) {
      await target.addStyleTag({ content: hideText });
      await target.mouse.move(width - 1, bottom + 300);
      await target.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
      );
      shots.push(await target.screenshot({ clip, animations: "disabled" }));
    }
    await info.attach("deck-top.png", {
      body: shots[0],
      contentType: "image/png",
    });
    await info.attach("reference-top.png", {
      body: shots[1],
      contentType: "image/png",
    });
    const diff = await pixelDifference(ref, shots[0], shots[1]);
    expect(diff.size, "same size").toBe(true);
    expect(
      diff.share,
      `share of differing pixels in the top 0–${bottom} px`,
    ).toBeLessThanOrEqual(0.005);
    await ref.context().close();
  });
});
