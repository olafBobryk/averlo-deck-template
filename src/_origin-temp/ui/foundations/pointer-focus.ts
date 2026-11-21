import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";

/**
 * A click must not show a focus ring. Radix moves focus
 * itself in roving groups (segmented control, tabs), and the browser can
 * then match :focus-visible after a click. Spread these on such an item: a
 * pointer press marks it `data-pointer-focus` until a key is pressed or it
 * blurs, and its focus ring and state layer skip that mark, so the ring only
 * ever follows the keyboard.
 */
export const pointerFocus = {
  onPointerDown(event: PointerEvent<HTMLElement>) {
    event.currentTarget.dataset.pointerFocus = "";
  },
  onKeyDown(event: KeyboardEvent<HTMLElement>) {
    delete event.currentTarget.dataset.pointerFocus;
  },
  onBlur(event: FocusEvent<HTMLElement>) {
    delete event.currentTarget.dataset.pointerFocus;
  },
};
