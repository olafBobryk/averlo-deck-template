/**
 * A hover menu opens when the pointer enters its trigger. When a task space
 * closes (its X sits where the account button is) or the page changes, the
 * trigger appears under a pointer that has not moved, and the browser reports
 * an enter all the same. That is not the user reaching for the menu, so it is
 * ignored until the pointer has left the trigger once and come back.
 *
 * `arm()` marks "the pointer is where it was". An enter at that same place,
 * before any real movement, is swallowed and the trigger is held until its
 * pointer leaves. A real move onto a trigger enters somewhere else and opens
 * it as usual.
 */
type Point = { x: number; y: number };

let last: Point | null = null;
let armedAt: Point | null | undefined;
let tracking = false;
const held = new WeakSet<object>();

function note(event: PointerEvent) {
  if (event.pointerType !== "mouse") return;
  last = { x: event.clientX, y: event.clientY };
  // Real movement ends the guard; a stationary pointer's own events do not.
  if (armedAt && (armedAt.x !== last.x || armedAt.y !== last.y))
    armedAt = undefined;
}

function track() {
  if (tracking || typeof window === "undefined") return;
  tracking = true;
  for (const type of ["pointermove", "pointerdown", "pointerup"])
    window.addEventListener(type, note as EventListener, true);
}
track();

/** An overlay closed or the route changed: the pointer has not moved since. */
export function armHoverGuard() {
  track();
  // With no position known there is nothing to compare an enter with.
  armedAt = last ?? undefined;
}

/** Whether this enter on `trigger` is the stale one, which opens nothing. */
export function swallowHoverEnter(
  trigger: object,
  event: { clientX: number; clientY: number },
) {
  if (armedAt && armedAt.x === event.clientX && armedAt.y === event.clientY)
    held.add(trigger);
  return held.has(trigger);
}

/** The pointer left `trigger`: its next enter is a real one. */
export function releaseHoverTrigger(trigger: object) {
  // Leaving the held trigger is itself the movement the guard waits for.
  if (held.delete(trigger)) armedAt = undefined;
}

/** For tests. */
export function resetHoverGuard() {
  last = null;
  armedAt = undefined;
}
