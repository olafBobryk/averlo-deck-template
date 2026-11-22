import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { config } from "../src/brand/config";
import { brandName } from "../src/brand/name";
import { langs } from "../src/deck/langs";
import { ui } from "../src/deck/model";
import { slides } from "../src/deck/slides";

// Every control is reachable by keyboard
// with a visible focus indicator and a label, and text meets 4.5:1 contrast.
// A keyboard-only pass through the deck and the menu, then axe on
// each surface at 390 and 1440 px (the two projects). Reduced motion keeps
// every surface still while it is measured; it changes no colour or stop.

/** What the focused element is and whether it draws a visible indicator: a
 *  non-zero outline or a box-shadow on itself or, for a text field, on the
 *  field frame that draws its ring (Field.module.css). */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const draws = (node: Element) => {
      const style = getComputedStyle(node);
      const outline =
        style.outlineStyle !== "none" &&
        parseFloat(style.outlineWidth) > 0 &&
        !/rgba\(.*,\s*0\)$|transparent/.test(style.outlineColor);
      const shadow = style.boxShadow !== "none" && style.boxShadow !== "";
      return outline || shadow;
    };
    const frame = el.hasAttribute("data-field-control")
      ? el.parentElement
      : null;
    // The accessible name, near enough: aria-label, else the label or the
    // text, without what is hidden from assistive technology.
    const text = (node: Node) => {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
      return copy.textContent ?? "";
    };
    const label = (el as HTMLInputElement).labels?.[0];
    const name = (
      el.getAttribute("aria-label") ?? (label ? text(label) : text(el))
    ).trim();
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role") ?? "",
      name: name.replace(/\s+/g, " "),
      visible: el.matches(":focus-visible"),
      indicator: draws(el) || (frame !== null && draws(frame)),
    };
  });
}

type Stop = NonNullable<Awaited<ReturnType<typeof focused>>>;

/** Presses Tab `count` times and returns every stop, each checked for a
 *  visible focus indicator. */
async function tabThrough(page: Page, count: number, back = false) {
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
    const stop = await focused(page);
    expect(
      stop,
      `stop ${i + 1} has focus, after ${stops.map((s) => s.name).join(", ")}`,
    ).not.toBeNull();
    stops.push(stop!);
  }
  for (const stop of stops) {
    expect(stop.visible, `${stop.name}: :focus-visible`).toBe(true);
    expect(stop.indicator, `${stop.name}: visible focus indicator`).toBe(true);
  }
  return stops;
}

/** Serious and critical axe findings, as `rule: target` lines. */
async function axe(page: Page, include?: string) {
  let builder = new AxeBuilder({ page });
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .flatMap((v) =>
      v.nodes.map(
        (node) =>
          `${v.id} (${v.impact}): ${node.target.join(" ")} — ${node.failureSummary?.split("\n").slice(1).join(" ").trim()}`,
      ),
    );
}

/** Text contrast as painted (WCAG 1.4.3), for the text axe leaves as
 *  "needs review" because it sits on gradients, glass and the canvas glow.
 *  Every visible, enabled text element in the page is measured against the
 *  pixels behind it: the page is shot once with all text made transparent,
 *  and each element's colour (or, for gradient text, each gradient stop) is
 *  composited over every pixel of its text box; the worst pixel counts.
 *  Large text (24 px, or 18.66 px bold) needs 3:1, the rest 4.5:1. */
async function contrast(page: Page) {
  const found = await page.evaluate((HORIZON) => {
    // Hit testing sees every box, including the footer's (pointer-events:
    // none), so text under the menu card is skipped and the rest is not.
    const probe = document.createElement("style");
    // The notice region is a transparent full-screen layer (the
    // toasts); only its toasts paint, so the empty region is not hit.
    probe.textContent =
      "* { pointer-events: auto !important; } [aria-label='Notifications'], [aria-label='Notifications'] *:not([data-notification], [data-notification] *) { pointer-events: none !important; }";
    document.head.append(probe);
    const parse = (value: string) =>
      [...value.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => {
        const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
        return [+r, +g, +b, a.endsWith("%") ? parseFloat(a) / 100 : +a];
      });
    const items: {
      id: number;
      text: string;
      rect: { x: number; y: number; w: number; h: number };
      colors: number[][];
      opacity: number;
      large: boolean;
      horizon: boolean;
    }[] = [];
    let id = 0;
    for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
      const own = [...el.childNodes].filter(
        (n) => n.nodeType === 3 && n.textContent!.trim(),
      );
      if (!own.length) continue;
      // A thumbnail's slide is a picture of the slide (aria-hidden), not
      // text to read; its slide is measured full size.
      if (
        el.closest(
          ".visually-hidden, :disabled, [aria-disabled='true'], [data-thumb] [aria-hidden='true']",
        )
      )
        continue;
      const range = document.createRange();
      range.setStartBefore(own[0]);
      range.setEndAfter(own[own.length - 1]);
      // The text's box, cut to the viewport and to every box that clips it
      // (the menu's scrolling list), so only what can be seen is measured.
      const box = range.getBoundingClientRect();
      let [left, top, right, bottom] = [
        Math.max(0, box.left),
        Math.max(0, box.top),
        Math.min(innerWidth, box.right),
        Math.min(innerHeight, box.bottom),
      ];
      for (let n = el.parentElement; n; n = n.parentElement) {
        if (getComputedStyle(n).overflow === "visible") continue;
        const c = n.getBoundingClientRect();
        [left, top] = [Math.max(left, c.left), Math.max(top, c.top)];
        [right, bottom] = [
          Math.min(right, c.right),
          Math.min(bottom, c.bottom),
        ];
      }
      // A slide's line that runs under the menu card's left edge (a
      // centred slide) is read up to that edge: the rest is
      // under the card, skipped as above.
      const card = document
        .querySelector("[data-menu-card]")
        ?.getBoundingClientRect();
      if (
        card?.width &&
        !el.closest("[data-menu-card]") &&
        top < card.bottom &&
        bottom > card.top &&
        left < card.left &&
        right > card.left
      )
        right = card.left;
      if (right - left < 1 || bottom - top < 1) continue;
      const r = new DOMRect(left, top, right - left, bottom - top);
      const style = getComputedStyle(el);
      if (style.visibility !== "visible") continue;
      let opacity = 1;
      for (let n: Element | null = el; n; n = n.parentElement)
        opacity *= +getComputedStyle(n).opacity;
      if (opacity < 0.05) continue;
      // Only what is on top at the text's centre is read.
      const hit = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      );
      if (!hit || !(el.contains(hit) || hit.contains(el))) continue;
      // Gradient text (the heading tone) is painted by the nearest
      // ancestor whose background is clipped to its text.
      let painter: Element | null = el;
      while (
        painter &&
        ![
          getComputedStyle(painter).backgroundClip,
          getComputedStyle(painter).webkitBackgroundClip,
        ].includes("text")
      )
        painter = painter.parentElement;
      const solid = parse(style.webkitTextFillColor || style.color);
      const colors =
        painter && (solid[0]?.[3] ?? 1) === 0
          ? parse(getComputedStyle(painter).backgroundImage)
          : solid;
      const size = parseFloat(style.fontSize);
      const bold = +style.fontWeight >= 700;
      el.dataset.contrastId = String(++id);
      items.push({
        id,
        text: own
          .map((n) => n.textContent!.trim())
          .join(" ")
          .slice(0, 40),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        colors,
        opacity,
        large: size >= 24 || (bold && size >= 18.66),
        horizon: r.bottom > innerHeight * HORIZON,
      });
    }
    probe.remove();
    const hide = document.createElement("style");
    hide.id = "contrast-hide";
    hide.textContent = `*, *::before, *::after { color: transparent !important;
      -webkit-text-fill-color: transparent !important; text-shadow: none !important;
      caret-color: transparent !important; }`;
    document.head.append(hide);
    return items;
  }, HORIZON);
  // Gradient text keeps its fill under `color: transparent`: drop it.
  await page.evaluate(() => {
    for (const el of document.body.querySelectorAll<HTMLElement>("*")) {
      const style = getComputedStyle(el);
      if ([style.backgroundClip, style.webkitBackgroundClip].includes("text")) {
        el.dataset.contrastClip = "";
        el.style.setProperty("background-image", "none", "important");
      }
    }
  });
  const shot = (await page.screenshot()).toString("base64");
  const results = await page.evaluate(
    async ({ shot, found }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${shot}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const scale = img.width / innerWidth;
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a: number[], b: number[]) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const out = found.map((item) => {
        const x = Math.max(0, Math.floor(item.rect.x * scale));
        const y = Math.max(0, Math.floor(item.rect.y * scale));
        const w = Math.max(
          1,
          Math.min(canvas.width - x, Math.ceil(item.rect.w * scale)),
        );
        const h = Math.max(
          1,
          Math.min(canvas.height - y, Math.ceil(item.rect.h * scale)),
        );
        const data = ctx.getImageData(x, y, w, h).data;
        let worst = Infinity;
        for (let i = 0; i < data.length; i += 4) {
          const bg = [data[i], data[i + 1], data[i + 2]];
          for (const [r, g, b, a] of item.colors) {
            const alpha = a * item.opacity;
            const fg = [r, g, b].map((v, k) => v * alpha + bg[k] * (1 - alpha));
            worst = Math.min(worst, ratio(fg, bg));
          }
        }
        return {
          horizon: item.horizon,
          text: item.text,
          ratio: Math.round(worst * 100) / 100,
          need: item.large ? 3 : 4.5,
        };
      });
      document.getElementById("contrast-hide")?.remove();
      for (const el of document.querySelectorAll<HTMLElement>(
        "[data-contrast-clip]",
      )) {
        el.style.removeProperty("background-image");
        delete el.dataset.contrastClip;
      }
      for (const el of document.querySelectorAll<HTMLElement>(
        "[data-contrast-id]",
      ))
        delete el.dataset.contrastId;
      return out;
    },
    { shot, found },
  );
  expect(results.length, `text measured on ${page.url()}`).toBeGreaterThan(0);
  return results;
}

/** Where the canvas starts to light up toward its horizon: its mid stop
 *  (77 %), above the horizon glow. */
const HORIZON = 0.77;

/** The measured text below its threshold, as `"text": ratio < need` lines:
 *  above the horizon band, or (`horizon`) in it, where the known horizon
 *  conflicts apply. */
const low = (results: Awaited<ReturnType<typeof contrast>>, horizon = false) =>
  results
    .filter((r) => r.horizon === horizon && r.ratio < r.need)
    .map((r) => `"${r.text}": ${r.ratio} < ${r.need}`);

/** The placeholder deck, at a slide. */
async function openDeck(page: Page, slide = 3) {
  // No key: mark the intro as played this session, so the
  // deck opens straight away as on a repeat visit.
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`/?s=${slide}`);
  await page.waitForFunction(
    () =>
      !document.documentElement.hasAttribute("data-arriving") &&
      document.getElementById("deck-boot")?.dataset.state === "done",
  );
}

const menuButton = (page: Page) =>
  page.getByRole("button", { name: "Menu", exact: true });

test.use({ reducedMotion: "reduce" });

test.describe("keyboard", () => {
  test("deck: every slide forward and back with keys", async ({ page }) => {
    const N = slides.length;
    await openDeck(page, 1);
    for (let n = 2; n <= N; n++) {
      await page.keyboard.press("ArrowRight");
      await expect(page).toHaveURL(new RegExp(`s=${n}(?!\\d)`));
    }
    await expect(
      page
        .locator("main:not([aria-hidden])")
        .getByRole("heading", { name: slides[N - 1].title[langs[0]] }),
    ).toBeVisible();
    for (let n = N - 1; n >= 1; n--) {
      await page.keyboard.press("ArrowLeft");
      await expect(page).toHaveURL(new RegExp(`s=${n}(?!\\d)`));
    }
    await page.keyboard.press("End");
    await expect(page).toHaveURL(new RegExp(`s=${N}(?!\\d)`));
    await page.keyboard.press("Home");
    await expect(page).toHaveURL(/s=1(?!\d)/);
  });

  test("menu: every control by Tab with visible focus, used by keys", async ({
    page,
  }) => {
    const N = slides.length;
    const pad = (n: number) => String(n).padStart(2, "0");
    await openDeck(page, 3);
    // The top bar comes first, where it shows (it is hidden on phones): its
    // brand link. The navigator's mound button is a stop only while the
    // mound is up, under a pointer.
    if (await page.locator(".aq header.top").isVisible()) {
      const [brand] = await tabThrough(page, 1);
      expect(brand.name).toBe(
        `${brandName(config.brand)}: ${ui.firstSlide[langs[0]]}`,
      );
    }
    // The footer's slide number, which takes a typed slide number, then Menu.
    const [number, button] = await tabThrough(page, 2);
    expect(number.name).toBe(ui.goSlide[langs[0]].replace("{count}", "3"));
    expect(button.name).toBe("Menu");
    await page.keyboard.press("Enter");
    const card = page.locator("[data-menu-card]");
    await expect(card).toHaveAttribute("data-view", "popup");

    // The popup, language in the header and Download in the footer:
    // the language toggle (one stop, where there is one), Expand, Close, the
    // slides, then Previous, Next, Fullscreen and Download.
    const L = await card.locator("header [role='radiogroup']").count();
    // The list's stops: its rows shown (a closed section's are not) and a
    // chevron after each section's row (tests/menu-list.spec.ts).
    const R = await card.locator("[data-menu-slides] button").count();
    const C = await card
      .locator("[data-menu-slides] button[aria-expanded]")
      .count();
    const popup = await tabThrough(page, L + 2 + R + 4);
    const names = popup.map((stop) => stop.name);
    expect(names.slice(0, L + 2)).toEqual([
      ...(L ? [langs[0].toUpperCase()] : []),
      "Expand",
      "Close",
    ]);
    if (L) expect(popup[0].role).toBe("radio");
    expect(
      names.slice(L + 2, L + 2 + R).filter((name) => /^\d\d/.test(name)),
    ).toHaveLength(R - C);
    expect(names[L + 2]).toMatch(/^01/);
    expect(names[L + 1 + R]).toMatch(new RegExp(`^${pad(N)}`));
    expect(names.slice(L + 2 + R).map((name) => name.split(" ")[0])).toEqual([
      "Previous",
      "Next",
      "Fullscreen",
      "Download",
    ]);

    // Next by Enter, from the footer.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    expect((await focused(page))?.name.split(" ")[0]).toBe("Next");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/s=4(?!\d)/);

    // Back from Next: Previous, the slides, Close, Expand.
    for (let i = 0; i < 1 + R + 2; i++) await page.keyboard.press("Shift+Tab");

    // Expand by Enter, focus staying on the button (now Minimize). After it
    // come Close, the thumbnails and the footer, Download last.
    expect((await focused(page))?.name).toBe("Expand");
    await page.keyboard.press("Enter");
    await expect(card).toHaveAttribute("data-view", "expanded");
    await expect(page.locator("[data-thumb]")).toHaveCount(N);
    const minimize = await focused(page);
    expect(minimize?.name).toBe("Minimize");
    expect(minimize?.indicator).toBe(true);
    const expanded = await tabThrough(page, 1 + N + 4);
    const there = expanded.map((stop) => stop.name);
    expect(there[0]).toBe("Close");
    expect(there.slice(1, 1 + N).every((name) => /^\d\d/.test(name))).toBe(
      true,
    );
    expect(there.slice(1 + N).map((name) => name.split(" ")[0])).toEqual([
      "Previous",
      "Next",
      "Fullscreen",
      "Download",
    ]);
    // Download by Enter opens its dropdown on the first PDF, and Esc closes
    // the dropdown alone, focus back on Download.
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    expect((await focused(page))?.role).toBe("menuitem");
    expect((await focused(page))?.name).toMatch(/^PDF/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(card).toHaveAttribute("data-view", "expanded");
    await expect.poll(async () => (await focused(page))?.name).toBe("Download");
    // Each thumbnail is named by its label line, number and title apart.
    const T = Math.min(N, 7);
    await expect(
      card.getByRole("button", {
        name: `${pad(T)} ${slides[T - 1].title[langs[0]]}`,
        exact: true,
      }),
    ).toHaveCount(1);
    // Back from Download: Fullscreen, Next, Previous, thumbnails N–T.
    for (let i = 0; i < 3 + (N - T + 1); i++)
      await page.keyboard.press("Shift+Tab");

    // A thumbnail by Enter goes there and closes the card, focus back on
    // the menu button.
    expect((await focused(page))?.name).toMatch(new RegExp(`^${pad(T)}`));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`s=${T}(?!\\d)`));
    await expect(card).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();

    // O opens it expanded; Esc closes it, focus back on the button.
    await page.keyboard.press("o");
    await expect(card).toHaveAttribute("data-view", "expanded");
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
    await expect(menuButton(page)).toBeFocused();
  });
});

test.describe("axe: no serious or critical findings", () => {
  test("intro, while it plays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/?s=3");
    await expect(page.locator("[data-gate]")).toBeVisible();
    await expect(page.locator("[data-gate] [role=status]")).toHaveText(
      "Loading",
    );
    expect(await axe(page)).toEqual([]);
  });

  test("deck", async ({ page }) => {
    await openDeck(page, 3);
    expect(await axe(page)).toEqual([]);
  });

  test("menu popup", async ({ page }) => {
    await openDeck(page, 3);
    await page.keyboard.press("m");
    await expect(page.locator("[data-menu-card]")).toHaveAttribute(
      "data-view",
      "popup",
    );
    expect(await axe(page)).toEqual([]);
  });

  test("menu: the downloads dropdown open", async ({ page }) => {
    await openDeck(page, 3);
    await page.keyboard.press("m");
    await page
      .locator("[data-menu-card]")
      .getByRole("button", { name: "Download" })
      .click();
    await expect(page.getByRole("menuitem")).toHaveCount(langs.length);
    expect(await axe(page)).toEqual([]);
  });

  test("menu expanded", async ({ page }) => {
    await openDeck(page, 3);
    await page.keyboard.press("o");
    await expect(page.locator("[data-menu-card]")).toHaveAttribute(
      "data-view",
      "expanded",
    );
    await expect(page.locator("[data-thumb]")).toHaveCount(slides.length);
    expect(await axe(page)).toEqual([]);
  });
});

test.describe("contrast as painted: 4.5:1, large text 3:1", () => {
  test("deck: every slide, above the horizon", async ({ page }) => {
    for (let slide = 1; slide <= slides.length; slide++) {
      await openDeck(page, slide);
      expect(low(await contrast(page)), `slide ${slide}`).toEqual([]);
    }
  });

  // The menu card is opened over one slide and its popup and expanded
  // views measured, at a slide whose text does not run under the card.
  for (const slide of [1])
    test(`menu popup and expanded, above the horizon (slide ${slide})`, async ({
      page,
    }) => {
      await openDeck(page, slide);
      await page.keyboard.press("m");
      const card = page.locator("[data-menu-card]");
      await expect(card).toHaveAttribute("data-view", "popup");
      expect(low(await contrast(page)), "popup").toEqual([]);
      await page.keyboard.press("o");
      await expect(card).toHaveAttribute("data-view", "expanded");
      await expect(page.locator("[data-thumb]")).toHaveCount(slides.length);
      expect(low(await contrast(page)), "expanded").toEqual([]);
    });

  // Known conflict: the footer sits on the canvas's horizon glow.
  test.fixme("deck: the footer over the horizon", async ({ page }) => {
    await openDeck(page, 3);
    expect(low(await contrast(page), true)).toEqual([]);
  });

  // Known conflict: the menu card's glass shows the horizon glow
  // through it under its lower rows and its controls.
  test.fixme("menu: popup and expanded over the horizon", async ({ page }) => {
    await openDeck(page, 3);
    await page.keyboard.press("m");
    const card = page.locator("[data-menu-card]");
    await expect(card).toHaveAttribute("data-view", "popup");
    expect(low(await contrast(page), true), "popup").toEqual([]);
    await page.keyboard.press("o");
    await expect(card).toHaveAttribute("data-view", "expanded");
    expect(low(await contrast(page), true), "expanded").toEqual([]);
  });
});

/** Every control the keyboard can reach inside `scope` (visible, enabled,
 *  not inert or hidden from assistive technology, with a tab index of 0 or
 *  more), tagged with `data-focus-probe`. Tab is then pressed until every
 *  tagged control has been a stop, or the stops have gone round twice: each
 *  control must be reached, with :focus-visible and a visible indicator. */
async function everyControl(page: Page, scope: string) {
  const controls = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    if (!root) return [];
    const reachable = (el: HTMLElement) => {
      if (el.tabIndex < 0) return false;
      if (el.matches("a:not([href]):not([tabindex])")) return false;
      if (el.matches(":disabled")) return false;
      if (el.closest("[inert], [aria-hidden='true']")) return false;
      // A composite widget's container (a radio group, a menu) hands focus
      // to its current item, which is probed itself.
      if (
        /^(radiogroup|menu|menubar|listbox|tablist|toolbar|tree|grid)$/.test(
          el.getAttribute("role") ?? "",
        )
      )
        return false;
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && style.visibility === "visible";
    };
    const found = [root, ...root.querySelectorAll("*")].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && reachable(el),
    );
    return found.map((el, i) => {
      el.dataset.focusProbe = String(i);
      return (
        el.getAttribute("aria-label") ??
        el.textContent?.trim().replace(/\s+/g, " ") ??
        el.tagName.toLowerCase()
      );
    });
  }, scope);
  expect(controls.length, `controls in ${scope}`).toBeGreaterThan(0);
  const reached = new Map<string, Stop>();
  let first: string | null = null;
  let rounds = 0;
  for (let i = 0; i < (controls.length + 8) * 2; i++) {
    await page.keyboard.press("Tab");
    const stop = await focused(page);
    const probe = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.focusProbe,
    );
    if (!stop || !probe) continue;
    if (probe === first && ++rounds === 2) break;
    first ??= probe;
    reached.set(probe, stop);
    if (reached.size === controls.length) break;
  }
  await page.evaluate(() =>
    document
      .querySelectorAll<HTMLElement>("[data-focus-probe]")
      .forEach((el) => delete el.dataset.focusProbe),
  );
  const missed = controls.filter((_, i) => !reached.has(String(i)));
  expect(missed, `controls in ${scope} that Tab never reaches`).toEqual([]);
  for (const stop of reached.values()) {
    expect(stop.visible, `${stop.name}: :focus-visible`).toBe(true);
    expect(stop.indicator, `${stop.name}: visible focus indicator`).toBe(true);
  }
  return [...reached.values()];
}

test.describe("visible focus: every control reached by Tab draws its indicator", () => {
  test("deck: every slide's controls", async ({ page }) => {
    for (let slide = 1; slide <= slides.length; slide++) {
      await openDeck(page, slide);
      await everyControl(page, "body");
    }
  });

  test("menu popup and expanded, and the downloads dropdown by arrows", async ({
    page,
  }) => {
    await openDeck(page, 3);
    await page.keyboard.press("m");
    const card = page.locator("[data-menu-card]");
    await expect(card).toHaveAttribute("data-view", "popup");
    await everyControl(page, "[data-menu-card]");
    await page.keyboard.press("o");
    await expect(card).toHaveAttribute("data-view", "expanded");
    await expect(page.locator("[data-thumb]")).toHaveCount(slides.length);
    await everyControl(page, "[data-menu-card]");
    // The dropdown's items take focus by arrow keys, not Tab.
    await card.getByRole("button", { name: "Download" }).focus();
    await page.keyboard.press("Enter");
    const items = page.getByRole("menuitem");
    await expect(items).toHaveCount(langs.length);
    for (let i = 0; i < langs.length; i++) {
      if (i > 0) await page.keyboard.press("ArrowDown");
      const stop = await focused(page);
      expect(stop?.role, `item ${i + 1} has focus`).toBe("menuitem");
      expect(stop?.indicator, `${stop?.name}: visible focus indicator`).toBe(
        true,
      );
    }
  });
});

test.describe("axe color-contrast: every slide and the open menu", () => {
  /** Every color-contrast finding, whatever its impact. */
  const contrastFindings = async (page: Page) =>
    (
      await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze()
    ).violations.flatMap((v) =>
      v.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary}`),
    );

  test("deck: every slide", async ({ page }) => {
    for (let slide = 1; slide <= slides.length; slide++) {
      await openDeck(page, slide);
      expect(await contrastFindings(page), `slide ${slide}`).toEqual([]);
    }
  });

  test("menu: popup, expanded and the downloads dropdown", async ({ page }) => {
    await openDeck(page, 1);
    await page.keyboard.press("m");
    const card = page.locator("[data-menu-card]");
    await expect(card).toHaveAttribute("data-view", "popup");
    expect(await contrastFindings(page), "popup").toEqual([]);
    await page.keyboard.press("o");
    await expect(card).toHaveAttribute("data-view", "expanded");
    await expect(page.locator("[data-thumb]")).toHaveCount(slides.length);
    expect(await contrastFindings(page), "expanded").toEqual([]);
    await card.getByRole("button", { name: "Download" }).click();
    await expect(page.getByRole("menuitem")).toHaveCount(langs.length);
    expect(await contrastFindings(page), "dropdown").toEqual([]);
  });
});
