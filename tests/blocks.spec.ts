import { expect, test, type Page } from "@playwright/test";
import { slideContent, stepsStyle, type Block } from "../src/deck/content";
import { slides } from "../src/deck/slides";
import { gallery } from "../src/presets/gallery";
import { expectSplitAcross, expectSplitDown, measureSplit } from "./branching";

// The slide blocks the owner reviewed in the merged build (spec, "After
// reviewing the merged build"; T043, T047), at 390 and 1440 (the two
// projects):
//   - every step label (its `when`, or its number) uses the navigator's
//     muted step label style ("Muted step label only"): the questionnaire's
//     small "n / N" label, set in the muted text colour at the regular
//     weight, with its numbers in tabular figures, smaller than the step's
//     own text;
//   - after the final build (T050: "No circles, muted step labels"; "A and B
//     should be both options"), the steps block draws in two styles: a rail
//     (a thin line down the left, a small dot per step on it, the label,
//     title and regular muted body beside it) and across (dots on a line, the
//     label above it, the title and body below, stacked as a rail on a
//     phone); no number sits in a circle or badge anywhere, and a numbered
//     point's number is a muted step label above its title;
//   - the facts, numbered points, week and plan blocks are composed from the
//     Averlo design system: their cards are the same Averlo `Panel` as the
//     points cards (the owner did not flag those), every word of the block
//     sits on a card, no card is empty, and nothing is drawn dashed.

/** The first slide (1-based) holding a block that matches, and its block. */
function find(match: (block: Block) => boolean) {
  for (let i = 0; i < slides.length; i++) {
    const block = slideContent(slides[i].id).blocks.find(match);
    if (block) return { n: i + 1, block };
  }
  return null;
}

const openDeck = (page: Page, s: number) => openPath(page, `/?s=${s}`);

async function openPath(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(path);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

/** The live slide's block of `type` (the n-th of that type). */
const blockOn = (type: Block["type"], nth = 0) =>
  `main:not([aria-hidden]) [data-block="${type}"] >> nth=${nth}`;

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

// ------------------------------------------------------------ step labels ---

/** A step's label as drawn: its `when`, or its number, zero-padded. */
const stepLabel = (when: string | undefined, i: number) =>
  when ?? String(i + 1).padStart(2, "0");

/** How a live steps block is laid out: per step, its dot, its label, title
 *  and text boxes and their looks; and the block's line pieces. */
async function measureSteps(page: Page, nth = 0) {
  return page.locator(blockOn("steps", nth)).evaluate((block) => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    };
    const list = block.querySelector("ol")!;
    const steps = [...list.querySelectorAll(":scope > li")].map((li) => {
      const dot = li.querySelector("[data-step-dot]");
      const label = li.querySelector("[data-step-label]");
      const title = li.querySelector("[data-variant='title-l']");
      const text = li.querySelector("[data-variant='body-m']");
      const look = (el: Element | null) => {
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          color: s.color,
          weight: s.fontWeight,
          numbers: s.fontVariantNumeric,
          size: parseFloat(s.fontSize),
          lineHeight: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
        };
      };
      const lineHeight = label
        ? parseFloat(getComputedStyle(label).lineHeight)
        : NaN;
      const ds = dot ? getComputedStyle(dot) : null;
      return {
        status: li.getAttribute("data-status"),
        labelText: label?.textContent?.trim() ?? null,
        dot: box(dot),
        dotLook: ds
          ? {
              background: ds.backgroundColor,
              radius: ds.borderTopLeftRadius,
            }
          : null,
        label: box(label),
        firstLine: label
          ? {
              top: label.getBoundingClientRect().top,
              y: label.getBoundingClientRect().top + lineHeight / 2,
            }
          : null,
        title: box(title),
        text: box(text),
        labelLook: look(label),
        titleLook: look(title),
        textLook: look(text),
      };
    });
    // The line: every drawn piece of it (the block's and each step's
    // pseudo-elements, and any [data-step-line]).
    const lines: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      colour: string;
    }[] = [];
    const els = [list, ...list.querySelectorAll("*")];
    for (const el of els) {
      for (const which of ["::before", "::after", null] as const) {
        if (which === null && !el.hasAttribute("data-step-line")) continue;
        const s = getComputedStyle(el, which);
        if (which && (s.content === "none" || s.display === "none")) continue;
        if (el.hasAttribute("data-step-dot")) continue;
        if (s.backgroundColor === "rgba(0, 0, 0, 0)") continue;
        const w = parseFloat(s.width);
        const h = parseFloat(s.height);
        if (!(w > 0 && h > 0)) continue;
        // Thin: a line, not a dot.
        if (Math.min(w, h) > 3) continue;
        const host = el.getBoundingClientRect();
        const left = which ? host.left + parseFloat(s.left || "0") : host.left;
        const top = which ? host.top + parseFloat(s.top || "0") : host.top;
        lines.push({
          left,
          right: left + w,
          top,
          bottom: top + h,
          colour: s.backgroundColor,
        });
      }
    }
    return { style: list.getAttribute("data-style"), steps, lines };
  });
}

for (const style of ["rail", "across"] as const) {
  test(`steps (${style}): every step has the muted step label, its \`when\` or its number`, async ({
    page,
  }) => {
    const found = find(
      (block) => block.type === "steps" && stepsStyle(block.style) === style,
    );
    expect(found, `a steps block in the ${style} style`).not.toBeNull();
    const { n, block } = found!;
    if (block.type !== "steps") throw new Error("not steps");
    await openDeck(page, n);
    const muted = await tokenColor(page, "--color-muted");
    const m = await measureSteps(page);
    expect(m.style).toBe(style);
    expect(m.steps).toHaveLength(block.items.length);
    for (const [i, step] of m.steps.entries()) {
      const at = `step ${i + 1}: ${JSON.stringify(step)}`;
      expect(step.labelText, at).toBe(stepLabel(block.items[i].when?.en, i));
      const look = step.labelLook!;
      expect(look.color, at).toBe(muted);
      expect(look.weight, at).toBe("400");
      expect(look.numbers, at).toContain("tabular-nums");
      expect(look.lineHeight, at).toBeCloseTo(1.5, 1);
      expect(look.size, `${at}: smaller than the title`).toBeLessThan(
        step.titleLook!.size * 0.8,
      );
      if (step.textLook) {
        expect(look.size, `${at}: smaller than the text`).toBeLessThan(
          step.textLook.size,
        );
        // The body: regular, in the muted text colour.
        expect(step.textLook.weight, at).toBe("400");
        expect(step.textLook.color, at).toBe(muted);
      }
      // Top to bottom: the label, the title, then the text.
      expect(step.label!.bottom, at).toBeLessThanOrEqual(step.title!.top + 1);
      if (step.text)
        expect(step.title!.bottom, at).toBeLessThanOrEqual(step.text.top + 1);
    }
  });

  test(`steps (${style}): a small round dot per step on a thin solid line, the current one the accent`, async ({
    page,
  }, info) => {
    const found = find(
      (block) => block.type === "steps" && stepsStyle(block.style) === style,
    );
    const { n, block } = found!;
    if (block.type !== "steps") throw new Error("not steps");
    await openDeck(page, n);
    const accent = await tokenColor(page, "--deck-text-accent");
    const muted = await tokenColor(page, "--color-muted");
    const strong = await tokenColor(page, "--deck-border-strong");
    const m = await measureSteps(page);
    const at = JSON.stringify(m);
    // Across stacks as a rail on a phone.
    const down = style === "rail" || info.project.name === "mobile";
    for (const [i, step] of m.steps.entries()) {
      const dot = step.dot!;
      expect(dot, `step ${i + 1}: a dot`).not.toBeNull();
      expect(dot.width, at).toBeCloseTo(dot.height, 0);
      expect(dot.width, `${at}: about 8px`).toBeGreaterThanOrEqual(5);
      expect(dot.width, `${at}: about 8px`).toBeLessThanOrEqual(10);
      expect(step.dotLook!.radius, at).toMatch(/50%|^\d{2,}px|9999/);
      const status = block.items[i].status ?? "upcoming";
      expect(step.status, at).toBe(status);
      expect(step.dotLook!.background, at).toBe(
        status === "current" ? accent : muted,
      );
      if (down) {
        // Beside the dot, one column: the dot left of the label, title and
        // text, on the label's first line.
        for (const part of [step.label, step.title, step.text])
          if (part) expect(dot.right, at).toBeLessThan(part.left);
        expect(step.label!.left, at).toBeCloseTo(step.title!.left, 0);
        if (step.text)
          expect(step.text.left, at).toBeCloseTo(step.title!.left, 0);
        expect(Math.abs(dot.y - step.firstLine!.y), at).toBeLessThanOrEqual(
          1.5,
        );
      } else {
        // On one line across: the dot at the step's left edge, the label
        // above the line, the title and the text below it.
        expect(dot.left, at).toBeCloseTo(step.title!.left, 0);
        expect(dot.y, at).toBeCloseTo(m.steps[0].dot!.y, 0);
        expect(step.label!.bottom, at).toBeLessThanOrEqual(dot.top + 0.5);
        expect(step.title!.top, at).toBeGreaterThanOrEqual(dot.bottom - 0.5);
      }
    }
    // Steps evenly spaced: equal gaps between each step's dot.
    const gaps = m.steps
      .slice(1)
      .map((s, i) =>
        down ? s.dot!.y - m.steps[i].dot!.y : s.dot!.x - m.steps[i].dot!.x,
      );
    for (const gap of gaps) expect(gap, at).toBeGreaterThan(0);
    // The line: thin, solid, in the strong border colour, and it runs
    // through every dot from the first to the last.
    expect(m.lines.length, `${at}: a line`).toBeGreaterThan(0);
    for (const line of m.lines) expect(line.colour, at).toBe(strong);
    const first = m.steps[0].dot!;
    const last = m.steps.at(-1)!.dot!;
    if (down) {
      const top = Math.min(...m.lines.map((l) => l.top));
      const bottom = Math.max(...m.lines.map((l) => l.bottom));
      expect(top, at).toBeLessThanOrEqual(first.y + 0.5);
      expect(bottom, at).toBeGreaterThanOrEqual(last.y - 0.5);
      for (const line of m.lines) {
        expect(line.right - line.left, at).toBeLessThanOrEqual(2);
        expect((line.left + line.right) / 2, at).toBeCloseTo(first.x, 0);
      }
    } else {
      const left = Math.min(...m.lines.map((l) => l.left));
      const right = Math.max(...m.lines.map((l) => l.right));
      expect(left, at).toBeLessThanOrEqual(first.x + 0.5);
      expect(right, at).toBeGreaterThanOrEqual(last.x - 0.5);
      for (const line of m.lines) {
        expect(line.bottom - line.top, at).toBeLessThanOrEqual(2);
        expect((line.top + line.bottom) / 2, at).toBeCloseTo(first.y, 0);
      }
    }
  });
}

test("the steps block's styles: rail by default, and the old nodes name draws across", () => {
  expect(stepsStyle(undefined)).toBe("rail");
  expect(stepsStyle("rail")).toBe("rail");
  expect(stepsStyle("across")).toBe("across");
  expect(stepsStyle("nodes")).toBe("across");
});

test("numbered points: each number a muted step label above its title, no badge", async ({
  page,
}) => {
  const found = find((b) => b.type === "points" && b.style === "numbered");
  expect(found, "a numbered points block").not.toBeNull();
  const { n, block } = found!;
  if (block.type !== "points") throw new Error("not points");
  await openDeck(page, n);
  const muted = await tokenColor(page, "--color-muted");
  const nth = slideContent(slides[n - 1].id)
    .blocks.filter((b) => b.type === "points")
    .indexOf(block);
  const items = await page
    .locator(blockOn("points", nth))
    .locator("ol > li")
    .evaluateAll((items) =>
      items.map((li) => {
        const label = li.querySelector("[data-step-label]");
        const title = li.querySelector("[data-variant='title-l']")!;
        const s = label ? getComputedStyle(label) : null;
        return {
          text: label?.textContent?.trim() ?? null,
          color: s?.color,
          weight: s?.fontWeight,
          numbers: s?.fontVariantNumeric,
          size: s ? parseFloat(s.fontSize) : NaN,
          titleSize: parseFloat(getComputedStyle(title).fontSize),
          above: label
            ? label.getBoundingClientRect().bottom <=
              title.getBoundingClientRect().top + 1
            : false,
          left: label
            ? Math.abs(
                label.getBoundingClientRect().left -
                  title.getBoundingClientRect().left,
              )
            : NaN,
        };
      }),
    );
  expect(items).toHaveLength(block.items.length);
  for (const [i, item] of items.entries()) {
    const at = `point ${i + 1}: ${JSON.stringify(item)}`;
    expect(item.text, at).toBe(String(i + 1).padStart(2, "0"));
    expect(item.color, at).toBe(muted);
    expect(item.weight, at).toBe("400");
    expect(item.numbers, at).toContain("tabular-nums");
    expect(item.size, at).toBeLessThan(item.titleSize * 0.8);
    expect(item.above, at).toBe(true);
    expect(item.left, at).toBeLessThan(1);
  }
});

// No number circles or badges anywhere (spec 001, "After reviewing the
// merged build": "No circles, muted step labels"): on every slide of the
// placeholder deck and the preset gallery, no round box (a radius of half
// its size or more) with a fill or a border holds only digits.
async function badges(page: Page) {
  return page
    .locator("main:not([aria-hidden]) [data-kind]")
    .evaluate((slide) => {
      const found: string[] = [];
      for (const el of slide.querySelectorAll<HTMLElement>("*")) {
        const text = el.textContent?.trim() ?? "";
        if (!/^\d+$/.test(text)) continue;
        if (!el.checkVisibility({ opacityProperty: true })) continue;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const radius = s.borderTopLeftRadius;
        const round = radius.endsWith("%")
          ? parseFloat(radius) >= 50
          : parseFloat(radius) >= Math.min(r.width, r.height) / 2 - 0.5;
        if (!round || parseFloat(radius) === 0) continue;
        const filled = s.backgroundColor !== "rgba(0, 0, 0, 0)";
        const bordered = ["Top", "Right", "Bottom", "Left"].some(
          (side) =>
            parseFloat(
              s.getPropertyValue(`border-${side.toLowerCase()}-width`),
            ) > 0 &&
            s.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none",
        );
        if (filled || bordered)
          found.push(
            `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}: ${text}`,
          );
      }
      return found;
    });
}

for (const deck of [
  { name: "placeholder deck", path: "/", n: slides.length },
  { name: "preset gallery", path: "/gallery", n: gallery.slides.length },
]) {
  test(`${deck.name}: no number sits in a circle or a badge`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "checked at 1440");
    test.setTimeout(30_000 + deck.n * 5_000);
    const found: string[] = [];
    for (let s = 1; s <= deck.n; s++) {
      await openPath(page, `${deck.path}?s=${s}`);
      found.push(...(await badges(page)).map((b) => `slide ${s}: ${b}`));
    }
    expect(found).toEqual([]);
  });
}

// ------------------------------------------------- Averlo-composed blocks ---

/** What a card draws, as the page computes it. */
type Look = {
  background: string;
  border: string;
  radius: string;
  shadow: string;
  backdrop: string;
};

const cases: {
  name: string;
  match: (block: Block) => boolean;
  type: Block["type"];
}[] = [
  { name: "facts", match: (b) => b.type === "facts", type: "facts" },
  {
    name: "numbered points",
    match: (b) => b.type === "points" && b.style === "numbered",
    type: "points",
  },
  { name: "week", match: (b) => b.type === "week", type: "week" },
  { name: "plan", match: (b) => b.type === "plan", type: "plan" },
];

test("the facts, numbered points, week and plan blocks are Averlo cards, like the points cards", async ({
  page,
}) => {
  // The reference: a points card (the default style), which the owner kept.
  const cardsStyle = (b: Block) =>
    b.type === "points" && (b.style ?? "cards") === "cards";
  const points = find(cardsStyle);
  expect(points, "a points block in the cards style").not.toBeNull();
  await openDeck(page, points!.n);
  const nthOf = (
    n: number,
    type: Block["type"],
    match: (b: Block) => boolean,
  ) =>
    slideContent(slides[n - 1].id)
      .blocks.filter((b) => b.type === type)
      .findIndex(match);
  const look = (selector: string) =>
    page.locator(selector).evaluate((block) => {
      const card = [...block.querySelectorAll<HTMLElement>("*")].find(
        (el) => getComputedStyle(el).backdropFilter !== "none",
      );
      if (!card) return null;
      const s = getComputedStyle(card);
      return {
        background: s.backgroundColor,
        border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
        radius: s.borderTopLeftRadius,
        shadow: s.boxShadow,
        backdrop: s.backdropFilter,
      };
    });
  const reference = (await look(
    blockOn("points", nthOf(points!.n, "points", cardsStyle)),
  )) as Look | null;
  expect(reference, "the points card").not.toBeNull();

  for (const item of cases) {
    const found = find(item.match);
    expect(found, `a ${item.name} block`).not.toBeNull();
    const { n } = found!;
    await openDeck(page, n);
    const selector = blockOn(item.type, nthOf(n, item.type, item.match));
    const report = await page.locator(selector).evaluate((block) => {
      const visible = (el: Element) =>
        el.checkVisibility({ opacityProperty: true });
      const all = [...block.querySelectorAll<HTMLElement>("*")].filter(visible);
      // The outermost glass cards.
      const cards = all.filter(
        (el) =>
          getComputedStyle(el).backdropFilter !== "none" &&
          !all.some(
            (other) =>
              other !== el &&
              other.contains(el) &&
              getComputedStyle(other).backdropFilter !== "none",
          ),
      );
      const looks = cards.map((card) => {
        const s = getComputedStyle(card);
        return {
          background: s.backgroundColor,
          border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
          radius: s.borderTopLeftRadius,
          shadow: s.boxShadow,
          backdrop: s.backdropFilter,
        };
      });
      // Anything drawn dashed or dotted, on any side.
      const dashed = all
        .filter((el) => {
          const s = getComputedStyle(el);
          return ["Top", "Right", "Bottom", "Left"].some((side) => {
            const style = s.getPropertyValue(
              `border-${side.toLowerCase()}-style`,
            );
            const width = parseFloat(
              s.getPropertyValue(`border-${side.toLowerCase()}-width`),
            );
            return width > 0 && (style === "dashed" || style === "dotted");
          });
        })
        .map(
          (el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`,
        );
      // Every visible word of the block, and whether it sits on a card.
      const loose: string[] = [];
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (!text || !node.parentElement || !visible(node.parentElement))
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width < 1 || r.height < 1) continue;
          const inside = cards.some((card) => {
            const c = card.getBoundingClientRect();
            return (
              r.left >= c.left - 0.5 &&
              r.right <= c.right + 0.5 &&
              r.top >= c.top - 0.5 &&
              r.bottom <= c.bottom + 0.5
            );
          });
          if (!inside) loose.push(text);
        }
      }
      // A card with no word on it.
      const empty = cards.filter((card) => !card.innerText.trim()).length;
      return { count: cards.length, looks, dashed, loose, empty };
    });
    const at = `${item.name} (slide ${n})`;
    expect(report.count, `${at}: Averlo cards`).toBeGreaterThan(0);
    for (const card of report.looks)
      expect(card, `${at}: drawn as the points card`).toEqual(reference);
    expect(report.dashed, `${at}: nothing dashed`).toEqual([]);
    expect(report.loose, `${at}: every word on a card`).toEqual([]);
    expect(report.empty, `${at}: no empty card`).toBe(0);
  }
});

test("facts and numbered points sit cleanly beside the headline", async ({
  page,
}, info) => {
  const facts = find((b) => b.type === "facts");
  expect(facts).not.toBeNull();
  const n = facts!.n;
  const content = slideContent(slides[n - 1].id);
  test.skip(
    !content.layout?.startsWith("split"),
    "the facts are not in a split slide",
  );
  await openDeck(page, n);
  const m = await page.evaluate(() => {
    const slide = document.querySelector(
      "main:not([aria-hidden]) [data-kind]",
    )!;
    const box = (el: Element | null) => {
      const r = el!.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const blocks = [...slide.querySelectorAll("[data-block]")].map((block) => ({
      type: block.getAttribute("data-block"),
      box: box(block),
      // Each block's cards, as laid out.
      cards: [...block.querySelectorAll<HTMLElement>("*")]
        .filter((el) => getComputedStyle(el).backdropFilter !== "none")
        .map(box),
    }));
    return {
      head: box(slide.querySelector("[data-page-section]")),
      body: box(slide.querySelector("[data-slide-body]")),
      blocks,
    };
  });
  const at = JSON.stringify(m);
  // Side by side where the slide is wide; one column on a portrait phone.
  if (info.project.name === "desktop") {
    const apart =
      m.body.right <= m.head.left + 0.5 || m.head.right <= m.body.left + 0.5;
    expect(apart, `the blocks beside the headline: ${at}`).toBe(true);
  }
  // The blocks share one column: the same left and right edges.
  for (const block of m.blocks) {
    expect(block.box.left, at).toBeCloseTo(m.blocks[0].box.left, 0);
    expect(block.box.right, at).toBeCloseTo(m.blocks[0].box.right, 0);
  }
  // In each block, cards on one line share their top and their height, and
  // the cards together span the block's width.
  for (const block of m.blocks) {
    if (!block.cards.length) continue;
    const rows = new Map<number, typeof block.cards>();
    for (const card of block.cards) {
      const key = Math.round(card.top);
      rows.set(key, [...(rows.get(key) ?? []), card]);
    }
    for (const row of rows.values()) {
      const heights = row.map((card) => card.bottom - card.top);
      expect(Math.max(...heights) - Math.min(...heights), at).toBeLessThan(1);
      expect(Math.min(...row.map((c) => c.left)), at).toBeCloseTo(
        block.box.left,
        0,
      );
      expect(Math.max(...row.map((c) => c.right)), at).toBeCloseTo(
        block.box.right,
        0,
      );
    }
  }
});

// ------------------------------------------------------------- branching ---

// Feature 002's T123 (the owner's review of the diagram presets, "as is but
// round corner and splitting zones"; "take the three branching for example.
// should curved left and right and one goes down center aswell"): the org
// and fork blocks branch the same way as the org chart preset. The children
// sit below the root, the line splits downward from it, the outer branches
// curve with rounded corners and a middle one goes straight down; the line
// keeps its colour, the deck's strong border. On a phone the split stays
// across while two or fewer children fit beside each other; more are listed
// one under another, still below the root.
for (const type of ["org", "fork"] as const) {
  test(`${type}: the children sit below the root, the line splitting down to them with rounded corners`, async ({
    page,
  }, testInfo) => {
    const found = find((block) => block.type === type);
    expect(found, type).toBeTruthy();
    const block = found!.block as Extract<Block, { type: typeof type }>;
    await openDeck(page, found!.n);
    const strong = await tokenColor(page, "--deck-border-strong");
    const split = await measureSplit(
      page.locator(blockOn(type)).locator("[data-split]").first(),
    );
    expect(split.items).toHaveLength(block.items.length);
    if (testInfo.project.name !== "mobile" || block.items.length <= 2)
      expectSplitAcross(split, strong, type);
    else expectSplitDown(split, strong, type);
  });
}
