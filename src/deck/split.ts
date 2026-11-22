// Branching (template-owned; feature 002, T123, the owner's review of the
// diagram presets: "as is but round corner and splitting zones"; "take the
// three branching for example. should curved left and right and one goes
// down center aswell"). Where one node branches to several, its children sit
// in a row below it and the line splits downward from it: the outer
// children's lines curve left and right with rounded corners, and a middle
// child's, when the count is odd, goes straight down. The deck's org and
// fork blocks and the org chart preset draw it with the `.split` and
// `.splitItem` classes of content.module.css; these are their attributes.

/** How a split is laid out: across (children side by side under the
 *  parent) or down (children listed one under another, below it, where
 *  across cannot fit). */
export type SplitMode = "across" | "down";

/** A split list's attributes: its layout on a slide and on a phone, and its
 *  child count. */
export function splitList(n: number, mode: SplitMode, phone: SplitMode) {
  return {
    "data-split": "",
    "data-mode": mode,
    "data-phone": phone,
    style: { ["--n" as string]: n },
  };
}

/** Child `i` of `n`: its side of the parent's centre, and how many child
 *  columns its centre lies from the parent's (`--k`). */
export function splitItem(i: number, n: number) {
  const k = (n - 1) / 2 - i;
  return {
    "data-split-item": "",
    "data-side": k > 0 ? "left" : k < 0 ? "right" : "middle",
    style: { ["--k" as string]: Math.abs(k) },
  };
}

/** Across on a phone only while two or fewer children fit beside each
 *  other. */
export const phoneSplit = (n: number): SplitMode => (n <= 2 ? "across" : "down");
