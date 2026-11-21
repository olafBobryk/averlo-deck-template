"use client";
import { animate, motion, useMotionValue } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useMotionTokens, type MotionTokens } from "../motion";
import { fadeItems, fadeOpacity } from "./fade";
import styles from "./SizeFrame.module.css";

export { sizeFrameGroup } from "./fade";

/** How a frame that `drives` tells the frames around it that its size is
    moving (+1 while it animates, -1 when it stops). */
const FrameLead = createContext<((delta: number) => void) | null>(null);

/**
 * True while the surface around these frames is opening (opening
 * never resizes): every frame inside is its content's own height
 * in the very frame it changes, with no spring, and writes a real height again
 * once it is false, so the next change springs from there. What lands while a
 * surface opens (a read replacing its skeleton, a field the open focuses) is
 * it settling, not a change. `Modal.Layer` sets it.
 */
export const SizeFrameSettling = createContext(false);

export type SizeFrameProps = Omit<
  ComponentProps<typeof motion.div>,
  | "animate"
  | "initial"
  | "exit"
  | "transition"
  | "layout"
  | "children"
  | "onAnimationStart"
  | "onAnimationComplete"
> & {
  /** The dimensions that follow the content. Default `height`. */
  axis?: "height" | "width" | "both";
  /** The spring role the frame resizes on. Default `component`. */
  spring?: keyof MotionTokens["spring"];
  /** Follows the content instantly, without clipping (e.g. where another
   * layout owns the motion at this breakpoint). */
  paused?: boolean;
  /** Default true: the frame's edge clips while it resizes. False for a small
   * change with no real edge (a line or less, such as a field message): the
   * space opens on the spring and the content fades in place, never clipped
   * (a layout transitions rule). `"fade"` for a
   * larger change with no real edge (a page-level step): nothing
   * clips while it resizes, and each item's opacity is the share of it still
   * inside the moving edge, every frame, until the change ends.
   * Items are the content's direct children; a wrapper with
   * `sizeFrameGroup` hands the fade to its own. Opacity only: nothing is
   * hidden from assistive technology. */
  clip?: boolean | "fade";
  /** This frame's own animation is what the frames around it follow: while it
   * resizes, every enclosing frame that `follows` tracks it instantly, so one
   * spring moves the whole stack (a note opening inside a
   * modal moves the glass with it). Default false: it springs alone. */
  drives?: boolean;
  /** Its height is its content's own, unclipped, while a frame inside it that
   * `drives` is animating, so it moves in the very frame that one does,
   * instead of springing after it (a spring chasing a spring lags, and clips
   * what it follows). Otherwise it springs as ever. Passes the lead on to
   * the frame around it. Height only. Default false. */
  follows?: boolean;
  /** Classes for the inner layer that holds the content's own layout. */
  contentClassName?: string;
  children?: ReactNode;
};

/**
 * Every size change goes through a SizeFrame (layout
 * transitions). The frame animates its own real width and height on a spring
 * while its content already sits at its final layout, and only the frame's
 * edge clips, while it resizes. Nothing stretches, unlike Motion's `layout`.
 *
 * Infinite scroll: the spring is there so nothing below jumps, so
 * a frame only springs when that can be seen. An edge staying below the screen,
 * or growing more than a screen past it (it would cross the fold in a few
 * frames), moves at once; else a page of rows left the page's height changing
 * for a second after it landed, a frame inside a frame chasing it.
 */
export function SizeFrame({
  axis = "height",
  spring = "component",
  paused = false,
  clip = true,
  drives = false,
  follows = false,
  contentClassName,
  className,
  style,
  children,
  ...props
}: SizeFrameProps) {
  const t = useMotionTokens();
  const content = useRef<HTMLDivElement>(null);
  const instant = (t.spring[spring] as { duration?: number }).duration === 0;
  // The frame's own size, always written inline once measured, so every
  // change (the first after mount included) starts from a real size and
  // never from auto, which would jump straight to the new content's size.
  const height = useMotionValue<number | "auto">("auto");
  const width = useMotionValue<number | "auto">("auto");
  const [resizing, setResizing] = useState(false);
  const settling = useContext(SizeFrameSettling);
  // What the observer reads on each resize, kept current without re-observing.
  const options = useRef({
    axis,
    paused,
    follows,
    drives,
    clip,
    settling,
    transition: t.spring[spring],
  });
  useLayoutEffect(() => {
    options.current = {
      axis,
      paused,
      follows,
      drives,
      clip,
      settling,
      transition: t.spring[spring],
    };
  });
  // The frame around it, told while this one drives it.
  const around = useContext(FrameLead);
  // Frames inside that are driving it now; counted for a frame that follows.
  const led = useRef(0);
  // Sizes the frame to its content for good, once nothing leads it.
  const settle = useRef<() => void>(() => {});
  const lead = useCallback(
    (delta: number) => {
      const before = led.current;
      led.current += delta;
      if (!options.current.follows) return;
      const frame = content.current?.parentElement;
      // Led: the frame is its content's own height, no more and no less, so
      // it moves in the very frame the driver does. Following a measurement
      // of it would always be a frame behind, and would show.
      if (before === 0 && led.current > 0 && options.current.axis !== "width") {
        height.jump("auto");
        frame?.style.setProperty("height", "auto");
      }
      if (before > 0 && led.current === 0) settle.current();
      around?.(delta);
    },
    [around, height],
  );
  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    // The first measurement only sizes the frame; later ones animate it.
    let settled = false;
    const values = { height, width };
    // The frame's gutter (padding cancelled by a negative margin) is part of
    // its size, so focus rings at the content's edge are never clipped.
    const measure = () => {
      const gutter =
        parseFloat(getComputedStyle(element.parentElement!).paddingTop) * 2 ||
        0;
      // The used size, fractional and before any ancestor's transform:
      // offsetHeight rounds, so a frame sat up to half a pixel off its
      // content (two Body/L lines are 46.375, not 46).
      const used = getComputedStyle(element);
      return {
        height: (parseFloat(used.height) || element.offsetHeight) + gutter,
        width: (parseFloat(used.width) || element.offsetWidth) + gutter,
      };
    };
    // What led it is done: its size is the content's, written as a real size
    // again so the next change starts from it.
    settle.current = () => {
      // Still settling: the height stays its content's own until that ends.
      if (options.current.settling && options.current.axis !== "width") return;
      const next = measure();
      height.jump(next.height);
      // Instant, the height is auto in the style and stays so.
      if ((options.current.transition as { duration?: number }).duration !== 0)
        element.parentElement!.style.setProperty("height", `${next.height}px`);
    };
    const read = () => {
      const next = measure();
      const { axis, paused, follows, settling, transition } = options.current;
      // Led by a frame inside: its height is auto, it follows that frame.
      if (follows && led.current > 0 && axis !== "width") return;
      const top = element.parentElement!.getBoundingClientRect().top;
      const fold = window.innerHeight;
      for (const key of ["height", "width"] as const) {
        if (axis !== "both" && axis !== key) continue;
        // Settling: its height is auto, its content's own in the same frame.
        if (key === "height" && settling) continue;
        const value = values[key];
        const current = value.get();
        if (
          !settled ||
          paused ||
          current === "auto" ||
          (transition as { duration?: number }).duration === 0 ||
          (key === "height" &&
            (top + Math.min(current, next.height) > fold ||
              (next.height > current && top + next.height > 2 * fold)))
        )
          value.jump(next[key]);
        else if (current !== next[key]) animate(value, next[key], transition);
      }
    };
    read();
    const frame = requestAnimationFrame(() => (settled = true));
    // Clipping only while a size animates keeps focus rings at the edge visible.
    const moving = () =>
      setResizing(height.isAnimating() || width.isAnimating());
    // clip="fade" (rule 10): while it resizes, each item's opacity is the share
    // of it inside the moving edge, read from the frame's own values so the
    // fade and the edge never part; whole again once the change ends.
    const faded = new Set<HTMLElement>();
    const fade = () => {
      const { clip, paused, axis } = options.current;
      const on =
        clip === "fade" &&
        !paused &&
        (height.isAnimating() || width.isAnimating());
      if (!on) {
        for (const item of faded) item.style.removeProperty("opacity");
        faded.clear();
        return;
      }
      const box = element.parentElement!.getBoundingClientRect();
      const size = (value: typeof height, rest: number) => {
        const current = value.get();
        return current === "auto" ? rest : current;
      };
      const edge = {
        bottom: box.top + size(height, box.height),
        right: box.left + size(width, box.width),
      };
      for (const item of fadeItems(element)) {
        const opacity = fadeOpacity(item.getBoundingClientRect(), edge, axis);
        if (opacity < 1) {
          item.style.opacity = String(opacity);
          faded.add(item);
        } else if (faded.delete(item)) item.style.removeProperty("opacity");
      }
    };
    // What the frames around it are told: balanced, one +1 when it starts
    // moving and one -1 when it stops. Motion tells a value's listeners that
    // an animation completed or was cancelled before it clears it, so
    // whether one is still running is read just after (and a cancel that a
    // new animation replaces is not a stop).
    let driving = false;
    let alive = true;
    const drive = (now: boolean) => {
      if (!alive || !options.current.drives || now === driving) return;
      driving = now;
      around?.(now ? 1 : -1);
    };
    const stopped = () => {
      // Read after Motion clears the animation, as drive() is: read here, it
      // still reports running, and the clip (data-resizing) stayed on.
      queueMicrotask(() => {
        moving();
        drive(height.isAnimating() || width.isAnimating());
        fade();
      });
    };
    const unsubscribe = [height, width].flatMap((value) => [
      value.on("animationStart", () => {
        setResizing(true);
        drive(true);
        // At the old size, before the first paint, not a frame later.
        fade();
      }),
      value.on("animationComplete", stopped),
      value.on("animationCancel", stopped),
      value.on("change", () => {
        if (faded.size || value.isAnimating()) fade();
      }),
    ]);
    // Environments without ResizeObserver (jsdom) keep the first measurement.
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(read);
    observer?.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      unsubscribe.forEach((stop) => stop());
      for (const item of faded) item.style.removeProperty("opacity");
      // Never leave the frames around it following a frame that is gone.
      if (driving) around?.(-1);
      alive = false;
    };
  }, [height, width, around]);
  // Settling (SizeFrameSettling): the height is auto, the content's own in the
  // same frame, from the mount or from when it starts; when it ends, a real
  // height is written again, so the next change springs from where it is.
  const wasSettling = useRef(settling);
  useLayoutEffect(() => {
    if (settling === wasSettling.current) return;
    wasSettling.current = settling;
    if (axis === "width") return;
    if (settling) height.jump("auto");
    // Led by a frame inside, it settles when that one stops.
    else if (!(follows && led.current > 0)) settle.current();
  }, [settling, axis, follows, height]);
  return (
    <motion.div
      {...props}
      className={[styles.frame, className].filter(Boolean).join(" ")}
      data-axis={axis}
      data-resizing={(resizing && !paused && clip === true) || undefined}
      style={{
        ...style,
        // Instant, the height simply follows its content in the same commit;
        // jumping from the observer would show a frame at the old size.
        ...(axis !== "width" && { height: instant ? "auto" : height }),
        ...(axis !== "height" && { width }),
      }}
    >
      <div
        ref={content}
        className={[styles.content, contentClassName].filter(Boolean).join(" ")}
      >
        <FrameLead.Provider value={lead}>{children}</FrameLead.Provider>
      </div>
    </motion.div>
  );
}
