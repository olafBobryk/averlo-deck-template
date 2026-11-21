import { expect, test, type Locator, type Page } from "@playwright/test";
import { evidence } from "./evidence";
import { langs } from "../src/deck/langs";
import { pdfHref } from "../src/deck/model";
import { slides } from "../src/deck/slides";

// The corner menu. One card that grows out of the menu button (the motion
// module's morph, popup-motion.ts), and that Expand turns into the overview
// by moving its bounds on spring.surface. A requestAnimationFrame loop
// records every painted frame.

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function openDeck(page: Page, slide = 3) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // No key: mark the intro as played this session, so the
  // deck opens straight away as on a repeat visit.
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`/?s=${slide}`);
  // A hard load runs on the instant tokens until it has arrived (arrival.ts).
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-arriving"),
  );
}

const menuButton = (page: Page) =>
  page.getByRole("button", { name: "Menu", exact: true });
const card = (page: Page) => page.locator("[data-menu-card]");

/** True while the card's clip (popup-motion.ts's morph) is running. */
const clipping = (locator: Locator) =>
  locator.evaluate((el) =>
    el
      .getAnimations()
      .some((animation) =>
        (animation.effect as KeyframeEffect | null)
          ?.getKeyframes()
          .some((frame) => "clipPath" in frame),
      ),
  );

type Frame = {
  clip: string;
  view: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** The entering (live) content's width, its left from the card's left
   *  edge and its opacity; the leaving content's width, if it is there. */
  inner: number;
  start: number;
  opacity: number;
  leaving: number | null;
  /** How far inside the card's right edge the scroller stops: the content
   *  may be clipped only by the card's own edge. */
  scrollerEnd: number;
  /** The lowest opacity on any ancestor of a glass (backdrop-filter)
   *  element inside the card: always 1. */
  aboveGlass: number;
};

async function startSampling(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { menuFrames: unknown[]; menuOn: boolean };
    w.menuFrames = [];
    w.menuOn = true;
    const tick = () => {
      const el = document.querySelector<HTMLElement>("[data-menu-card]");
      if (el) {
        const c = el.getBoundingClientRect();
        const live = el.querySelector("[data-pane]:not([inert])");
        const b = live?.getBoundingClientRect();
        const gone = el.querySelector("[data-pane][inert]");
        const v = el.querySelector("[data-menu-viewport]");
        w.menuFrames.push({
          clip: getComputedStyle(el).clipPath,
          view: el.getAttribute("data-view") ?? "",
          left: c.left,
          top: c.top,
          width: c.width,
          height: c.height,
          inner: b?.width ?? 0,
          start: b ? b.left - c.left : 0,
          // What fades is the pane's items (or the pane, if it has none).
          opacity: live
            ? parseFloat(
                getComputedStyle(live.querySelector("[data-pane-item]") ?? live)
                  .opacity,
              )
            : 0,
          leaving: gone ? gone.getBoundingClientRect().width : null,
          scrollerEnd: v ? c.right - v.getBoundingClientRect().right : 0,
          aboveGlass: [...el.querySelectorAll("*")]
            .filter((node) => getComputedStyle(node).backdropFilter !== "none")
            .reduce((low, glass) => {
              for (
                let a = glass.parentElement;
                a && a !== el;
                a = a.parentElement
              )
                low = Math.min(low, parseFloat(getComputedStyle(a).opacity));
              return low;
            }, 1),
        });
      }
      if (w.menuOn) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopSampling(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { menuFrames: Frame[]; menuOn: boolean };
    w.menuOn = false;
    return w.menuFrames;
  });
}

const insets = (clip: string) => {
  const match = /^inset\(([^)]*?)(?: round [^)]*)?\)$/.exec(clip);
  if (!match) return null;
  const values = match[1]!.trim().split(/\s+/).map(parseFloat);
  const [top, right = top, bottom = top, left = right] = values;
  return [top!, right!, bottom!, left!];
};

test("menu: opens out of its button, expands and minimizes as one card", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await openDeck(page);
  const button = await menuButton(page).boundingBox();
  expect(button).not.toBeNull();

  // Open: the card's clip shrinks from the button's box to none, every side
  // on the same curve.
  await startSampling(page);
  await menuButton(page).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await expect.poll(() => clipping(card(page))).toBe(false);
  await page.waitForTimeout(100);
  const opening = await stopSampling(page);
  const home = opening.at(-1)!;
  evidence(
    "menu-open",
    opening.map(({ clip, left, top, width, height }) => ({
      clip,
      left,
      top,
      width,
      height,
    })),
  );
  const shut = [
    button!.y - home.top,
    home.left + home.width - (button!.x + button!.width),
    home.top + home.height - (button!.y + button!.height),
    button!.x - home.left,
  ];
  const progress = opening
    .map((frame) => insets(frame.clip))
    .filter((values): values is number[] => values !== null)
    .map((values) =>
      values
        .map((value, side) =>
          Math.abs(shut[side]!) > 2 ? 1 - value / shut[side]! : null,
        )
        .filter((value): value is number => value !== null),
    );
  test.info().annotations.push({
    type: "open: clip progress per frame (top, left)",
    description: progress
      .map((sides) => sides.map((p) => p.toFixed(3)).join("/"))
      .join(" "),
  });
  expect(progress.length).toBeGreaterThanOrEqual(2);
  // The first clipped frame is (nearly) the button's box.
  expect(Math.max(...progress[0]!)).toBeLessThan(0.5);
  progress.forEach((sides, i) => {
    const at = `open frame ${i}: ${sides.join(", ")}`;
    // One curve: every side has gone the same share of its way.
    expect(Math.max(...sides) - Math.min(...sides), at).toBeLessThan(0.02);
    sides.forEach((p) => expect(p, at).toBeGreaterThan(-0.01));
    if (i > 0)
      expect(sides[0]!, at).toBeGreaterThanOrEqual(progress[i - 1]![0]! - 0.01);
  });
  expect(
    progress.filter((sides) => sides[0]! > 0.05 && sides[0]! < 0.95).length,
  ).toBeGreaterThanOrEqual(1);
  expect(["none", "inset(0px round 20px)"]).toContain(home.clip);

  // Expand and Minimize: the same node, its bounds on one spring, no clip.
  await card(page).evaluate((el) => Object.assign(el, { usCard: true }));
  const same = () =>
    page.evaluate(
      () =>
        (
          document.querySelector("[data-menu-card]") as {
            usCard?: boolean;
          } | null
        )?.usCard === true &&
        document.querySelectorAll("[data-menu-card]").length === 1,
    );
  const viewport = page.viewportSize()!;
  const sample = async (name: "Expand" | "Minimize") => {
    await startSampling(page);
    await card(page).getByRole("button", { name }).click();
    expect(await clipping(card(page))).toBe(false);
    const target =
      name === "Expand"
        ? // Inset 40, or 12 on a portrait screen.
          viewport.width < viewport.height
          ? { width: viewport.width - 24, top: 12 }
          : { width: viewport.width - 80, top: 40 }
        : { width: home.width, top: home.top };
    // Width and top both home (on a portrait phone only the top moves).
    await expect
      .poll(() => card(page).evaluate((el) => el.getBoundingClientRect().width))
      .toBeCloseTo(target.width, 0);
    await expect
      .poll(() => card(page).evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(target.top, 0);
    await page.waitForTimeout(300);
    const frames = await stopSampling(page);
    evidence(
      `menu-${name.toLowerCase()}`,
      frames.map(
        ({ view, left, top, width, height, inner, opacity, leaving }) => ({
          view,
          left,
          top,
          width,
          height,
          inner,
          opacity,
          leaving,
        }),
      ),
    );
    expect(await same()).toBe(true);
    const from = frames[0]!;
    const rest = frames.at(-1)!;
    test.info().annotations.push({
      type: `${name}: width × height @ top per frame`,
      description: frames
        .map(
          (f) =>
            `${f.width.toFixed(1)}×${f.height.toFixed(1)}@${f.top.toFixed(1)}`,
        )
        .join(" "),
    });
    // Mid-spring frames. On a portrait phone the popup is already full width,
    // so Expand moves its height and top only.
    const changes = (key: "width" | "height") =>
      Math.abs(rest[key] - from[key]) > 0.5;
    const moving = frames.filter((f) =>
      (["width", "height"] as const).some(
        (key) =>
          changes(key) &&
          Math.abs(f[key] - from[key]) > 0.5 &&
          Math.abs(f[key] - rest[key]) > 0.5,
      ),
    ).length;
    expect(moving).toBeGreaterThanOrEqual(1);
    for (const key of ["width", "height", "top"] as const) {
      const sign = Math.sign(rest[key] - from[key]);
      frames.forEach((frame, i) => {
        const before = frames[i - 1];
        if (!before) return;
        const at = `${name} ${key} frame ${i}: ${before[key]} → ${frame[key]}`;
        // Monotonic toward the target: never back by half a pixel.
        expect((frame[key] - before[key]) * sign, at).toBeGreaterThan(-0.5);
      });
    }
    // The card's border and padding: the content may come no closer.
    const edge = await card(page).evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    });
    const goal = name === "Expand" ? "expanded" : "popup";
    // The content before the change, and every frame after it.
    const before = frames.filter((frame) => frame.view !== goal);
    const after = frames.filter((frame) => frame.view === goal);
    expect(before.length, "frames before the click").toBeGreaterThanOrEqual(1);
    expect(after.length).toBeGreaterThanOrEqual(2);
    const stood = before.at(-1)!.inner;
    test.info().annotations.push({
      type: `${name}: content width / opacity / leaving width per frame`,
      description: after
        .map(
          (f) =>
            `${f.inner.toFixed(1)}/${f.opacity.toFixed(2)}/${f.leaving?.toFixed(1) ?? "-"}`,
        )
        .join(" "),
    });
    frames.forEach((frame, i) => {
      const at = `${name} content frame ${i}: ${JSON.stringify(frame)}`;
      expect(frame.clip, at).toMatch(/^(none|inset\(0px round 20px\))$/);
      expect(frame.start, at).toBeGreaterThanOrEqual(edge - 0.5);
      // Only the card's own edge clips: the scroller reaches it (its border
      // aside).
      expect(frame.scrollerEnd, at).toBeLessThanOrEqual(1.5);
      expect(frame.aboveGlass, at).toBe(1);
    });
    after.forEach((frame, i) => {
      const at = `${name} content frame ${i} after the click: ${JSON.stringify(frame)}`;
      // The content takes its final width at once and keeps it: it never
      // re-wraps while the card resizes.
      expect(Math.abs(frame.inner - rest.inner), at).toBeLessThanOrEqual(0.5);
      // The leaving content stands at the width it had, while it fades.
      if (frame.leaving !== null)
        expect(Math.abs(frame.leaving - stood), at).toBeLessThanOrEqual(0.5);
      // The entering content fades in, never back.
      const prior = after[i - 1];
      if (prior)
        expect(frame.opacity, at).toBeGreaterThanOrEqual(prior.opacity - 0.01);
    });
    // It fades in on `fade`: from (nearly) nothing to whole.
    expect(after[0]!.opacity).toBeLessThan(0.5);
    expect(rest.opacity).toBe(1);
    expect(rest.leaving).toBeNull();
    expect(Math.abs(rest.width - target.width)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(rest.top - target.top)).toBeLessThanOrEqual(0.5);
    return frames;
  };

  await sample("Expand");
  await expect(page.locator("html")).toHaveAttribute("data-menu-expanded", "");
  await expect(page.locator("html")).toHaveAttribute("data-menu", "expanded");
  await expect(page.getByRole("dialog", { name: "Overview" })).toBeVisible();
  await sample("Minimize");
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-menu-expanded",
    "",
  );
  await expect(page.locator("html")).toHaveAttribute("data-menu", "popup");
  expect(errors).toEqual([]);
});

test("menu: keys, overview, PDFs, Esc and outside click", async ({ page }) => {
  // Slide 3 is opened; slide `T` is the jump target.
  const N = slides.length;
  const lang = langs[0];
  const T = Math.min(N, 5);
  const third = slides[2].title;
  const target = slides[T - 1].title;
  const errors = watchConsole(page);
  await openDeck(page);
  const html = page.locator("html");
  const menu = page.getByRole("dialog", { name: "Menu" });
  const overview = page.getByRole("dialog", { name: "Overview" });

  // M opens the popup and closes it again.
  await page.keyboard.press("m");
  await expect(menu).toBeVisible();
  await expect(html).toHaveAttribute("data-menu", "popup");
  await expect(menu.locator("[aria-current='true']")).toContainText(
    third[lang],
  );
  await page.keyboard.press("m");
  await expect(card(page)).toHaveCount(0);
  await expect(html).not.toHaveAttribute("data-menu", /.*/);
  await expect(menuButton(page)).toBeFocused();

  // O opens it expanded, with every slide as a thumbnail.
  await page.keyboard.press("o");
  await expect(overview).toBeVisible();
  await expect(html).toHaveAttribute("data-menu", "expanded");
  await expect(html).toHaveAttribute("data-menu-expanded", "");
  const thumbs = overview.locator("[data-thumb]");
  await expect(thumbs).toHaveCount(N);
  await expect(thumbs.locator("[data-kind]")).toHaveCount(N);
  // One Download control in its header; the PDFs wait in its dropdown.
  await expect(
    overview.getByRole("button", { name: "Download" }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/pdf/"]')).toHaveCount(0);
  // O again closes it.
  await page.keyboard.press("o");
  await expect(card(page)).toHaveCount(0);
  await expect(html).not.toHaveAttribute("data-menu-expanded", /.*/);

  // From the popup, O expands; choosing slide T closes and shows it.
  await page.keyboard.press("m");
  await expect(menu).toBeVisible();
  await page.keyboard.press("o");
  await expect(overview).toBeVisible();
  await overview
    .getByRole("button", {
      name: `${String(T).padStart(2, "0")} ${target[lang]}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`[?&]s=${T}(?!\\d)`));
  await expect(card(page)).toHaveCount(0);
  await expect(page.locator("main:not([aria-hidden])")).toHaveAttribute(
    "aria-label",
    `${T} / ${N}`,
  );
  await expect(
    page
      .locator("main:not([aria-hidden])")
      .getByRole("heading", { name: target[lang] }),
  ).toBeVisible();
  await expect(menuButton(page)).toBeFocused();

  // The menu's controls and slide list.
  await menuButton(page).click();
  await expect(menu).toBeVisible();
  await expect(html).toHaveAttribute("lang", lang);
  await expect(menu.getByRole("button", { name: /Previous/ })).toBeVisible();
  await expect(menu.getByRole("button", { name: /Next/ })).toBeVisible();
  await expect(menu.getByRole("button", { name: /Fullscreen/ })).toBeVisible();
  await expect(menu.getByRole("list", { name: "Slides" })).toBeVisible();
  await expect(menu.locator("[aria-current='true']")).toContainText(
    target[lang],
  );

  // Every language's PDF, in the popup's Download dropdown and served as PDFs.
  await menu.getByRole("button", { name: "Download" }).click();
  const pdfs = page.getByRole("menu");
  await expect(pdfs).toBeVisible();
  await expect(pdfs.getByRole("menuitem")).toHaveCount(langs.length);
  for (const [i, lang] of langs.entries()) {
    const item = pdfs.getByRole("menuitem").nth(i);
    await expect(item).toHaveAttribute("href", pdfHref(lang));
    const pdf = await page.request.get(pdfHref(lang));
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  }

  // Esc closes the dropdown first, the card staying; then the card, focus
  // back on the menu button.
  await page.keyboard.press("Escape");
  await expect(pdfs).toHaveCount(0);
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Download" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);
  await expect(menuButton(page)).toBeFocused();

  // A click outside closes it without moving the slide.
  await page.keyboard.press("m");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.mouse.click(30, 30);
  await expect(card(page)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`[?&]s=${T}(?!\\d)`));
  await expect(menuButton(page)).toBeFocused();
  expect(errors).toEqual([]);
});

test("menu: reopened while it closes, the card turns back from where it is", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await openDeck(page);
  await page.keyboard.press("m");
  await expect.poll(() => clipping(card(page))).toBe(false);
  await card(page).evaluate((el) => Object.assign(el, { usCard: true }));
  await startSampling(page);
  await page.keyboard.press("m");
  await page.waitForTimeout(120);
  await page.keyboard.press("m");
  await expect.poll(() => clipping(card(page))).toBe(false);
  await page.waitForTimeout(100);
  const frames = await stopSampling(page);
  // The same card, open again, never unmounted.
  expect(
    await card(page).evaluate((el) => (el as { usCard?: boolean }).usCard),
  ).toBe(true);
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  // Its clip's top edge went down part of the way and came back up from
  // there: one turn, never restarting from the button's box (a fresh "in"
  // would jump to it first).
  const tops = frames.map((frame) => insets(frame.clip)?.[0] ?? 0);
  const furthest = Math.max(...tops);
  const turn = tops.indexOf(furthest);
  const shutTop = await page.evaluate(() => {
    const button = document
      .querySelector('[aria-label="Menu"][aria-haspopup]')!
      .getBoundingClientRect();
    const box = document
      .querySelector("[data-menu-card]")!
      .getBoundingClientRect();
    return button.top - box.top;
  });
  test.info().annotations.push({
    type: "reopen: clip top inset per frame",
    description: tops.map((top) => top.toFixed(1)).join(" "),
  });
  expect(furthest).toBeGreaterThan(5);
  expect(furthest).toBeLessThan(shutTop);
  // The spring's steps only shrink on the way out, so a restart would show
  // as the step into the turn being the largest; it is not.
  const steps = tops.slice(1, turn + 1).map((top, i) => top - tops[i]!);
  if (steps.length > 1)
    expect(steps.at(-1)!).toBeLessThanOrEqual(
      Math.max(...steps.slice(0, -1)) + 1,
    );
  tops.forEach((top, i) => {
    if (i === 0) return;
    const step = top - tops[i - 1]!;
    if (i <= turn) expect(step, `frame ${i}`).toBeGreaterThan(-0.5);
    else expect(step, `frame ${i}`).toBeLessThan(0.5);
  });
  expect(tops.at(-1)).toBe(0);
  expect(errors).toEqual([]);
});

test("menu: one arrow on Previous and Next, the F hint", async ({ page }) => {
  await openDeck(page);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  // Previous and Next: the chevron alone, no arrow-key hint beside it.
  for (const name of ["Previous", "Next"]) {
    const control = menu.getByRole("button", { name, exact: true });
    await expect(control).toBeVisible();
    await expect(control.locator("[data-icon]")).toHaveCount(1);
    await expect(control.locator("kbd")).toHaveCount(0);
    await expect(control).not.toContainText(/[←→]/);
  }
  // On a desktop the Fullscreen control keeps its F hint.
  const hint = menu
    .getByRole("button", { name: /Fullscreen/ })
    .locator("kbd", { hasText: "F" });
  await expect(hint).toBeVisible();
});

test("menu: muted controls drop their opacity and the F hint reads", async ({
  page,
}) => {
  await openDeck(page, 1);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  // Everything below waits until the card has finished growing out of its
  // button (its spring.surface open settles in about 650 ms; the controls
  // row travels with it, so an early click can land behind the card).
  await page.waitForTimeout(1_200);
  const previous = menu.getByRole("button", { name: "Previous", exact: true });
  const next = menu.getByRole("button", { name: "Next", exact: true });
  // On the first slide Previous can't be used: the same look as Next, at
  // the muted opacity, announced as unavailable, and inert to clicks.
  await expect(previous).toHaveAttribute("aria-disabled", "true");
  await expect
    .poll(() => previous.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("0.5");
  const look = (el: Element) => {
    const style = getComputedStyle(el);
    return [
      style.backgroundImage,
      style.backgroundColor,
      style.borderColor,
      style.color,
    ].join("|");
  };
  expect(await previous.evaluate(look)).toBe(await next.evaluate(look));
  expect(await next.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await previous.click({ force: true });
  await expect(page).toHaveURL(/s=1(?!\d)/);

  // The F hint reads in secondary text, as the labels beside it.
  const hint = menu.getByRole("button", { name: /Fullscreen/ }).locator("kbd");
  const [hintColour, secondary] = await hint.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--deck-text-secondary)";
    el.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return [getComputedStyle(el).color, colour];
  });
  expect(hintColour).toBe(secondary);
});

test("menu: Download opens a dropdown of the PDFs, in the popup and the overview", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await openDeck(page);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  for (const where of ["popup", "overview"] as const) {
    const dialog =
      where === "popup" ? menu : page.getByRole("dialog", { name: "Overview" });
    const download = dialog.getByRole("button", {
      name: "Download",
      exact: true,
    });
    await expect(download).toHaveCount(1);
    await expect(download.locator("[data-icon='download']")).toHaveCount(1);
    await expect(dialog.locator('a[href^="/pdf/"]')).toHaveCount(0);
    await download.click();
    const pdfs = page.getByRole("menu");
    await expect(pdfs).toBeVisible();
    const items = pdfs.getByRole("menuitem");
    await expect(items).toHaveCount(langs.length);
    for (const [i, lang] of langs.entries()) {
      const href = pdfHref(lang);
      await expect(items.nth(i)).toContainText("PDF");
      await expect(items.nth(i)).toHaveAttribute("href", href);
      const pdf = await page.request.get(href);
      expect(pdf.status(), href).toBe(200);
      expect(pdf.headers()["content-type"]).toContain("application/pdf");
    }
    // Choosing one downloads it; the dropdown closes and the card stays.
    const saved = page.waitForEvent("download");
    await items.first().click();
    expect((await saved).suggestedFilename()).toBe(
      pdfHref(langs[0]).split("/").at(-1),
    );
    await expect(pdfs).toHaveCount(0);
    await expect(dialog).toBeVisible();
    // By keys: Enter opens it on its first item, Esc closes it alone.
    await download.focus();
    await page.keyboard.press("Enter");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(pdfs).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(download).toBeFocused();
    // A press outside the open dropdown closes it, not the card.
    await download.click();
    await expect(pdfs).toBeVisible();
    // At a person's pace: Radix listens for a press outside from a task
    // after it opens, which a press sent at once can beat.
    await page.waitForTimeout(250);
    await page.mouse.click(30, 30);
    await expect(pdfs).toHaveCount(0);
    await expect(dialog).toBeVisible();
    if (where === "popup") await page.keyboard.press("o");
  }
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("menu: Download in the footer, the list scrolling between hard edges", async ({
  page,
}) => {
  await openDeck(page, 1);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await page.waitForTimeout(1_200);
  for (const view of ["popup", "expanded"] as const) {
    if (view === "expanded")
      await menu.getByRole("button", { name: "Expand" }).click();
    const dialog = page.getByRole("dialog", {
      name: view === "popup" ? "Menu" : "Overview",
    });
    await page.waitForTimeout(1_200);
    const header = dialog.locator("header");
    const footer = dialog.locator("[data-menu-footer]");
    // Header: title, Expand or Minimize, Close.
    await expect(
      header.getByRole("button", { name: /^(Expand|Minimize)$/ }),
    ).toHaveCount(1);
    // Footer: Previous, Next, Download (Fullscreen where it works).
    for (const name of [/^Previous/, /^Next/, /^Download/])
      await expect(footer.getByRole("button", { name })).toHaveCount(1);
    // Nothing else holds them, and the section labels are gone.
    await expect(dialog.getByRole("button", { name: /^Download/ })).toHaveCount(
      1,
    );
    await expect(
      dialog.getByRole("heading", { name: /^(Slides|Downloads|Language)$/i }),
    ).toHaveCount(0);
    // The scroller sits right between the header's line and the footer's.
    const edges = await dialog.evaluate((card) => {
      const box = (selector: string) =>
        card.querySelector(selector)!.getBoundingClientRect();
      return {
        line: box("hr").bottom,
        top: box("[data-menu-viewport]").top,
        bottom: box("[data-menu-viewport]").bottom,
        footer: box("[data-menu-footer]").top,
      };
    });
    expect(Math.abs(edges.top - edges.line)).toBeLessThanOrEqual(1);
    expect(Math.abs(edges.footer - edges.bottom)).toBeLessThanOrEqual(1);
    // Scrolling moves the list only: header and footer stay.
    const still = () =>
      Promise.all(
        [
          header.getByRole("button", { name: "Close", exact: true }),
          footer.getByRole("button", { name: /^Download/ }),
        ].map((locator) =>
          locator.evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        ),
      );
    const before = await still();
    // (A list that fits has nothing to scroll.)
    const [scrolled, overflows] = await dialog
      .locator("[data-menu-viewport]")
      .evaluate((el) => [
        ((el.scrollTop = 300), el.scrollTop),
        el.scrollHeight > el.clientHeight,
      ]);
    if (overflows) expect(scrolled).toBeGreaterThan(0);
    expect(await still()).toEqual(before);
  }
});

test("menu: its footer stays one line, opening, expanding and at rest, in every language", async ({
  page,
}) => {
  // The menu's footer stays one line. The row travels out of the
  // button at the button's width (popup-motion.ts), and on a phone its
  // controls are wider than the card: neither may wrap it. A label gives
  // (an ellipsis); no control leaves the line.
  const errors = watchConsole(page);
  const S = Math.min(slides.length, 3);
  await openDeck(page, S);
  const own = page.viewportSize()!;
  const footer = page.locator("[data-menu-footer]");
  /** Every painted frame: the controls' rows, the most lines any control's
   *  text takes, the row's height, and how far a control overflows it. */
  const sample = () =>
    page.evaluate(() => {
      const w = window as unknown as { rowFrames: unknown[]; rowOn: boolean };
      w.rowFrames = [];
      w.rowOn = true;
      const tick = () => {
        const row = document.querySelector("[data-menu-footer]");
        if (row) {
          const box = row.getBoundingClientRect();
          const controls = [...row.querySelectorAll("button")].filter(
            (button) => button.getClientRects().length > 0,
          );
          // The lines a control's shown text takes (a name only read out,
          // as Download's on a phone, is out of the flow and not counted).
          const lines = (control: Element) => {
            const tops = new Set<number>();
            const walk = document.createTreeWalker(
              control,
              NodeFilter.SHOW_TEXT,
            );
            for (let text = walk.nextNode(); text; text = walk.nextNode()) {
              if (getComputedStyle(text.parentElement!).position === "absolute")
                continue;
              const range = document.createRange();
              range.selectNodeContents(text);
              for (const rect of range.getClientRects())
                if (rect.width > 0) tops.add(Math.round(rect.top));
            }
            return tops.size;
          };
          w.rowFrames.push({
            rows: new Set(
              controls.map((c) => Math.round(c.getBoundingClientRect().top)),
            ).size,
            lines: Math.max(1, ...controls.map(lines)),
            height: box.height,
            overflow: Math.max(
              0,
              ...controls.map(
                (c) => c.getBoundingClientRect().right - box.right,
              ),
            ),
          });
        }
        if (w.rowOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  const frames = () =>
    page.evaluate(() => {
      const w = window as unknown as {
        rowFrames: {
          rows: number;
          lines: number;
          height: number;
          overflow: number;
        }[];
        rowOn: boolean;
      };
      w.rowOn = false;
      return w.rowFrames;
    });
  for (const size of [own, { width: 844, height: 390 }])
    for (const lang of langs) {
      await page.setViewportSize(size);
      await page.goto(`/?s=${S}${lang === langs[0] ? "" : `&lang=${lang}`}`);
      await page.waitForFunction(
        () => !document.documentElement.hasAttribute("data-arriving"),
      );
      const where = `${size.width}x${size.height} ${lang}`;
      const toggle = card(page).locator("header > button").first();
      for (const step of ["open", "expand", "minimize"] as const) {
        await sample();
        if (step === "open")
          await page.locator("[data-footer-menu] button").click();
        else await toggle.click();
        await expect(card(page)).toHaveAttribute(
          "data-view",
          step === "expand" ? "expanded" : "popup",
        );
        await expect.poll(() => clipping(card(page))).toBe(false);
        await page.waitForTimeout(900);
        const run = await frames();
        const at = `${where}, ${step}`;
        expect(run.length, at).toBeGreaterThan(2);
        expect(Math.max(...run.map((f) => f.rows)), at).toBe(1);
        expect(Math.max(...run.map((f) => f.lines)), at).toBe(1);
        const heights = run.map((f) => f.height);
        expect(Math.max(...heights) - Math.min(...heights), at).toBeLessThan(1);
        // At rest every control is inside the row, Download last.
        expect(run.at(-1)!.overflow, at).toBeLessThanOrEqual(1);
        await expect(
          footer.getByRole("button", { name: /^Download/ }),
        ).toBeInViewport({ ratio: 1 });
      }
      await page.keyboard.press("Escape");
      await expect(card(page)).toHaveCount(0);
    }
  expect(errors).toEqual([]);
});

test("menu: closing fades the content, then the glass, as the ⋯ comes back in the last 150 ms", async ({
  page,
}) => {
  // The close in its final 150 ms: the content fades out on
  // `exit` as the close starts; the clip keeps its spring.surface close; in
  // its last `exit` the card's glass fades out, ending as the clip ends, and
  // the menu button, hidden while the card is up, fades in on `fade`.
  const errors = watchConsole(page);
  await openDeck(page);
  type CloseFrame = {
    ms: number | null;
    end: number | null;
    card: boolean;
    glass: number;
    content: number;
    trigger: number;
  };
  const triggerOpacity = () =>
    menuButton(page).evaluate((el) => parseFloat(getComputedStyle(el).opacity));
  const cases = [
    { name: "popup, Esc", expand: false, close: "esc" },
    { name: "popup, ×", expand: false, close: "x" },
    { name: "expanded, Esc", expand: true, close: "esc" },
    { name: "expanded, ×", expand: true, close: "x" },
  ] as const;
  for (const c of cases) {
    await page.keyboard.press(c.expand ? "o" : "m");
    await expect(card(page)).toHaveAttribute(
      "data-view",
      c.expand ? "expanded" : "popup",
    );
    await expect.poll(() => clipping(card(page))).toBe(false);
    await page.waitForTimeout(700);
    // Hidden while the card is up, still there to focus.
    expect(await triggerOpacity(), c.name).toBe(0);
    await expect(menuButton(page)).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as {
        closeFrames: unknown[];
        closeOn: boolean;
      };
      w.closeFrames = [];
      w.closeOn = true;
      let start: number | null = null;
      let end: number | null = null;
      const trigger = document.querySelector<HTMLElement>(
        '[aria-label="Menu"][aria-haspopup]',
      )!;
      const tick = () => {
        const el = document.querySelector<HTMLElement>("[data-menu-card]");
        const now = Number(document.timeline.currentTime);
        const clip = el
          ?.getAnimations()
          .find((a) =>
            (a.effect as KeyframeEffect | null)
              ?.getKeyframes()
              .some((frame) => "clipPath" in frame),
          );
        if (start === null && clip?.startTime != null) {
          start = Number(clip.startTime);
          end = Number(clip.effect!.getComputedTiming().endTime);
        }
        // Each part's opacity as drawn: its own and every ancestor's up to
        // the card (the card's own is the glass's).
        const seen = (node: Element) => {
          let o = 1;
          for (let a: Element | null = node; a && a !== el; a = a.parentElement)
            o *= parseFloat(getComputedStyle(a).opacity);
          return o;
        };
        const parts = el
          ? [
              ...el.querySelectorAll(
                "header h2, header [role='radiogroup'], header > button, hr, [data-menu-viewport], [data-menu-footer]",
              ),
            ]
          : [];
        w.closeFrames.push({
          ms: start === null ? null : now - start,
          end,
          card: Boolean(el),
          glass: el ? parseFloat(getComputedStyle(el).opacity) : 0,
          content: Math.max(0, ...parts.map(seen)),
          trigger: parseFloat(getComputedStyle(trigger).opacity),
        });
        if (w.closeOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (c.close === "esc") await page.keyboard.press("Escape");
    else
      await card(page)
        .getByRole("button", { name: "Close", exact: true })
        .click();
    await expect(card(page)).toHaveCount(0);
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => {
      const w = window as unknown as {
        closeFrames: CloseFrame[];
        closeOn: boolean;
      };
      w.closeOn = false;
      return w.closeFrames;
    });
    const timed = frames.filter(
      (f): f is CloseFrame & { ms: number; end: number } => f.ms !== null,
    );
    const end = timed[0]!.end;
    // The last `exit` (150 ms) of the clip: where the glass and the ⋯ fade.
    const last = end - 150;
    test.info().annotations.push({
      type: `close (${c.name}): ms content glass ⋯ per frame`,
      description: timed
        .map(
          (f) =>
            `${f.ms.toFixed(0)} ${f.card ? f.content.toFixed(2) : "-"} ${f.card ? f.glass.toFixed(2) : "-"} ${f.trigger.toFixed(2)}`,
        )
        .join(" | "),
    });
    expect(timed.length, c.name).toBeGreaterThan(20);
    expect(end, c.name).toBeGreaterThan(400);
    for (const f of timed) {
      const at = `${c.name}, ${f.ms.toFixed(1)} ms`;
      // Nothing rides inside the shrinking card.
      if (f.card && f.ms >= 150 + 1)
        expect(f.content, at).toBeLessThanOrEqual(0.01);
      // The glass stays whole until its fade, and is gone when the clip is.
      if (f.ms < last - 1) {
        expect(f.glass, at).toBeGreaterThanOrEqual(0.99);
        expect(f.trigger, at).toBeLessThanOrEqual(0.01);
      }
      if (f.card && f.ms >= end - 1)
        expect(f.glass, at).toBeLessThanOrEqual(0.01);
    }
    expect(timed.some((f) => f.trigger > 0.01 && f.trigger < 0.99)).toBe(true);
    expect(await triggerOpacity(), c.name).toBe(1);
    // Nothing is left over it.
    const box = (await menuButton(page).boundingBox())!;
    expect(
      await page.evaluate(
        ([x, y]) =>
          Boolean(
            document
              .elementFromPoint(x!, y!)
              ?.closest('[aria-label="Menu"][aria-haspopup]'),
          ),
        [box.x + box.width / 2, box.y + box.height / 2],
      ),
      c.name,
    ).toBe(true);
    await page.waitForTimeout(300);
  }
  expect(errors).toEqual([]);
});

test("menu: under reduced motion the menu closes at once, its button shown at once", async ({
  page,
}) => {
  // Principle 6: nothing animates. The button is hidden while the card is
  // up and shown in the frame the card goes.
  const errors = watchConsole(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto("/?s=3");
  await page.waitForFunction(
    () => !document.documentElement.hasAttribute("data-arriving"),
  );
  for (const key of ["m", "o"]) {
    await page.keyboard.press(key);
    await expect(card(page)).toBeVisible();
    expect(
      await menuButton(page).evaluate((el) => getComputedStyle(el).opacity),
    ).toBe("0");
    await page.evaluate(() => {
      const w = window as unknown as { rmFrames: unknown[]; rmOn: boolean };
      w.rmFrames = [];
      w.rmOn = true;
      const trigger = document.querySelector<HTMLElement>(
        '[aria-label="Menu"][aria-haspopup]',
      )!;
      const tick = () => {
        w.rmFrames.push({
          card: Boolean(document.querySelector("[data-menu-card]")),
          trigger: parseFloat(getComputedStyle(trigger).opacity),
          running: trigger.getAnimations().length,
        });
        if (w.rmOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0);
    await page.waitForTimeout(200);
    const frames = await page.evaluate(() => {
      const w = window as unknown as {
        rmFrames: { card: boolean; trigger: number; running: number }[];
        rmOn: boolean;
      };
      w.rmOn = false;
      return w.rmFrames;
    });
    // Gone by the next painted frame, the button whole in it.
    expect(frames.length, key).toBeGreaterThan(3);
    expect(frames.at(-1)!.card, key).toBe(false);
    for (const [i, f] of frames.entries()) {
      expect(f.trigger, `${key}, frame ${i}`).toBe(f.card ? 0 : 1);
      expect(f.running, `${key}, frame ${i}`).toBe(0);
    }
  }
  expect(errors).toEqual([]);
});
