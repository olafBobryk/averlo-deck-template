"use client";
import {
  animate,
  motionValue,
  type AnimationPlaybackControls,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import {
  useMotionTokens,
  type MotionTokens,
} from "@/motion/motion";

// A finger moves through the slides. The slide is locked to the finger, as
// in iOS Photos: it moves 1:1 with the finger and its neighbour rides in
// attached at its edge, a slide width away, with no crossfade. Letting go
// finishes the move on `spring.surface` from where it is, with the finger's
// speed. Keys, clicks and the menu keep the page step
// (startRouteTransition); only the touch drag is this. The values below are
// the gesture's own; the motion tokens do not cover them.
/** Travel before the gesture picks a direction, px. */
const SLOP = 10;
/** Share of the width past which letting go finishes the move. */
const COMMIT = 0.5;
/** Finger speed toward a neighbour that finishes the move, px per ms. */
const FLICK = 0.3;
/** The rubber band past the first or last slide. */
const RESIST = 0.3;
/** On a slide that scrolls, sideways must beat up and down by this much at
    the slop (within about 22° of level), so a scroll that starts a little
    sideways stays a scroll; elsewhere sideways need only beat up and down. */
const STEEP = 2.5;
/** A finger that rests this long before it leaves flicks nothing, ms. */
const REST = 80;
/** A tap on a touch screen this soon after the slide scrolled, or after the
    last tap, does not step, ms. */
const QUIET = 300;
/** Where a drag never starts; `html[data-menu]` (MenuCard) covers every
    press while the menu is open. */
const IGNORE = "button, a, input, [role=dialog], [data-menu]";

type Live = {
  index: number;
  count: number;
  t: MotionTokens;
  onCommit: (next: number) => void;
};

export type SwipeControl = {
  /** A finger is down and dragging. */
  dragging: () => boolean;
  /** Lands a move still settling at once, so a key can follow it. */
  finish: () => void;
  /** Whether the click now arriving must not step: it ends a drag, or on a
      touch screen it stops or follows a scroll, or follows a tap closely. */
  consumeClick: () => boolean;
};

/**
 * Touch navigation. A finger on `area`'s slides (each `main` carrying
 * `data-slide-index`) moves the slide with it, and the neighbour it moves
 * toward, which `preview` asks the deck to render, comes in at its edge;
 * 0.3 of the travel past the first or last slide. Letting go past half way,
 * or with a flick toward the neighbour, makes the neighbour the slide at
 * once (`onCommit`, so the next swipe counts from it) and settles it on
 * `spring.surface` from where it is, the old slide staying beside it until
 * it rests; otherwise the slide springs back. A finger during the settle
 * takes the slides where they are. Up and down, pinches and a scroll the
 * browser has begun stay the browser's; a second finger ends the swipe.
 * Driven by touch events, which can hold off the browser's own pan once the
 * gesture is sideways (pointer events lose it to pointercancel on iOS).
 * Reduced motion: no tracking; past the threshold the slide changes at once.
 */
export function useSwipe({
  index,
  count,
  wanted,
  onCommit,
}: {
  index: number;
  count: number;
  /** The slide a key or click asked for last (Deck): while it differs from
      `index` a page step is under way, and no drag starts. */
  wanted: RefObject<number>;
  onCommit: (next: number) => void;
}) {
  const t = useMotionTokens();
  const area = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const live = useRef<Live>({ index, count, t, onCommit });
  useLayoutEffect(() => {
    live.current = { index, count, t, onCommit };
  });
  // The gesture's own handlers, once mounted; `control` is their stable face.
  const machine = useRef<SwipeControl>({
    dragging: () => false,
    finish: () => {},
    consumeClick: () => false,
  });
  const [control] = useState<SwipeControl>(() => ({
    dragging: () => machine.current.dragging(),
    finish: () => machine.current.finish(),
    consumeClick: () => machine.current.consumeClick(),
  }));

  useEffect(() => {
    const element = area.current;
    if (!element) return;
    // Where the slide is, px from rest (negative: moved left, toward the
    // next slide). Its velocity is Motion's, and a settle animates it on
    // from where it is.
    const offset = motionValue(0);
    let drag: {
      id: number;
      x0: number;
      y0: number;
      base: number;
      engaged: boolean;
      /** Something under the finger scrolls up and down. */
      scrolls: boolean;
      /** The finger's recent positions, for the release speed. */
      trail: { t: number; x: number }[];
    } | null = null;
    let spring: AnimationPlaybackControls | null = null;
    // A move the settle commits once the slide crosses to its side (−1
    // back, 1 on): a flick against where the slide stands.
    let pending = 0;
    // While settling to rest, the side it comes from, so a spring that
    // passes rest never shows the other neighbour.
    let side = 0;
    let shown: number | null = null;
    let swallow = false;
    let lastScroll = -Infinity;
    let lastTouch = -Infinity;
    let lastTap = -Infinity;
    let touchedWhileScrolling = false;

    const instant = () => live.current.t.distance.page === 0;
    const width = () => element.clientWidth;
    const layer = (i: number) =>
      element.querySelector<HTMLElement>(`[data-slide-index="${i}"]`);
    const place = (i: number, x: number) => {
      const slide = layer(i);
      if (slide) slide.style.transform = `translateX(${x}px)`;
    };
    const clear = () =>
      element
        .querySelectorAll<HTMLElement>("[data-slide-index]")
        .forEach((slide) => (slide.style.transform = ""));
    const show = (next: number | null) => {
      if (next === shown) return;
      shown = next;
      flushSync(() => setPreview(next));
      // Mounting while a page step's entrance still runs, the preview's
      // section joins that entrance (PageSection's one clock); it has not
      // been seen yet, so it ends at once and only the finger moves it.
      if (next !== null)
        layer(next)
          ?.getAnimations({ subtree: true })
          .forEach((animation) => animation.finish());
    };

    const draw = (raw: number) => {
      const { index, count } = live.current;
      const w = width();
      if (instant() || !w) return;
      const v = side ? side * Math.max(0, raw * side) : raw;
      const step = v < 0 ? 1 : v > 0 ? -1 : 0;
      const next = index + step;
      const has = step !== 0 && next >= 0 && next < count;
      if (step !== 0) show(has ? next : null);
      place(index, has ? v : RESIST * v);
      if (has) place(next, v + step * w);
    };
    const unsubscribe = offset.on("change", draw);

    const rest = () => {
      spring = null;
      pending = 0;
      side = 0;
      offset.jump(0);
      clear();
      show(null);
    };
    /** The neighbour `step` away becomes the slide now; the old slide stays
     *  beside it, where it is, until the settle ends. */
    const commit = (step: number) => {
      const { index } = live.current;
      const v = offset.get();
      shown = index;
      flushSync(() => {
        live.current.onCommit(index + step);
        setPreview(index);
      });
      live.current.index = index + step;
      offset.jump(v + step * width());
    };
    /** Lands on the slide `step` away (−1, 0 or 1) on spring.surface, from
     *  where it is, at `velocity` px/s. */
    const settle = (step: number, velocity: number) => {
      spring?.stop();
      pending = 0;
      let to = 0;
      if (step !== 0 && offset.get() * step < 0) commit(step);
      else if (step !== 0) {
        pending = step;
        to = -step * width();
      }
      side = pending ? 0 : Math.sign(offset.get());
      spring = animate(offset, to, {
        ...live.current.t.spring.surface,
        velocity,
        onUpdate: (v) => {
          if (pending && v * pending < 0) settle(pending, offset.getVelocity());
        },
        onComplete: rest,
      });
    };

    /** The finger's own speed over its last 100 ms of moves (from the last
     *  point before them, so a quick flick that brings a single move past
     *  the browser's slop counts from the touch), in px/ms, from the events'
     *  timestamps: a heavy frame between the last move and the release
     *  cannot read as a stop, but a finger that rested before
     *  it left (no moves for `REST` ms) is still. */
    const speedOf = (trail: { t: number; x: number }[], end: number) => {
      const last = trail[trail.length - 1];
      if (end - last.t > REST) return 0;
      const i = trail.findIndex((p) => last.t - p.t <= 100);
      const first = trail[Math.max(0, i - 1)];
      const dt = last.t - first.t;
      return dt > 0 ? (last.x - first.x) / dt : 0;
    };

    /** Where a person expects: a flick goes to the neighbour it flicks
     *  toward, counted from the slide being landed on (a flick back against
     *  the finger's own travel only cancels); otherwise past half way goes. */
    const release = (speed: number, travel: number) => {
      const { index, count } = live.current;
      const v = offset.get();
      let step = 0;
      if (Math.abs(speed) >= FLICK && Math.abs(travel) > SLOP)
        step = Math.sign(speed) === Math.sign(travel) ? -Math.sign(speed) : 0;
      else if (Math.abs(v) >= COMMIT * width()) step = -Math.sign(v);
      if (index + step < 0 || index + step >= count) step = 0;
      if (instant()) {
        offset.jump(0);
        if (step !== 0) live.current.onCommit(index + step);
        return;
      }
      settle(step, speed * 1000);
    };

    const cancel = () => {
      const engaged = drag?.engaged;
      drag = null;
      if (!engaged) return;
      swallow = true;
      if (instant()) offset.jump(0);
      else settle(0, 0);
    };

    const find = (list: TouchList, id: number) => {
      for (let i = 0; i < list.length; i++)
        if (list[i].identifier === id) return list[i];
      return null;
    };
    /** Whether anything from `target` up to the slide area scrolls. */
    const scrollsAt = (target: Element) => {
      for (
        let n: Element | null = target;
        n && n !== element;
        n = n.parentElement
      )
        if (
          n.scrollHeight > n.clientHeight + 1 &&
          /auto|scroll/.test(getComputedStyle(n).overflowY)
        )
          return true;
      return false;
    };

    const onScroll = () => {
      lastScroll = performance.now();
    };

    const onStart = (event: TouchEvent) => {
      swallow = false;
      touchedWhileScrolling = performance.now() - lastScroll < 100;
      // A second finger: pinches are the browser's.
      if (event.touches.length > 1) {
        cancel();
        return;
      }
      const touch = event.changedTouches[0];
      const target = event.target instanceof Element ? event.target : null;
      if (
        !touch ||
        !target ||
        !element.contains(target) ||
        target.closest(IGNORE) ||
        wanted.current !== live.current.index
      )
        return;
      // A finger on a move still settling takes the slides where they are.
      const caught = spring !== null;
      spring?.stop();
      spring = null;
      pending = 0;
      side = 0;
      drag = {
        id: touch.identifier,
        x0: touch.clientX,
        y0: touch.clientY,
        base: offset.get(),
        engaged: caught,
        scrolls: scrollsAt(target),
        trail: [{ t: event.timeStamp, x: touch.clientX }],
      };
    };

    const onMove = (event: TouchEvent) => {
      if (!drag) return;
      if (event.touches.length > 1) {
        cancel();
        return;
      }
      const touch = find(event.touches, drag.id);
      if (!touch) return;
      const dx = touch.clientX - drag.x0;
      const dy = touch.clientY - drag.y0;
      if (!drag.engaged) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= SLOP) return;
        // Up and down is the browser's, and so is a scroll it has already
        // begun (the move is no longer cancelable).
        const steep = drag.scrolls ? STEEP : 1;
        if (!event.cancelable || Math.abs(dx) <= Math.abs(dy) * steep) {
          drag = null;
          return;
        }
        drag.engaged = true;
      }
      // Sideways is the deck's: the browser does not pan for the rest of it.
      if (event.cancelable) event.preventDefault();
      drag.trail.push({ t: event.timeStamp, x: touch.clientX });
      if (drag.trail.length > 32) drag.trail.shift();
      offset.set(drag.base + dx);
    };

    const onEnd = (event: TouchEvent) => {
      lastTouch = performance.now();
      if (!drag) return;
      const touch = find(event.changedTouches, drag.id);
      if (!touch) return;
      const { engaged, trail, x0 } = drag;
      drag = null;
      if (!engaged) return;
      swallow = true;
      if (touch.clientX !== trail[trail.length - 1].x)
        trail.push({ t: event.timeStamp, x: touch.clientX });
      release(speedOf(trail, event.timeStamp), touch.clientX - x0);
    };

    const onCancel = (event: TouchEvent) => {
      lastTouch = performance.now();
      if (drag && find(event.changedTouches, drag.id)) cancel();
    };

    machine.current = {
      dragging: () => drag?.engaged === true,
      finish: () => {
        if (!spring) return;
        spring.stop();
        if (pending) commit(pending);
        rest();
      },
      consumeClick: () => {
        const now = performance.now();
        const was = swallow;
        swallow = false;
        // A mouse click (no touch just now) steps as it always has.
        if (now - lastTouch > 1000) return false;
        if (was) return true;
        const quiet =
          touchedWhileScrolling ||
          now - lastScroll < QUIET ||
          now - lastTap < QUIET;
        lastTap = now;
        return quiet;
      },
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    // Not passive: once a drag is sideways it holds off the browser's pan.
    element.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onCancel);
    // Slides scroll inside themselves on a phone; scroll does not bubble.
    element.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
      element.removeEventListener("scroll", onScroll, { capture: true });
      spring?.stop();
      unsubscribe();
    };
  }, [wanted]);

  return { area, preview, control };
}
