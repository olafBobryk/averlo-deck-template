"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useMotionTokens } from "./motion";

// One indicator per group slides from the
// old item to the new on `spring.control`. Its x is a translate and its
// width a real width (layout rules), measured from the
// selected item's box, never Motion's `layoutId`, which scales.
//
// A segmented input must morph smoothly between its options, even when the
// press switches between views. A press that also changes the page puts
// a long frame right after it, and a spring run from JavaScript loses that time:
// the pill was 44% of the way in the first frame anyone saw of it (90% in dev). So
// the slide is a CSS transition on the same spring: the browser starts it when
// the first frame is ready and runs its translate off the main thread.
const SLIDE = [
  "transform var(--deck-motion-spring-control)",
  "width var(--deck-motion-spring-control)",
  "height var(--deck-motion-spring-control)",
].join(", ");

/**
 * Places the group's indicator on the item matching `selected` (a selector
 * such as `[data-state=checked]`), inside the indicator's parent (the
 * list). The first placement, a resize and reduced motion place it at once;
 * a new selection slides, retargeting from wherever it is mid-slide. With
 * nothing selected it hides at once. Put the indicator before the items so
 * they paint over it.
 */
export function useSelectionIndicator(selected: string) {
  const t = useMotionTokens();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  const instant = useRef(false);
  useLayoutEffect(() => {
    instant.current =
      (t.spring.control as { duration?: number }).duration === 0;
  });
  useLayoutEffect(() => {
    const indicator = ref.current;
    const list = indicator?.parentElement;
    if (!indicator || !list) return;
    let item: HTMLElement | null = null;
    // A slide under way, from the moment it is asked for until it ends. Read
    // instead of getAnimations(): WebKit lists a CSS transition only once it
    // has started, so a resize in the same frame read none, set the
    // transition to none and the fill jumped (Linux WebKit).
    let sliding = false;
    const ended = (event: TransitionEvent) => {
      if (event.target === indicator && event.propertyName === "transform")
        sliding = false;
    };
    indicator.addEventListener("transitionend", ended);
    indicator.addEventListener("transitioncancel", ended);
    const place = (slide: boolean) => {
      const next = list.querySelector<HTMLElement>(selected);
      setShown(!!next);
      if (!next) {
        item = null;
        sliding = false;
        return;
      }
      const transform = `translate(${next.offsetLeft}px, ${next.offsetTop}px)`;
      const width = `${next.offsetWidth}px`;
      const height = `${next.offsetHeight}px`;
      // Where it already goes: nothing to change, and a running slide is
      // left alone (a resize that moves nothing never cuts it short).
      if (
        next === item &&
        indicator.style.transform === transform &&
        indicator.style.width === width &&
        indicator.style.height === height
      )
        return;
      // A new item slides; a resize mid-slide retargets it; otherwise the
      // same item (a resize) and the first placement jump.
      const moving =
        !instant.current &&
        ((slide && item !== null && next !== item) || sliding);
      item = next;
      sliding = moving;
      indicator.style.transition = moving ? SLIDE : "none";
      indicator.style.transform = transform;
      indicator.style.width = width;
      indicator.style.height = height;
    };
    place(false);
    // The selection is each item's own state attribute, so it follows
    // controlled and uncontrolled groups alike.
    const mutation = new MutationObserver(() => place(true));
    mutation.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-selected", "aria-checked"],
    });
    // Environments without ResizeObserver (jsdom) keep the first placement.
    const resize =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => place(false));
    resize?.observe(list);
    // The items, never the indicator itself, whose own size animates.
    for (const child of list.children)
      if (child !== indicator) resize?.observe(child);
    return () => {
      mutation.disconnect();
      resize?.disconnect();
      indicator.removeEventListener("transitionend", ended);
      indicator.removeEventListener("transitioncancel", ended);
    };
  }, [selected]);
  return { ref, shown };
}

const layer: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  pointerEvents: "none",
  willChange: "transform",
};

/** The group's indicator: draws whatever its class gives it (a fill, a
    bar) over the selected item's box, under the labels. */
export function SelectionIndicator({
  selected,
  className,
}: {
  selected: string;
  className?: string;
}) {
  const { ref, shown } = useSelectionIndicator(selected);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-selection-indicator=""
      className={className}
      style={{ ...layer, visibility: shown ? undefined : "hidden" }}
    />
  );
}
