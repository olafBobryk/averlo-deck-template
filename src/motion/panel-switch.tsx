"use client";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { AnimatePresence, usePresence } from "motion/react";
import { SizeFrame } from "./size-frame/SizeFrame";
import {
  motionTokens,
  springCss,
  useMotionTokens,
  type MotionTokens,
} from "./motion";
import styles from "./panel-switch.module.css";

/** Which way the last switch went in its options' order: 1 to a later
    option, -1 to an earlier one, 0 before any switch. */
export const PanelDirection = createContext<1 | -1 | 0>(0);

/** The spring role a switch's panels and frame move on. Default `component`
    (tabs, views); a Modal's steps use `surface`, so they move with its glass. */
export const PanelSpring =
  createContext<keyof MotionTokens["spring"]>("component");

/** What fades with a panel: the panel itself when it holds no glass; else
    each outermost glass element and every other piece of content beside it
    (else group labels stay opaque and overlap the
    entering panel), never an element above a blur. */
function fadeTargets(panel: HTMLElement) {
  const blurred = (node: Element) =>
    getComputedStyle(node).backdropFilter !== "none";
  const holdsGlass = (node: Element) =>
    blurred(node) ||
    [...node.querySelectorAll("*")].some((inner) => blurred(inner));
  const targets: HTMLElement[] = [];
  const visit = (node: HTMLElement) => {
    if (blurred(node) || !holdsGlass(node)) {
      targets.push(node);
      return;
    }
    for (const child of node.children) visit(child as HTMLElement);
  };
  visit(panel);
  // Environments without Web Animations (jsdom) skip the fades.
  return targets.filter((node) => typeof node.animate === "function");
}
const easing = (ease?: readonly number[]) =>
  ease ? `cubic-bezier(${ease.join(", ")})` : "linear";

/** A token spring as WAAPI timing: the same `<duration> linear(…)` curve
    motion.css runs, so a slide runs on the compositor. */
const springs = new Map<string, { duration: number; easing: string }>();
export function springTiming(role: keyof typeof motionTokens.spring) {
  let timing = springs.get(role);
  if (!timing) {
    const [, ms, curve] = /^([\d.]+)ms ([\s\S]+)$/.exec(
      springCss(motionTokens.spring[role]),
    )!;
    timing = { duration: Number(ms), easing: curve };
    springs.set(role, timing);
  }
  return timing;
}
const shift = (x: number) => (x ? `translateX(${x}px)` : "none");
/** Where an element shows now on x, mid-animation included. */
export const shownX = (node: HTMLElement) =>
  typeof DOMMatrix === "undefined"
    ? 0
    : new DOMMatrix(getComputedStyle(node).transform || "none").m41;

/**
 * Switching panels and views: one switched
 * panel's motion. Leaving, it is pinned where it stood and slides
 * `distance.panel` toward the side it was left by on `exit`; entering, it
 * comes from the other side on `spring.component`, held at its start until
 * its first painted frame. Opacity fades the panel, or each outermost
 * blurred element when it holds glass. The first render does
 * not animate. A direct child of an `AnimatePresence` under a
 * `PanelDirection`; its parent is `position: relative`.
 *
 * Why one clock: an outgoing slide could fail to fade out when the
 * slide ran on Motion's clock, from the commit, and the fade on the
 * browser's, from the first painted frame; after a long frame the slide was
 * done, and the panel removed, before the fade had shown. Both now run as
 * one set of Web Animations, on the compositor, held together until the
 * first painted frame, and a leaving panel goes only once its fade is done.
 */
export function PanelMotion({
  hug,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  /** One item of a row, not a column's whole panel: leaving, it keeps its own
      place and width in its parent. */
  hug?: boolean;
}) {
  const t = useMotionTokens();
  const side = useContext(PanelDirection);
  const spring = useContext(PanelSpring);
  const [present, safeToRemove] = usePresence();
  const ref = useRef<HTMLDivElement>(null);
  const [from] = useState(() => (side && t.distance.panel ? side : 0));
  // What its exit reads: the way the switch that removed it went.
  const now = useRef({ side, t, spring, safeToRemove });
  useLayoutEffect(() => {
    now.current = { side, t, spring, safeToRemove };
  });
  // The panel's running animations: its slide, then its fades.
  const running = useRef<Animation[]>([]);
  const targets = useRef<HTMLElement[]>([]);
  // Where it showed when a leave was undone (it came back before it went).
  const resume = useRef<{ x: number; opacity: number[] } | null>(null);
  const stood = useRef({ top: 0, left: 0, width: 0 });
  // Where it sits in the flow, while it is in the flow.
  useLayoutEffect(() => {
    if (ref.current && present)
      stood.current = {
        top: ref.current.offsetTop,
        left: ref.current.offsetLeft,
        // Fractional: a rounded-down width could re-wrap what it holds.
        width: parseFloat(getComputedStyle(ref.current).width),
      };
  });
  // Entering: from the side, fading in; or back to rest after an undone leave.
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel || !present || typeof panel.animate !== "function") return;
    const back = resume.current;
    resume.current = null;
    if (!back && !from) return;
    const { t: tokens, spring: role } = now.current;
    if (!tokens.distance.panel) return;
    const fade = tokens.fade as { duration: number; ease?: readonly number[] };
    targets.current = fadeTargets(panel);
    running.current = [
      panel.animate(
        [
          { transform: shift(back ? back.x : from * tokens.distance.panel) },
          { transform: "none" },
        ],
        { ...springTiming(role), fill: "backwards" },
      ),
      ...targets.current.map((node, i) =>
        node.animate([{ opacity: back ? back.opacity[i] : 0, offset: 0 }], {
          duration: fade.duration * 1000,
          easing: easing(fade.ease),
          fill: "backwards",
        }),
      ),
    ];
  }, [present, from]);
  // Leaving: pinned, sliding off and fading on one clock; gone once done.
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel || present) return;
    // Pinned where it stood (CSS: absolute in its parent), until it is back.
    panel.style.top = `${stood.current.top}px`;
    if (hug) {
      panel.style.left = `${stood.current.left}px`;
      panel.style.right = "auto";
      panel.style.width = `${Math.ceil(stood.current.width)}px`;
    }
    const unpin = () => {
      panel.style.top = "";
      panel.style.left = panel.style.right = panel.style.width = "";
    };
    const { side: way, t: tokens } = now.current;
    if (!tokens.distance.panel || typeof panel.animate !== "function") {
      // After the commit: AnimatePresence learns of its leavers in its own
      // layout effect, which runs after this one.
      let live = true;
      queueMicrotask(() => live && now.current.safeToRemove?.());
      return () => {
        live = false;
        unpin();
      };
    }
    // From wherever it shows now: an enter cut short leaves from mid-way.
    const x = shownX(panel);
    const fades = targets.current.length ? targets.current : fadeTargets(panel);
    const opacity = fades.map((node) => +getComputedStyle(node).opacity);
    running.current.forEach((animation) => animation.cancel());
    const exit = tokens.exit as { duration: number; ease?: readonly number[] };
    const timing = {
      duration: exit.duration * 1000,
      easing: easing(exit.ease),
      fill: "forwards" as const,
    };
    const leaving = [
      panel.animate(
        [
          { transform: shift(x) },
          { transform: shift(-way * tokens.distance.panel) },
        ],
        timing,
      ),
      ...fades.map((node, i) =>
        node.animate([{ opacity: opacity[i] }, { opacity: 0 }], timing),
      ),
    ];
    running.current = leaving;
    targets.current = fades;
    let live = true;
    void Promise.all(leaving.map((animation) => animation.finished))
      .then(() => live && now.current.safeToRemove?.())
      .catch(() => {});
    return () => {
      live = false;
      // Back before it went: it returns from where it shows.
      resume.current = {
        x: shownX(panel),
        opacity: fades.map((node) => +getComputedStyle(node).opacity),
      };
      unpin();
      leaving.forEach((animation) => animation.cancel());
    };
    // Its presence alone: AnimatePresence hands it a new safeToRemove as
    // others come and go, and re-running here would restart the leave.
  }, [present, hug]);
  // Gone for good: nothing keeps running.
  useLayoutEffect(
    () => () => running.current.forEach((animation) => animation.cancel()),
    [],
  );
  return (
    <div
      {...props}
      ref={ref}
      className={[styles.panel, className].filter(Boolean).join(" ")}
      data-leaving={present ? undefined : ""}
      // Leaving, it is gone for assistive technology and the pointer.
      inert={!present || undefined}
      aria-hidden={!present || undefined}
    >
      {children}
    </div>
  );
}

/** The height of switched panels: a SizeFrame on `spring.component` that
    never clips, so a leaving panel is never cut and nothing below jumps. */
export function PanelFrame({
  className,
  clip = false,
  children,
}: {
  className?: string;
  /** Clip at the frame's edge while it resizes, where that edge is a real
      one (a Modal's steps, at the glass). Default false: a leaving panel is
      never cut. */
  clip?: boolean;
  children: ReactNode;
}) {
  const spring = useContext(PanelSpring);
  return (
    <SizeFrame
      clip={clip}
      spring={spring}
      // A frame inside that drives it (a Reveal) moves it each frame, and it
      // moves a frame around it that follows (a Modal's glass) the same way.
      drives
      follows
      className={className}
      contentClassName={styles.frameContent}
    >
      {children}
    </SizeFrame>
  );
}

export type PanelSwitchProps = {
  /** The shown option; a new value switches. */
  value: string;
  /** The options in their control's order, for the direction. */
  order: readonly string[];
  /** The shown option's content. */
  children: ReactNode;
  className?: string;
  /** Classes for each panel. */
  panelClassName?: string;
  /** The spring role. Default `component`. */
  spring?: keyof MotionTokens["spring"];
  /** See `PanelFrame`. */
  clip?: boolean;
};

/**
 * A shared, controlled, content-neutral switcher. Any
 * control drives it (a SegmentedControl, filters, Tabs internally); it knows
 * nothing of the control. Each value is one panel with Tabs' slide,
 * direction by `order`, inside a frame whose height springs.
 */
export function PanelSwitch({
  value,
  order,
  children,
  className,
  panelClassName,
  spring = "component",
  clip,
}: PanelSwitchProps) {
  const [shown, setShown] = useState(value);
  const [side, setSide] = useState<1 | -1 | 0>(0);
  if (shown !== value) {
    setShown(value);
    setSide(order.indexOf(value) >= order.indexOf(shown) ? 1 : -1);
  }
  return (
    <PanelSpring.Provider value={spring}>
      <PanelFrame className={className} clip={clip}>
        <PanelDirection.Provider value={side}>
          <AnimatePresence initial={false}>
            <PanelMotion key={value} className={panelClassName}>
              {children}
            </PanelMotion>
          </AnimatePresence>
        </PanelDirection.Provider>
      </PanelFrame>
    </PanelSpring.Provider>
  );
}
