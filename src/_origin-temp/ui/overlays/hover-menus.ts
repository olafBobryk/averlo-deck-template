"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  releaseHoverTrigger,
  swallowHoverEnter,
} from "./dropdown-menu/hover-guard";

/** How long a hover menu stays after the pointer leaves it, so it can cross
    the gap to its panel (DropdownMenu's own). */
export const HOVER_CLOSE_DELAY_MS = 120;

/** One hover menu stands open at a time: entering another's
    trigger moves there at once, as a menu bar does, even from a pinned one.
    DropdownMenu's hover menus and the bell's panel share it. */
let shown: { current: () => void } | null = null;
export function showHoverMenu(close: { current: () => void }) {
  if (shown === close) return;
  shown?.current();
  shown = close;
}
export function hideHoverMenu(close: { current: () => void }) {
  if (shown === close) shown = null;
}

/**
 * A panel that opens like DropdownMenu's `openOnHover` (the
 * bell, as the account menu): the mouse entering the trigger opens it, leaving
 * the trigger or the panel closes it after HOVER_CLOSE_DELAY_MS unless the
 * pointer reaches the other, a press pins it and the next closes it. Keyboard
 * and touch keep the click. Spread `trigger` on the trigger and `panel` on
 * the panel's content.
 */
export function useHoverMenu(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const timer = useRef<number | undefined>(undefined);
  const pinned = useRef(false);
  const pressed = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const close = useRef<() => void>(() => {});
  const setOpen = useCallback(
    (next: boolean) => {
      window.clearTimeout(timer.current);
      if (next) showHoverMenu(close);
      else {
        pinned.current = false;
        hideHoverMenu(close);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );
  useEffect(() => {
    close.current = () => {
      window.clearTimeout(timer.current);
      pinned.current = false;
      onOpenChange(false);
    };
  }, [onOpenChange]);
  // Closed from outside (Escape, a press away): the slot is free again.
  useEffect(() => {
    if (!open) {
      pinned.current = false;
      hideHoverMenu(close);
    }
  }, [open]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      hideHoverMenu(close);
    },
    [],
  );
  return useMemo(() => {
    const leave = (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse" || pinned.current) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => setOpen(false),
        HOVER_CLOSE_DELAY_MS,
      );
    };
    return {
      trigger: {
        ref: (node: HTMLElement | null) => {
          trigger.current = node;
        },
        onPointerEnter(event: React.PointerEvent) {
          if (event.pointerType !== "mouse") return;
          // Under a pointer that has not moved (an overlay closed): no.
          if (swallowHoverEnter(event.currentTarget, event)) return;
          window.clearTimeout(timer.current);
          if (!open) setOpen(true);
        },
        onPointerLeave(event: React.PointerEvent) {
          if (event.pointerType === "mouse")
            releaseHoverTrigger(event.currentTarget);
          leave(event);
        },
        onPointerDown(event: React.PointerEvent) {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          // As DropdownMenu: the first press pins, the next closes.
          pressed.current = true;
          if (open && !pinned.current) pinned.current = true;
          else if (open) setOpen(false);
          else {
            setOpen(true);
            pinned.current = true;
          }
        },
        /** Keyboard and touch: the click toggles, pinned. */
        onClick() {
          if (pressed.current) {
            pressed.current = false;
            return;
          }
          if (open) setOpen(false);
          else {
            setOpen(true);
            pinned.current = true;
          }
        },
      },
      panel: {
        onPointerEnter(event: React.PointerEvent) {
          if (event.pointerType === "mouse") window.clearTimeout(timer.current);
        },
        onPointerLeave: leave,
        /** The trigger's own press is the trigger's, not a press away. */
        isTrigger: (target: EventTarget | null) =>
          !!target && !!trigger.current?.contains(target as Node),
      },
    };
  }, [open, setOpen]);
}
