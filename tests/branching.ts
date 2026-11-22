import { expect, type Locator } from "@playwright/test";

// The branching connector (feature 002, T123, the owner's review of the
// diagram presets: "as is but round corner and splitting zones"; "take the
// three branching for example. should curved left and right and one goes
// down center aswell"). Wherever one node branches to several (the org
// chart preset, and feature 001's org and fork blocks), the children sit
// below the parent and the line splits downward from it: the outer branches
// curve left and right with rounded corners, and a middle branch, when the
// count is odd, goes straight down. The line keeps its colour.
//
// A split is a `[data-split]` list right after its parent's card; each item
// is `[data-split-item]` with its `data-side` (left, middle or right), its
// card first, and draws its share of the line in its ::before and ::after.

type Piece = {
  shown: boolean;
  width: number;
  height: number;
  radius: number;
  colours: string[];
};
type Box = { left: number; right: number; top: number; bottom: number };
export type Split = {
  parent: Box;
  /** The split's own ::before: the stem from the parent. */
  stem: Piece;
  items: { side: string | null; card: Box; before: Piece; after: Piece }[];
};

/** The parent, its children's cards and every piece of the line. */
export function measureSplit(split: Locator): Promise<Split> {
  return split.evaluate((ul) => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const piece = (el: Element, which: "::before" | "::after") => {
      const s = getComputedStyle(el, which);
      const shown = s.content !== "none" && s.display !== "none";
      const colours: string[] = [];
      if (shown) {
        if (s.backgroundColor !== "rgba(0, 0, 0, 0)")
          colours.push(s.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const)
          if (parseFloat(s[`border${side}Width`]) > 0)
            colours.push(s[`border${side}Color`]);
      }
      return {
        shown,
        width: parseFloat(s.width) || 0,
        height: parseFloat(s.height) || 0,
        radius: Math.max(
          ...[
            s.borderTopLeftRadius,
            s.borderTopRightRadius,
            s.borderBottomRightRadius,
            s.borderBottomLeftRadius,
          ].map((r) => parseFloat(r) || 0),
        ),
        colours,
      };
    };
    return {
      parent: box(ul.previousElementSibling!),
      stem: piece(ul, "::before"),
      items: [...ul.children]
        .filter((li) => li.hasAttribute("data-split-item"))
        .map((li) => ({
          side: li.getAttribute("data-side"),
          card: box(li.firstElementChild!),
          before: piece(li, "::before"),
          after: piece(li, "::after"),
        })),
    };
  });
}

/** The sides of `n` children: left of the middle, the middle when `n` is
 *  odd, right of it. */
export const sides = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    i * 2 < n - 1 ? "left" : i * 2 === n - 1 ? "middle" : "right",
  );

/** A split drawn across: the children below the parent, side by side; a
 *  middle child's line straight down under the parent's centre; each outer
 *  child's line curving, with a rounded corner; every piece in `colour`. */
export function expectSplitAcross(m: Split, colour: string, at: string) {
  const n = m.items.length;
  expect(
    m.items.map((item) => item.side),
    at,
  ).toEqual(sides(n));
  const centre = (b: Box) => (b.left + b.right) / 2;
  for (const [i, item] of m.items.entries()) {
    const where = `${at}: child ${i + 1} of ${n}`;
    expect(item.card.top, `${where} below its parent`).toBeGreaterThan(
      m.parent.bottom,
    );
    if (i > 0)
      expect(item.card.left, `${where} beside the one before`).toBeGreaterThan(
        m.items[i - 1].card.right - 1,
      );
    const pieces = [item.before, item.after].filter((p) => p.shown);
    expect(pieces.length, `${where} draws its line`).toBeGreaterThan(0);
    if (item.side === "middle") {
      // Straight down: one thin vertical piece, no corner, under the
      // parent's centre.
      expect(pieces, where).toHaveLength(1);
      expect(pieces[0].width, where).toBeLessThanOrEqual(2.5);
      expect(pieces[0].height, where).toBeGreaterThan(4);
      expect(pieces[0].radius, where).toBe(0);
      expect(centre(item.card), where).toBeCloseTo(centre(m.parent), 0);
    } else {
      // Curving out: a rounded corner.
      expect(
        Math.max(...pieces.map((p) => p.radius)),
        `${where} curves`,
      ).toBeGreaterThan(2);
    }
    for (const colour_ of pieces.flatMap((p) => p.colours))
      expect(colour_, `${where} line colour`).toBe(colour);
  }
  expect(m.stem.shown, `${at}: the stem from the parent`).toBe(true);
  for (const colour_ of m.stem.colours)
    expect(colour_, `${at}: stem colour`).toBe(colour);
}

/** A split drawn down (where across cannot fit): the children below the
 *  parent, one under another, each joined by its line in `colour`. */
export function expectSplitDown(m: Split, colour: string, at: string) {
  for (const [i, item] of m.items.entries()) {
    const where = `${at}: child ${i + 1}`;
    expect(item.card.top, `${where} below its parent`).toBeGreaterThan(
      m.parent.bottom,
    );
    if (i > 0)
      expect(item.card.top, `${where} under the one before`).toBeGreaterThan(
        m.items[i - 1].card.bottom - 1,
      );
    const colours = [item.before, item.after].flatMap((p) => p.colours);
    expect(colours.length, `${where} draws its line`).toBeGreaterThan(0);
    for (const colour_ of colours)
      expect(colour_, `${where} line colour`).toBe(colour);
  }
}
