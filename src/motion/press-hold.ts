/**
 * A read can land while a control is pressed, and a page or Modal that resizes
 * moves the control out from under the pointer: the release lands on nothing and
 * the click is lost. So a mouse press stays with its control unless the pointer
 * itself leaves, which still cancels it. Touch keeps the browser's own behaviour.
 */
/** As a menu's release: closer than this, the press is still on its control. */
const PRESS_SLOP_PX = 10;

function hold(event: PointerEvent) {
  const control = (event.target as Element).closest?.<HTMLElement>("button, a");
  if (!control || event.button !== 0 || event.pointerType !== "mouse") return;
  const { clientX: x, clientY: y, pointerId } = event;
  control.setPointerCapture(pointerId);
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };
  const move = (next: PointerEvent) => {
    if (Math.hypot(next.clientX - x, next.clientY - y) < PRESS_SLOP_PX) return;
    if (control.hasPointerCapture(pointerId))
      control.releasePointerCapture(pointerId);
    end();
    // WebKit still clicks the control once its capture has gone.
    const cancel = (click: MouseEvent) => {
      if (!control.contains(click.target as Node)) return;
      click.preventDefault();
      click.stopPropagation();
    };
    window.addEventListener("click", cancel, { capture: true, once: true });
    window.addEventListener(
      "pointerup",
      () =>
        setTimeout(() =>
          window.removeEventListener("click", cancel, { capture: true }),
        ),
      { once: true },
    );
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}

/** Installed once, for the app. Returns its removal. */
export function holdPresses() {
  window.addEventListener("pointerdown", hold, true);
  return () => window.removeEventListener("pointerdown", hold, true);
}
