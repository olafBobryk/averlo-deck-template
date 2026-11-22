import { expect, test, type Locator, type Page } from "@playwright/test";
import { langs } from "../src/deck/langs";
import type { Slide } from "../src/deck/model";
import { slides } from "../src/deck/slides";

// The menu popup's slide list (spec, "During P3": "I don't like the list"),
// the menu button's and controls row's geometry ("Keep origin geometry") and
// the phone's icon-only controls ("Icon-only on phones"), at 390 and 1440
// (the two projects).
//
// - Every slide is the same ghost button; only the current slide's row is
//   filled.
// - A section is a `divider` slide. Its slides are the ones after it with the
//   same `section`, up to the next divider; they are indented under its row.
// - The section's row has a chevron with `aria-expanded` and `aria-controls`
//   that opens and closes its slides without going anywhere; the row itself
//   goes to the section's slide. Only the current slide's section is open
//   when the menu opens, and opening another closes it.
// - The expanded overview is unchanged: every slide, one flat grid.

const lang = langs[0];
const N = slides.length;
const pad = (n: number) => String(n).padStart(2, "0");
const rowName = (n: number) => `${pad(n)} ${slides[n - 1].title[lang]}`;

type Section = { head: number; children: number[] };

/** The sections, from the data alone (1-based positions). */
function sectionsOf(deck: Slide[]): Section[] {
  const same = (a: Slide, b: Slide) =>
    a.section !== undefined &&
    b.section !== undefined &&
    langs.every((l) => a.section![l] === b.section![l]);
  const out: Section[] = [];
  deck.forEach((slide, i) => {
    if (slide.kind !== "divider") return;
    const children: number[] = [];
    for (
      let j = i + 1;
      j < deck.length && deck[j].kind !== "divider" && same(slide, deck[j]);
      j++
    )
      children.push(j + 1);
    if (children.length) out.push({ head: i + 1, children });
  });
  return out;
}

const sections = sectionsOf(slides);
const sectionOf = (n: number) =>
  sections.findIndex((s) => s.head === n || s.children.includes(n));

/** The menu button's box and the controls row's in the origin deck, at rest
 *  (measured in its build, at both widths; px). */
const ORIGIN = {
  trigger: 34,
  controlHeight: 29.59,
  // The controls at 1440: Previous, Next, Fullscreen, Download.
  controlWidths: [93, 68, 98, 100],
};

async function openDeck(page: Page, slide: number) {
  await page.emulateMedia({ reducedMotion: "reduce" });
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
const menu = (page: Page) => page.getByRole("dialog", { name: "Menu" });
const list = (page: Page) =>
  menu(page).getByRole("list", { name: "Slides", exact: true });
const row = (page: Page, n: number) =>
  list(page).getByRole("button", { name: rowName(n), exact: true });

async function openMenu(page: Page, slide: number) {
  await openDeck(page, slide);
  await menuButton(page).click();
  await expect(list(page)).toBeVisible();
}

/** The chevrons, in the list's order: one per section with slides. */
const chevrons = (page: Page) =>
  list(page).locator("button[aria-expanded][aria-controls]");

/** What a row draws: its classes, box and type. */
const look = (button: Locator) =>
  button.evaluate((el) => {
    const s = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      classes: [...el.classList].sort(),
      current: el.getAttribute("aria-current") === "true",
      left: box.left,
      height: box.height,
      font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight].join(" "),
      fill:
        s.backgroundImage !== "none" ||
        !/rgba\(.*,\s*0\)$|transparent/.test(s.backgroundColor),
    };
  });

/** The focused element: its name (without what is hidden from assistive
 *  technology), whether it is a chevron, and whether it draws its focus. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
    const style = getComputedStyle(el);
    const outline =
      style.outlineStyle !== "none" &&
      parseFloat(style.outlineWidth) > 0 &&
      !/rgba\(.*,\s*0\)$|transparent/.test(style.outlineColor);
    const shadow = style.boxShadow !== "none" && style.boxShadow !== "";
    return {
      name: (el.getAttribute("aria-label") ?? copy.textContent ?? "")
        .trim()
        .replace(/\s+/g, " "),
      chevron: el.hasAttribute("aria-expanded") && !!el.closest("ol"),
      expanded: el.getAttribute("aria-expanded"),
      visible: el.matches(":focus-visible"),
      indicator: outline || shadow,
    };
  });
}

/** Opens section `k` (0-based) by its chevron, if it is closed. */
async function openSection(page: Page, k: number) {
  const chevron = chevrons(page).nth(k);
  if ((await chevron.getAttribute("aria-expanded")) !== "true")
    await chevron.click();
  await expect(chevron).toHaveAttribute("aria-expanded", "true");
}

test.describe("the popup's slide list", () => {
  test("the placeholder deck has two sections with slides", () => {
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  test("every row is the same ghost button, only the current one filled", async ({
    page,
  }) => {
    const current = 3;
    await openMenu(page, current);
    const looks = new Map<number, Awaited<ReturnType<typeof look>>>();
    // Each section in turn, so every row is seen.
    for (let k = 0; k <= sections.length; k++) {
      if (k < sections.length) await openSection(page, k);
      for (let n = 1; n <= N; n++) {
        const button = row(page, n);
        if (!looks.has(n) && (await button.isVisible()))
          looks.set(n, await look(button));
      }
    }
    expect([...looks.keys()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: N }, (_, i) => i + 1),
    );
    const rest = [...looks.entries()].filter(([n]) => n !== current);
    const [, first] = rest[0];
    for (const [n, it] of rest) {
      expect(it.classes, `row ${n}: classes`).toEqual(first.classes);
      expect(it.height, `row ${n}: height`).toBeCloseTo(first.height, 1);
      expect(it.font, `row ${n}: font`).toBe(first.font);
      expect(it.fill, `row ${n}: no fill`).toBe(false);
      expect(it.current).toBe(false);
    }
    const it = looks.get(current)!;
    expect(it.current).toBe(true);
    expect(it.fill, "the current row keeps its highlight").toBe(true);
    // The highlight is the only difference.
    expect(first.classes.every((c) => it.classes.includes(c))).toBe(true);
    expect(it.height).toBeCloseTo(first.height, 1);
    expect(it.font).toBe(first.font);
  });

  test("a section's slides are indented under its row, behind a chevron", async ({
    page,
  }) => {
    await openMenu(page, 1);
    await expect(chevrons(page)).toHaveCount(sections.length);
    for (const [k, section] of sections.entries()) {
      const chevron = chevrons(page).nth(k);
      await expect(chevron).toHaveAttribute("aria-expanded", "false");
      // It controls an element that is there, open or closed.
      const id = (await chevron.getAttribute("aria-controls"))!;
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      const name = (await chevron.getAttribute("aria-label")) ?? "";
      expect(name).toMatch(/\S/);
      expect(name).not.toMatch(/^\d\d/);
      // Beside its section's row.
      const head = await row(page, section.head).boundingBox();
      const box = (await chevron.boundingBox())!;
      expect(box.y + box.height / 2).toBeCloseTo(head!.y + head!.height / 2, 0);
      for (const n of section.children) await expect(row(page, n)).toBeHidden();

      await chevron.click();
      await expect(chevron).toHaveAttribute("aria-expanded", "true");
      const region = page.locator(`[id="${id}"]`);
      for (const n of section.children) {
        await expect(row(page, n)).toBeVisible();
        await expect(
          region.getByRole("button", { name: rowName(n) }),
        ).toHaveCount(1);
        const child = (await row(page, n).boundingBox())!;
        expect(child.x, `slide ${n} indented`).toBeGreaterThan(head!.x + 4);
      }
      // Opening and closing goes nowhere, and the menu stays.
      await expect(page).toHaveURL(/[?&]s=1(?!\d)/);
      await chevron.click();
      await expect(chevron).toHaveAttribute("aria-expanded", "false");
      for (const n of section.children) await expect(row(page, n)).toBeHidden();
      await expect(page).toHaveURL(/[?&]s=1(?!\d)/);
      await expect(menu(page)).toBeVisible();
    }
  });

  test("a section's row goes to its slide, like any row", async ({ page }) => {
    const section = sections[1];
    await openMenu(page, 1);
    await row(page, section.head).click();
    await expect(page).toHaveURL(new RegExp(`[?&]s=${section.head}(?!\\d)`));
    await expect(page.locator("[data-menu-card]")).toHaveCount(0);
  });

  test("only the current slide's section is open; opening another closes it", async ({
    page,
  }) => {
    const states = async () =>
      Promise.all(
        sections.map((_, k) =>
          chevrons(page).nth(k).getAttribute("aria-expanded"),
        ),
      );
    // On a section's own slide, on its slides, and outside every section.
    const cases: [number, number][] = [
      [sections[0].head, 0],
      [sections[0].children[0], 0],
      [sections[1].children.at(-1)!, 1],
      [1, -1],
    ];
    for (const [slide, open] of cases) {
      expect(sectionOf(slide)).toBe(open);
      await openMenu(page, slide);
      expect(await states(), `opened on slide ${slide}`).toEqual(
        sections.map((_, k) => String(k === open)),
      );
      await expect(list(page).locator("[aria-current='true']")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-menu-card]")).toHaveCount(0);
    }
    await openMenu(page, sections[0].children[0]);
    await chevrons(page).nth(1).click();
    expect(await states()).toEqual(sections.map((_, k) => String(k === 1)));
    for (const n of sections[0].children)
      await expect(row(page, n)).toBeHidden();
    for (const n of sections[1].children)
      await expect(row(page, n)).toBeVisible();
  });

  test("Tab reaches every row and chevron with visible focus; Enter and Space work", async ({
    page,
  }) => {
    const current = sections[0].children[0];
    await openDeck(page, current);
    await page.keyboard.press("m");
    await expect(list(page)).toBeVisible();
    // Expected stops from the first row to the last: each row, a section's
    // chevron after its row, and the open section's slides after that.
    const expected: string[] = [];
    for (let n = 1; n <= N; n++) {
      const k = sectionOf(n);
      const section = sections[k];
      if (section && section.children.includes(n) && k !== sectionOf(current))
        continue;
      expected.push(pad(n));
      if (section?.head === n) expected.push("chevron");
    }
    let stop = await focused(page);
    for (let i = 0; i < 10 && !stop?.name.startsWith("01"); i++) {
      await page.keyboard.press("Tab");
      stop = await focused(page);
    }
    const stops: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      if (i > 0) {
        await page.keyboard.press("Tab");
        stop = await focused(page);
      }
      expect(stop?.visible, `${stop?.name}: :focus-visible`).toBe(true);
      expect(stop?.indicator, `${stop?.name}: focus indicator`).toBe(true);
      stops.push(stop!.chevron ? "chevron" : stop!.name.slice(0, 2));
    }
    expect(stops).toEqual(expected);
    await page.keyboard.press("Tab");
    expect((await focused(page))?.name).toMatch(/^Previous/);

    // The second section's chevron: Space opens it, Enter closes it, and
    // focus stays on it; neither goes anywhere.
    await chevrons(page).nth(1).focus();
    await page.keyboard.press(" ");
    await expect(chevrons(page).nth(1)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(chevrons(page).nth(0)).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(row(page, sections[1].children[0])).toBeVisible();
    await expect(chevrons(page).nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(chevrons(page).nth(1)).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page).toHaveURL(new RegExp(`[?&]s=${current}(?!\\d)`));
    // Enter on a section's row goes there.
    await row(page, sections[1].head).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(`[?&]s=${sections[1].head}(?!\\d)`),
    );
    await expect(menuButton(page)).toBeFocused();
  });

  // Owner, after reviewing the merged build: the chevron is a bare ghost
  // button with no hover background of its own; a row's hover covers its
  // whole width, chevron included ("purely visual").
  test("a section's row: one hover fill across its whole width, the chevron bare", async ({
    page,
  }) => {
    await openMenu(page, 1);
    // A section that is not the current slide's, so nothing is filled yet.
    const k = sections.findIndex(
      (s) => s.head !== 1 && !s.children.includes(1),
    );
    expect(k, "a section the first slide is not in").toBeGreaterThanOrEqual(0);
    const head = row(page, sections[k].head);
    const chevron = chevrons(page).nth(k);
    /** Every element from the chevron and the row up to the list item that
     *  draws a fill, and the chevron's and the row's own fills. */
    const fills = () =>
      chevron.evaluate((chevron) => {
        const item = chevron.closest("li")!;
        const rowButton = item.querySelector("button:not([aria-expanded])")!;
        const filled = (el: Element) =>
          !/rgba\(.*,\s*0\)$|transparent/.test(
            getComputedStyle(el).backgroundColor,
          );
        const boxOf = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        const drawn: {
          left: number;
          right: number;
          top: number;
          bottom: number;
        }[] = [];
        const seen = new Set<Element>();
        for (const start of [chevron, rowButton])
          for (
            let el: Element | null = start;
            el && el !== item;
            el = el.parentElement
          )
            if (!seen.has(el)) {
              seen.add(el);
              if (filled(el)) drawn.push(boxOf(el));
            }
        return {
          drawn,
          chevron: boxOf(chevron),
          row: boxOf(rowButton),
          chevronFilled: filled(chevron),
          rowFilled: filled(rowButton),
          hover: getComputedStyle(document.documentElement)
            .getPropertyValue("--color-background-hover")
            .trim(),
          colors: [chevron, rowButton].map(
            (el) => getComputedStyle(el).backgroundColor,
          ),
        };
      });
    const settle = () =>
      page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
          ),
      );

    // At rest: nothing filled.
    await page.mouse.move(0, 0);
    await settle();
    expect((await fills()).drawn, "at rest").toEqual([]);

    for (const [what, target] of [
      ["the chevron", chevron],
      ["the row", head],
    ] as const) {
      await target.hover();
      await settle();
      const it = await fills();
      expect(it.chevronFilled, `${what} hovered: the chevron has no fill`).toBe(
        false,
      );
      expect(
        it.rowFilled,
        `${what} hovered: the row has no fill of its own`,
      ).toBe(false);
      expect(it.drawn, `${what} hovered: one fill`).toHaveLength(1);
      const [fill] = it.drawn;
      expect(
        fill.left,
        `${what} hovered: from the row's left`,
      ).toBeLessThanOrEqual(it.row.left + 0.5);
      expect(
        fill.right,
        `${what} hovered: to the chevron's right`,
      ).toBeGreaterThanOrEqual(it.chevron.right - 0.5);
    }

    // Focus from the keyboard: a visible ring, still no fill of its own.
    await page.mouse.move(0, 0);
    await chevron.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(chevron).toBeFocused();
    await settle();
    const focus = await chevron.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        visible: el.matches(":focus-visible"),
        ring:
          (s.boxShadow !== "none" && s.boxShadow !== "") ||
          (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0),
        filled: !/rgba\(.*,\s*0\)$|transparent/.test(s.backgroundColor),
      };
    });
    expect(focus).toEqual({ visible: true, ring: true, filled: false });
  });

  test("reduced motion: a section opens and closes at once", async ({
    page,
  }) => {
    await openMenu(page, 1);
    const chevron = chevrons(page).nth(0);
    const id = (await chevron.getAttribute("aria-controls"))!;
    const settled = () =>
      page.evaluate(async (id) => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const region = document.getElementById(id)!;
        const moving = [region, ...region.querySelectorAll("*")].some((el) =>
          el.getAnimations().some((a) => a.playState === "running"),
        );
        return { height: region.getBoundingClientRect().height, moving };
      }, id);
    await chevron.click();
    const opened = await settled();
    expect(opened.moving).toBe(false);
    expect(opened.height).toBeGreaterThan(0);
    await expect(row(page, sections[0].children[0])).toBeVisible();
    await chevron.click();
    const closed = await settled();
    expect(closed.moving).toBe(false);
    expect(closed.height).toBe(0);
  });

  test("the expanded overview is unchanged: every slide, not grouped", async ({
    page,
  }) => {
    await openDeck(page, 3);
    await page.keyboard.press("o");
    const overview = page.getByRole("dialog", { name: "Overview" });
    await expect(overview).toBeVisible();
    const thumbs = overview.locator("[data-thumb]");
    await expect(thumbs).toHaveCount(N);
    const grid = await thumbs.evaluateAll((els) => {
      const lists = new Set(els.map((el) => el.closest("ol, ul")));
      const [only] = [...lists];
      return {
        lists: lists.size,
        items: only?.children.length ?? 0,
        // Lists other than the slides' own content in the thumbnails.
        nested: [...(only?.querySelectorAll("ol, ul") ?? [])].filter(
          (list) => !list.closest("[data-thumb]"),
        ).length,
      };
    });
    expect(grid).toEqual({ lists: 1, items: N, nested: 0 });
    await expect(
      overview.locator("[aria-expanded][aria-controls]"),
    ).toHaveCount(0);
  });
});

test.describe("the menu button and the controls row", () => {
  test("the origin's boxes: the menu button and the controls' height", async ({
    page,
  }) => {
    await openDeck(page, 3);
    const trigger = (await menuButton(page).boundingBox())!;
    expect(trigger.width).toBeCloseTo(ORIGIN.trigger, 1);
    expect(trigger.height).toBeCloseTo(ORIGIN.trigger, 1);
    await menuButton(page).click();
    const controls = menu(page).locator("[data-menu-footer] button");
    await expect(controls).toHaveCount(4);
    for (const box of await controls.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect),
    ))
      expect(box.height).toBeCloseTo(ORIGIN.controlHeight, 1);
  });

  test("wide: the controls' labels and the origin's widths", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 480, "a wide screen");
    await openMenu(page, 3);
    const controls = menu(page).locator("[data-menu-footer] button");
    const widths = await controls.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().width),
    );
    widths.forEach((width, i) =>
      expect(
        Math.abs(width - ORIGIN.controlWidths[i]),
        `control ${i + 1}`,
      ).toBeLessThanOrEqual(1),
    );
    for (const name of ["Previous", "Next", "Fullscreen"]) {
      const button = menu(page).getByRole("button", {
        name: new RegExp(`^${name}`),
      });
      await expect(button).toContainText(name);
      expect(await labelWidth(button)).toBeGreaterThan(20);
    }
  });

  test("a phone: Previous, Next and Fullscreen are icons, still named", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 480, "a phone");
    await openMenu(page, 3);
    for (const name of ["Previous", "Next", "Fullscreen"]) {
      const button = menu(page).getByRole("button", {
        name: new RegExp(`^${name}( F)?$`),
      });
      await expect(button).toHaveCount(1);
      expect(
        await labelWidth(button),
        `${name}: no label shown`,
      ).toBeLessThanOrEqual(1);
      const icon = (await button.locator("svg").first().boundingBox())!;
      expect(icon.width, `${name}: its icon`).toBeGreaterThan(8);
    }
    // Nothing truncated, no empty pill, and the row fits its card.
    const report = await menu(page)
      .locator("[data-menu-footer]")
      .evaluate((footer) => {
        const edge = footer.getBoundingClientRect();
        return [...footer.querySelectorAll("button")].map((button) => {
          const box = button.getBoundingClientRect();
          const inside = [...button.querySelectorAll<HTMLElement>("*")];
          const icons = inside.filter(
            (el) =>
              el instanceof SVGElement && el.getBoundingClientRect().width > 0,
          ).length;
          // The widest text drawn, cut down to the boxes that clip it.
          const shown = Math.max(
            0,
            ...inside
              .filter((child) =>
                [...child.childNodes].some(
                  (n) => n.nodeType === 3 && n.textContent?.trim(),
                ),
              )
              .map((child) => {
                let width = child.getBoundingClientRect().width;
                for (
                  let up = child.parentElement;
                  up && up !== button;
                  up = up.parentElement
                )
                  if (/hidden|clip/.test(getComputedStyle(up).overflowX))
                    width = Math.min(width, up.getBoundingClientRect().width);
                return width;
              }),
          );
          // A box that clips its own content while it is drawn wider than a
          // pixel: a truncated label (an ellipsis).
          const truncated = inside.some((el) => {
            const style = getComputedStyle(el);
            return (
              /hidden|clip/.test(style.overflowX) &&
              el.getBoundingClientRect().width > 1 &&
              el.scrollWidth > el.clientWidth + 0.5
            );
          });
          return {
            name: button.getAttribute("aria-label") ?? button.textContent,
            drawn: icons + (shown > 1 ? 1 : 0),
            truncated,
            inside:
              box.left >= edge.left - 0.5 && box.right <= edge.right + 0.5,
          };
        });
      });
    for (const control of report) {
      expect(control.drawn, `${control.name}: not empty`).toBeGreaterThan(0);
      expect(control.truncated, `${control.name}: truncated`).toBe(false);
      expect(control.inside, `${control.name}: inside the row`).toBe(true);
    }
  });
});

/** The widest piece of text a button shows: each text's box, cut down to
 *  every box around it, up to the button, that clips its content. */
const labelWidth = (button: Locator) =>
  button.evaluate((el) =>
    Math.max(
      0,
      ...[...el.querySelectorAll("*")]
        .filter((child) =>
          [...child.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent?.trim(),
          ),
        )
        .map((child) => {
          let width = child.getBoundingClientRect().width;
          for (
            let up = child.parentElement;
            up && up !== el;
            up = up.parentElement
          )
            if (/hidden|clip/.test(getComputedStyle(up).overflowX))
              width = Math.min(width, up.getBoundingClientRect().width);
          return width;
        }),
    ),
  );
