import {
  expect,
  test,
  type Browser,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { config } from "../src/brand/config";
import { brandName } from "../src/brand/name";
import { slides } from "../src/deck/slides";
import { progressFillPosition } from "../src/questionnaire/progress-model";
import {
  buildReference,
  findReference,
  serveReference,
} from "./fixtures/questionnaire-top";

// The top bar and the progress navigator (User Story 2, scenario 3; FR-005,
// FR-012, FR-013; T028, and T043 after the owner's review of the merged
// build). Runs at 390 and 1440 (the two projects) against the local
// production build.
//
// The questionnaire's top is ported as it is (research R4) and composed in
// two places (owner, spec "After reviewing the merged build"):
//   - the top bar keeps only its header band (`header.top[data-site-header]`:
//     the brand and the deck's title), inside a template-owned `.aq` wrapper,
//     and floats over the slides as an overlay with no white band ("keep the
//     top bar as overlay"; "this whole white area is a huge design flaw"),
//     the title next to the logo muted. The step label and the step track
//     are gone from it. On phones the overlay is hidden (spec, "During P4"),
//     and the slides take the whole stage;
//   - the progress navigator (`.inline-progress > .progress-navigator`)
//     replaces the footer's thin progress line at the bottom edge, full
//     width, its mound pointing up ("we simply just invert the direction in
//     which the mound goes"); the footer row (section, slide number, menu)
//     stays above it ("Footer row + navigator"). It shows on phones too.
// The footer has no wordmark ("no branding in the footer").
//
// Parity reference: tests/fixtures/questionnaire-top.ts builds the
// questionnaire's own runtime from its clone under PORT_SOURCES_DIR (at the
// commit the manifest pins, else the clone's HEAD) into the ignored
// .local/questionnaire-top/, as a static page with the same font override and
// as many steps as the deck has slides, and serves it from this process on
// REFERENCE_PORT (default 3195, plus the worker's parallel index). Without the
// clone those tests are skipped as "not run", as check:ports is. At 1440, with
// reduced motion so nothing is mid-spring, the deck's header band and
// navigator have the reference's elements, classes, roles and attribute names
// (text and aria values may differ; the header's right-hand controls are left
// out, as the deck has neither the save chip nor Review), and the header
// band's parts sit and size as in the reference. Their colours are the
// deck's own: the reference's white page is what the owner removed.

const TOTAL = slides.length;
const reference = findReference();

/** On phones the top overlay is hidden: under about 480 px wide or 500 px
 *  tall (owner, spec "During P4": "on small screens its not neccesary can be
 *  removed"). The overlay's own checks run where it shows, at 1440. */
const phone = ({
  viewport,
}: {
  viewport: { width: number; height: number } | null;
}) => !viewport || viewport.width <= 480 || viewport.height <= 500;
const onPhones = "the top overlay is hidden on phones (spec, During P4)";

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

/** The top bar's header band, in the deck and in the reference alike. */
const header = "header.top[data-site-header]";
/** The deck's top bar: the `.aq` wrapper that holds the header band. */
const top = `.aq:has(${header})`;

/** The progress navigator: in the deck, at the bottom of the footer; in the
 *  reference, under its step label. */
const deckNav = {
  wrapper: "footer [data-progress]",
  inline: "footer [data-progress] .inline-progress",
  navigator: "footer [data-progress] .progress-navigator",
  track: "footer [data-progress] .progress-track",
  fill: "footer [data-progress] .progress-track > div",
  mound: "footer [data-progress] .progress-mound path",
  moundButton: "footer [data-progress] .progress-mound-button",
};
const refNav = {
  inline: ".aq .inline-progress",
  navigator: ".aq .inline-progress .progress-navigator",
  track: ".aq .inline-progress .progress-track",
  moundButton: ".aq .progress-mound-button",
  label: ".aq .topline .progress-caption-step small",
};

type Box = { x: number; y: number; width: number; height: number };
const boxOf = async (page: Page, selector: string): Promise<Box> => {
  const box = await page.locator(selector).boundingBox();
  expect(box, selector).not.toBeNull();
  return box!;
};

/** Where the pointer goes to raise the mound over step `step`, and where a
 *  finger drags along the track. In the deck the mound points up, so the
 *  pointer comes from above the track; in the reference from below. */
async function stepPoint(
  page: Page,
  nav: { navigator: string; track: string },
  step: number,
  total: number,
  up: boolean,
) {
  await expect(page.locator(nav.navigator), "the navigator").toHaveCount(1);
  const navigator = await boxOf(page, nav.navigator);
  const track = await boxOf(page, nav.track);
  return {
    x: navigator.x + (navigator.width * (step - 0.5)) / total,
    hover: up ? track.y - 6 : track.y + track.height + 1,
    touch: up ? track.y - 10 : track.y + 10,
  };
}

/** A pointer press on the step track: move near the track over step `step`,
 *  wait for the mound to rise and name that step, then press it. */
async function pressTrack(
  page: Page,
  nav: { navigator: string; track: string; moundButton: string },
  step: number,
  total: number,
  up: boolean,
) {
  const { x, hover } = await stepPoint(page, nav, step, total, up);
  await page.mouse.move(x, hover, { steps: 4 });
  await page.waitForFunction(
    ([selector, label]) => {
      const button = document.querySelector<HTMLButtonElement>(selector);
      return !!button && !button.disabled && button.textContent === label;
    },
    [nav.moundButton, String(step)] as const,
  );
  await page.locator(nav.moundButton).click();
}

/** A finger drag along the step track from step `from` to step `to`, through
 *  Chromium's touch input (the navigator's touch zone shows on a coarse
 *  pointer, so the page must be in a `hasTouch` context). */
async function dragTrack(
  page: Page,
  nav: { navigator: string; track: string },
  from: number,
  to: number,
  total: number,
  up: boolean,
) {
  const a = await stepPoint(page, nav, from, total, up);
  const b = await stepPoint(page, nav, to, total, up);
  const y = a.touch;
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

/** WCAG contrast of two computed colours, `rgb()`/`rgba()` or
 *  `color(srgb …)` (as a `color-mix()` computes), the first over the second,
 *  alpha ignored. */
function contrast(a: string, b: string) {
  const channels = (color: string) => {
    const values = (color.replace(/^color\(srgb/, "").match(/[\d.]+/g) ?? [])
      .slice(0, 3)
      .map(Number);
    return color.startsWith("color(srgb")
      ? values.map((value) => value * 255)
      : values;
  };
  const luminance = (color: string) => {
    const [r, g, b] = channels(color).map((value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A token's colour as the page resolves it, through a probe element. */
const tokenColor = (page: Page, token: string) =>
  page.evaluate((token) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);

test.describe("where the top overlay shows", () => {
  test.skip(phone, onPhones);

  // ------------------------------------------------------------ the overlay ---

  test("the bar floats over the slides at the top, with the stage under it from the top edge", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    for (let n = 1; n <= TOTAL; n++) {
      if (n > 1) await page.keyboard.press("ArrowRight");
      await expectSlide(page, n);
      await expect(
        page.locator(header),
        `slide ${n}: the header band`,
      ).toBeVisible();
      const layout = await page.evaluate((header) => {
        const band = document.querySelector(header)!;
        const brand = band.querySelector(".brand-logo")!;
        const h = band.getBoundingClientRect();
        const b = brand.getBoundingClientRect();
        const slide = document.querySelector("main:not([aria-hidden])")!;
        const stage = slide.getBoundingClientRect();
        const hit = document.elementFromPoint(
          b.left + b.width / 2,
          b.top + b.height / 2,
        );
        return {
          viewport: { width: innerWidth, height: innerHeight },
          wrapped: !!band.closest(".aq"),
          header: { left: h.left, top: h.top, width: h.width },
          stage: { top: stage.top, height: stage.height },
          brandOnTop: !!hit && brand.contains(hit),
        };
      }, header);
      expect(layout.wrapped, `slide ${n}: the bar is inside .aq`).toBe(true);
      expect(layout.header.left, `slide ${n}: left edge`).toBeCloseTo(0, 0);
      expect(layout.header.top, `slide ${n}: top edge`).toBeCloseTo(0, 0);
      expect(layout.header.width, `slide ${n}: full width`).toBeCloseTo(
        layout.viewport.width,
        0,
      );
      expect(
        layout.brandOnTop,
        `slide ${n}: nothing covers the brand's link`,
      ).toBe(true);
      // An overlay: the slides take the whole stage, from the top edge.
      expect(
        layout.stage.top,
        `slide ${n}: the stage starts at the top`,
      ).toBeCloseTo(0, 0);
      expect(
        layout.stage.height,
        `slide ${n}: the stage is the viewport's height`,
      ).toBeCloseTo(layout.viewport.height, 0);
    }
  });

  test("no band: the bar draws nothing but its brand and title over the deck's background", async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=3");
    await expect(page.locator(header)).toBeVisible();
    // Every box of the bar is see-through.
    const fills = await page.evaluate((top) => {
      const bar = document.querySelector(top)!;
      const clear = (color: string) =>
        color === "transparent" || /rgba\(.*,\s*0\)$/.test(color);
      return [bar, ...bar.querySelectorAll("*")]
        .filter((el) => !el.closest(".brand"))
        .filter((el) => {
          const s = getComputedStyle(el);
          return (
            el.checkVisibility({ opacityProperty: true }) &&
            (!clear(s.backgroundColor) || s.backgroundImage !== "none")
          );
        })
        .map(
          (el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`,
        );
    }, top);
    expect(fills, "boxes of the bar that draw a fill").toEqual([]);
    // And in pixels: with the brand hidden, the top of the stage is the
    // deck's own background, edge to edge.
    const band = await boxOf(page, header);
    await page.addStyleTag({
      content: `${top} .brand { visibility: hidden !important; }`,
    });
    await page.mouse.move(band.width / 2, band.height + 300);
    const shot = await page.screenshot({
      clip: { x: 0, y: 0, width: band.width, height: band.height },
      animations: "disabled",
    });
    await info.attach("top.png", { body: shot, contentType: "image/png" });
    const background = await tokenColor(page, "--color-background");
    const share = await page.evaluate(
      async ([png, background]) => {
        const [r, g, b] = (background.match(/[\d.]+/g) ?? []).map(Number);
        const image = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${png}`)).blob(),
        );
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, image.width, image.height).data;
        let off = 0;
        for (let i = 0; i < data.length; i += 4)
          if (
            Math.max(
              Math.abs(data[i] - r),
              Math.abs(data[i + 1] - g),
              Math.abs(data[i + 2] - b),
            ) > 24
          )
            off++;
        return off / (data.length / 4);
      },
      [shot.toString("base64"), background] as const,
    );
    expect(
      share,
      "share of the top that is not the deck's background",
    ).toBeLessThanOrEqual(0.002);
  });

  test("the title next to the logo is muted, the logo reads on the dark background", async ({
    page,
  }) => {
    await openDeck(page, "s=1");
    const sub = page.locator(`${header} .brand-sub`);
    await expect(sub).toHaveText(config.deckTitle);
    const muted = await tokenColor(page, "--color-muted");
    const background = await tokenColor(page, "--color-background");
    const colors = await page.evaluate((header) => {
      const band = document.querySelector(header)!;
      return {
        sub: getComputedStyle(band.querySelector(".brand-sub")!).color,
        logo: getComputedStyle(band.querySelector(".brand-logo")!).color,
      };
    }, header);
    expect(colors.sub, "the deck title is the Averlo muted text").toBe(muted);
    expect(contrast(colors.sub, background)).toBeGreaterThanOrEqual(4.5);
    // The mark is drawn in currentColor: light, on the deck's dark page.
    expect(contrast(colors.logo, background)).toBeGreaterThanOrEqual(4.5);
  });

  test("the top keeps only the brand and the title: no step label, no step track", async ({
    page,
  }) => {
    await openDeck(page, "s=3");
    await expect(page.locator(header)).toBeVisible();
    for (const part of [
      ".topline",
      ".progress-caption",
      ".inline-progress",
      ".progress-navigator",
    ])
      await expect(page.locator(`${top} ${part}`), part).toHaveCount(0);
  });

  test("no slide's text runs under the brand", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(size);
      await openDeck(page, "s=1");
      for (let n = 1; n <= TOTAL; n++) {
        if (n > 1) await page.keyboard.press("ArrowRight");
        await expectSlide(page, n);
        const hits = await page.evaluate((header) => {
          const brand = document
            .querySelector(header)!
            .querySelector(".brand")!
            .getBoundingClientRect();
          const slide = document.querySelector("main:not([aria-hidden])")!;
          const found: string[] = [];
          const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim() || !node.parentElement) continue;
            if (!node.parentElement.checkVisibility({ opacityProperty: true }))
              continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const r of range.getClientRects())
              if (
                r.right > brand.left &&
                r.left < brand.right &&
                r.bottom > brand.top &&
                r.top < brand.bottom
              )
                found.push(node.textContent.trim());
          }
          return found;
        }, header);
        expect(hits, `${size.width}×${size.height} slide ${n}`).toEqual([]);
      }
    }
  });
});

// ------------------------------------------------------------- on a phone ---

test("on a phone the top overlay is hidden; the navigator stays at the bottom", async ({
  page,
}, info) => {
  test.skip(
    !phone({ viewport: info.project.use.viewport ?? null }),
    "the overlay shows here",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDeck(page, "s=2");
  const check = async (at: string) => {
    await expect(page.locator(".aq header"), `${at}: the wrapper`).toHaveCount(
      1,
    );
    await expect(page.locator(header), `${at}: the header band`).toBeHidden();
    const top = await page
      .locator("main:not([aria-hidden])")
      .evaluate((main) => main.getBoundingClientRect().top);
    expect(top, `${at}: the stage starts at the top`).toBeCloseTo(0, 0);
    await expect(
      page.locator(deckNav.navigator),
      `${at}: the navigator`,
    ).toBeVisible();
  };
  await check("portrait");
  // A phone on its side: under about 500 px tall.
  await page.setViewportSize({ width: 844, height: 390 });
  await check("844×390");
});

// ---------------------------------------------------------- the navigator ---

test.describe("the navigator at the bottom edge", () => {
  test("full width along the bottom edge, under the footer row, in place of the progress line", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const n = 3;
    await openDeck(page, `s=${n}`);
    const viewport = page.viewportSize()!;
    await expect(page.locator(deckNav.navigator)).toHaveCount(1);
    const track = await boxOf(page, deckNav.track);
    expect(track.x, "left edge").toBeCloseTo(0, 0);
    expect(track.width, "full width").toBeCloseTo(viewport.width, 0);
    expect(track.y + track.height, "on the bottom edge").toBeCloseTo(
      viewport.height,
      0,
    );
    // The footer row stays above it.
    const row = await page.evaluate(() => {
      const footer = document.querySelector("footer")!;
      return Math.max(
        ...[...footer.querySelectorAll("p, span, button")]
          .filter(
            (el) =>
              !el.closest("[data-progress]") &&
              el.checkVisibility({ opacityProperty: true }),
          )
          .map((el) => el.getBoundingClientRect().bottom),
      );
    });
    expect(row, "the footer row ends above the track").toBeLessThanOrEqual(
      track.y + 0.5,
    );
    // Its progress follows the slide, as the questionnaire's does.
    const progressbar = page.locator(`${deckNav.track}[role='progressbar']`);
    await expect(progressbar).toHaveAttribute(
      "aria-valuenow",
      String(Math.round((n / TOTAL) * 100)),
    );
    const fill = await boxOf(page, deckNav.fill);
    expect(fill.width, "the fill follows the slide").toBeCloseTo(
      progressFillPosition((n / TOTAL) * 100, track.width, TOTAL),
      0,
    );
    // The old thin line is gone: the navigator is the footer's only progress.
    await expect(page.locator("footer [data-progress-fill]")).toHaveCount(0);
    await expect(page.locator("footer [role='progressbar']")).toHaveCount(1);
  });

  test("its mound points up: the pointer above the track raises it, upward", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=2");
    const track = await boxOf(page, deckNav.track);
    const { x, hover } = await stepPoint(page, deckNav, 6, TOTAL, true);
    // Far above the track, nothing rises.
    await page.mouse.move(x, track.y - 160, { steps: 3 });
    await expect(page.locator(deckNav.moundButton)).toBeDisabled();
    // Near it, the mound rises above the track and names the step.
    await page.mouse.move(x, hover, { steps: 4 });
    await expect(page.locator(deckNav.moundButton)).toBeEnabled();
    await expect(page.locator(deckNav.moundButton)).toHaveText("6");
    const shape = await page.evaluate((nav) => {
      const path = document.querySelector(nav.mound)!.getBoundingClientRect();
      const button = document.querySelector(nav.moundButton)!;
      /** The sign of the vertical scale from the element up to the page. */
      const flip = (el: Element | null) => {
        let sign = 1;
        for (; el; el = el.parentElement) {
          const t = getComputedStyle(el).transform;
          if (t && t !== "none" && new DOMMatrixReadOnly(t).d < 0) sign = -sign;
          const scale = getComputedStyle(el).scale;
          if (scale && scale !== "none") {
            const [, sy] = scale.split(/\s+/).map(Number);
            if (sy !== undefined && sy < 0) sign = -sign;
          }
        }
        return sign;
      };
      const b = button.getBoundingClientRect();
      return {
        top: path.top,
        bottom: path.bottom,
        button: b.top + b.height / 2,
        upright: flip(button) > 0,
      };
    }, deckNav);
    expect(shape.bottom, "the mound stands on the track").toBeLessThanOrEqual(
      track.y + track.height + 1,
    );
    expect(shape.top, "the mound rises above the track").toBeLessThan(
      track.y - 16,
    );
    expect(shape.button, "its step number sits in the mound").toBeLessThan(
      track.y,
    );
    expect(shape.upright, "its step number reads upright").toBe(true);
  });

  test("pressing the navigator jumps to that slide, and ?s= follows", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    const forward = Math.ceil(TOTAL / 2) + 1;
    const back = 2;
    await pressTrack(page, deckNav, forward, TOTAL, true);
    await expectSlide(page, forward);
    await pressTrack(page, deckNav, back, TOTAL, true);
    await expectSlide(page, back);
  });

  test.describe("on a touch screen", () => {
    test.use({ hasTouch: true });

    test("dragging along the navigator jumps to the slide where it lets go, and ?s= follows", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openDeck(page, "s=1");
      // Clear of the menu button at the right end, where a finger near the
      // button presses the button (the browser's touch adjustment).
      const to = Math.ceil(TOTAL * 0.7);
      await dragTrack(page, deckNav, 2, to, TOTAL, true);
      await expectSlide(page, to);
      await dragTrack(page, deckNav, to, 3, TOTAL, true);
      await expectSlide(page, 3);
    });
  });
});

// ------------------------------------------------------------- the footer ---

test("the footer keeps its section, number and menu, with no wordmark and no divider line", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const n = 3;
  await openDeck(page, `s=${n}`);
  const footer = page.locator("footer:has([data-progress])");
  await expect(footer).toHaveCount(1);
  const pad = (k: number) => String(k).padStart(2, "0");
  await expect(footer.getByText(`${pad(n)} / ${pad(TOTAL)}`)).toBeVisible();
  await expect(footer.locator("[data-footer-menu] button")).toBeVisible();
  await expect(
    footer.locator("[data-progress] .progress-navigator"),
  ).toHaveCount(1);
  // No branding in the footer: no wordmark, not even hidden.
  await expect(
    footer.getByText(brandName(config.brand), { exact: true }),
  ).toHaveCount(0);

  // No divider: nothing draws a line along the top of the footer, between the
  // stage and the footer row. The navigator's track is the only full-width
  // line the footer keeps, at the bottom edge.
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
    // the navigator.
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

// ------------------------------------------------------------ brand slot ---

test("the brand slot shows the Averlo logo (default brand, FR-005)", async ({
  page,
}, info) => {
  test.skip(phone({ viewport: info.project.use.viewport ?? null }), onPhones);
  await openDeck(page, "s=1");
  const brand = page.locator(`${header} .brand`);
  await expect(brand).toHaveCount(1);
  const logo = brand.locator(".brand-logo");
  await expect(logo).toBeVisible();
  // The Averlo mark, as the questionnaire's Logo draws it.
  await expect(logo.locator("svg[viewBox='0 0 40 42'] path")).toHaveCount(1);
  // Not the "your logo" placeholder.
  await expect(brand.locator("img[src*='your-logo']")).toHaveCount(0);
});

// Brand `owner` without a logo: the slot shows the "your logo" placeholder
// mark plus the brand's name as text. Checking it needs the deck built with
// another src/brand/config.ts; P6/P7 add that config fixture (and the build
// that uses it).
test.fixme("brand owner without a logo: placeholder mark plus the name as text (FR-005)", async ({
  page,
}) => {
  const name = "Placeholder brand";
  await openDeck(page, "s=1");
  const brand = page.locator(`${header} .brand`);
  await expect(brand.locator("img[src*='your-logo']")).toBeVisible();
  await expect(brand.locator(".brand-logo svg")).toHaveCount(0);
  await expect(brand).toContainText(name);
});

// ---------------------------------------------------------------- the font ---

test("the bar's text is set in Inter, through the wrapper's font override", async ({
  page,
}, info) => {
  test.skip(phone({ viewport: info.project.use.viewport ?? null }), onPhones);
  await openDeck(page, "s=1");
  await expect(page.locator(header)).toHaveCount(1);
  const font = await page.evaluate(async (header) => {
    await document.fonts.ready;
    const band = document.querySelector(header)!;
    const wrapper = band.closest<HTMLElement>(".aq")!;
    const first = (family: string) =>
      family
        .split(",")[0]
        .trim()
        .replace(/^["']|["']$/g, "");
    const inter = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-inter")
      .trim();
    const family = first(
      getComputedStyle(band.querySelector(".brand-sub")!).fontFamily,
    );
    return {
      inline: wrapper.getAttribute("style") ?? "",
      sfPro: getComputedStyle(wrapper).getPropertyValue("--font-sf-pro").trim(),
      inter,
      family,
      loaded: [...document.fonts].some(
        (face) => first(face.family) === family && face.status === "loaded",
      ),
      check: family ? document.fonts.check(`16px "${family}"`) : false,
    };
  }, header);
  expect(font.inline).toMatch(/--font-sf-pro:\s*var\(--font-inter\)/);
  expect(font.inter, "--font-inter is set").not.toBe("");
  expect(font.sfPro, "--font-sf-pro resolves to --font-inter").toBe(font.inter);
  expect(font.family).not.toMatch(/SF Pro/i);
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

/** The parts compared: the deck's selector and the reference's. */
const parts = [
  { deck: header, ref: header, drop: [], empty: [".header-right"] },
  { deck: deckNav.inline, ref: refNav.inline, drop: [], empty: [] },
];

/** The header band's boxes compared between the deck and the reference, and
 *  which sides: the parts whose size follows their text keep only their
 *  position. */
const boxes: [string, ("x" | "y" | "width" | "height")[]][] = [
  [header, ["x", "y", "width", "height"]],
  [`${header} .header-surface`, ["x", "y", "width", "height"]],
  [`${header} .top-inner`, ["x", "y", "width", "height"]],
  [`${header} .brand`, ["x", "y", "height"]],
  [`${header} .brand-logo`, ["x", "y", "width", "height"]],
  [`${header} .brand-divider`, ["x", "y", "width", "height"]],
  [`${header} .brand-sub`, ["x", "y", "height"]],
];

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
  await page.locator(refNav.navigator).waitFor();
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
    { boxes, variables: wrapperVariables, header },
  );
}

test.describe("parity with the questionnaire's own top", () => {
  test.skip(phone, onPhones);
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
    await pressTrack(ref, refNav, 5, TOTAL, false);
    await expect(ref.locator(refNav.label)).toHaveText(`5 / ${TOTAL}`);
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
    await page.locator(refNav.navigator).waitFor();
    await dragTrack(page, refNav, 2, TOTAL - 1, TOTAL, false);
    await expect(page.locator(refNav.label)).toHaveText(
      `${TOTAL - 1} / ${TOTAL}`,
    );
    await touch.close();
  });

  test("DOM: the header band and the navigator have the reference's structure, classes and roles", async ({
    page,
    browser,
  }, info) => {
    const ref = await openReference(browser, info, url);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeck(page, "s=1");
    for (const part of parts) {
      const want = await ref.evaluate(shapeOf, {
        selector: part.ref,
        drop: part.drop,
        empty: part.empty,
      });
      expect(want, `the reference has ${part.ref}`).not.toBeNull();
      const got = await page.evaluate(shapeOf, {
        selector: part.deck,
        drop: part.drop,
        empty: part.empty,
      });
      expect(got, part.deck).toEqual(want);
    }
    const [deck, theirs] = [await measure(page), await measure(ref)];
    expect(deck.variables, "the wrapper's --aq-* variables").toEqual(
      theirs.variables,
    );
    await ref.context().close();
  });

  test("boxes: every part of the header band sits and sizes as in the reference", async ({
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
});
