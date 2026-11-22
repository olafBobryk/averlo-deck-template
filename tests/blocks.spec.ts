import { expect, test, type Page } from "@playwright/test";
import { slideContent, type Block } from "../src/deck/content";
import { slides } from "../src/deck/slides";
import { expectSplitAcross, expectSplitDown, measureSplit } from "./branching";

// The slide blocks the owner reviewed in the merged build (spec, "After
// reviewing the merged build"; T043, T047), at 390 and 1440 (the two
// projects):
//   - the steps block keeps its layout, and every step label (its `when`, or
//     a node's number) uses the navigator's muted step label style ("Muted
//     step label only"): the questionnaire's small "n / N" label, set in the
//     muted text colour at the regular weight, with its numbers in tabular
//     figures, smaller than the step's own text; the nodes' circles are sized
//     to it, no longer oversized;
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

for (const style of ["rail", "nodes"] as const) {
  test(`steps (${style}): every step label in the navigator's muted step label style`, async ({
    page,
  }) => {
    const found = find(
      (block) => block.type === "steps" && (block.style ?? "rail") === style,
    );
    expect(found, `a steps block in the ${style} style`).not.toBeNull();
    const { n, block } = found!;
    if (block.type !== "steps") throw new Error("not steps");
    await openDeck(page, n);
    const muted = await tokenColor(page, "--color-muted");
    const steps = page.locator(blockOn("steps", 0)).locator(":scope > ol > li");
    await expect(steps).toHaveCount(block.items.length);
    // Each step's label: its `when` (rail), or its number (nodes).
    const labelled = block.items.filter(
      (item) => style === "nodes" || item.when,
    ).length;
    const labels = page
      .locator(blockOn("steps", 0))
      .locator("[data-step-label]");
    await expect(labels, "the step labels").toHaveCount(labelled);
    const looks = await labels.evaluateAll((labels) =>
      labels.map((label) => {
        const s = getComputedStyle(label);
        const step = label.closest("li")!;
        const sizeOf = (el: Element | null) =>
          el ? parseFloat(getComputedStyle(el).fontSize) : NaN;
        const title = step.querySelector("[data-variant='title-l']");
        const text = step.querySelector("[data-variant='body-m']");
        const circle = label.closest("[data-node]");
        const box = circle?.getBoundingClientRect();
        return {
          color: s.color,
          weight: s.fontWeight,
          numbers: s.fontVariantNumeric,
          size: parseFloat(s.fontSize),
          lineHeight: parseFloat(s.lineHeight) / parseFloat(s.fontSize),
          title: sizeOf(title),
          text: sizeOf(text),
          node: box ? { width: box.width, height: box.height } : null,
        };
      }),
    );
    for (const [i, look] of looks.entries()) {
      const at = `label ${i + 1}: ${JSON.stringify(look)}`;
      expect(look.color, at).toBe(muted);
      expect(look.weight, at).toBe("400");
      expect(look.numbers, at).toContain("tabular-nums");
      expect(look.lineHeight, at).toBeCloseTo(1.5, 1);
      expect(look.size, `${at}: smaller than the step's title`).toBeLessThan(
        look.title * 0.8,
      );
      if (!Number.isNaN(look.text))
        expect(look.size, `${at}: smaller than the step's text`).toBeLessThan(
          look.text,
        );
      if (style === "nodes") {
        expect(
          look.node,
          `${at}: a node's number sits in its circle`,
        ).not.toBeNull();
        // Sized to its label, not oversized: at most a little over twice the
        // step's title, and round.
        expect(look.node!.height, at).toBeLessThanOrEqual(look.title * 2);
        expect(look.node!.width, at).toBeCloseTo(look.node!.height, 0);
      }
    }
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
