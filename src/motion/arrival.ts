/**
 * After a hard reload a page's content is already present, so it must not
 * transition in as well.
 * A hard load has no entrance, so nothing on it may move
 * until the page has arrived: while it is arriving the app runs on the reduced
 * motion tokens and motion.css's instant variables, and the shell's frames and
 * morphs settle at once. The root layout's `<html data-arriving>` starts it
 * from the first paint; client navigations never set it.
 */
const attribute = "data-arriving";

const listeners = new Set<() => void>();

export function subscribeArrival(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export const isArriving = () =>
  document.documentElement.hasAttribute(attribute);

export function endArrival() {
  if (!isArriving()) return;
  document.documentElement.removeAttribute(attribute);
  listeners.forEach((listener) => listener());
}

/**
 * Arrived once no skeleton has shown for `settleMs`, so the reads that land just
 * after the first ones still settle at once. The first input or navigation ends
 * it sooner: from then on motion answers the user.
 */
export function watchArrival(settleMs: number) {
  if (!isArriving()) return;
  let last = performance.now();
  let frame = 0;
  const tick = () => {
    if (document.querySelector('[aria-busy="true"]')) last = performance.now();
    if (performance.now() - last >= settleMs) return stop(true);
    frame = requestAnimationFrame(tick);
  };
  const onInput = () => stop(true);
  const inputs = ["pointerdown", "keydown"] as const;
  function stop(ended: boolean) {
    cancelAnimationFrame(frame);
    for (const input of inputs)
      window.removeEventListener(input, onInput, true);
    if (ended) endArrival();
  }
  for (const input of inputs) window.addEventListener(input, onInput, true);
  frame = requestAnimationFrame(tick);
  return () => stop(false);
}
