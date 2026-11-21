// SizeFrame's clip="fade" (a layout transitions rule):
// with no real edge, nothing is cut while the frame resizes; each
// item's opacity is the share of it still inside the frame's moving edge.

const GROUP = "data-size-frame-group";

/** Spread on a wrapper with no look of its own (a form, a flex stack) inside a
    fading SizeFrame: it hands the fade to its own children, so each row fades
    by itself rather than the wrapper as a whole. */
export const sizeFrameGroup = { [GROUP]: "" } as const;

/** The share of a box from `start` to `end` that lies before `edge` on one
    axis: 1 fully inside, 0.5 half past, 0 fully past. A box with no size is
    left whole. */
export function shareInside(start: number, end: number, edge: number) {
  const size = end - start;
  if (size <= 0) return 1;
  return Math.min(1, Math.max(0, (edge - start) / size));
}

type Box = { top: number; bottom: number; left: number; right: number };

/** An item's opacity in a frame whose `axis` resizes: the share of it inside
    the bottom edge (height), the end edge (width), or both multiplied. */
export function fadeOpacity(
  item: Box,
  edge: { bottom: number; right: number },
  axis: "height" | "width" | "both",
) {
  const down =
    axis === "width" ? 1 : shareInside(item.top, item.bottom, edge.bottom);
  const across =
    axis === "height" ? 1 : shareInside(item.left, item.right, edge.right);
  return down * across;
}

/** The items that fade: the content's direct children, a group's children in
    the group's place. */
export function fadeItems(content: Element): HTMLElement[] {
  const items: HTMLElement[] = [];
  for (const child of content.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.hasAttribute(GROUP)) items.push(...fadeItems(child));
    else items.push(child);
  }
  return items;
}
