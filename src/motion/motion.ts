import { useContext, useSyncExternalStore } from "react";
import {
  MotionConfigContext,
  spring,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { isArriving, subscribeArrival } from "./arrival";

// Deck motion language: springs move, durations fade; exits are
// quicker than enters; reduced motion animates nothing.
// Each spring role below says which motion it fits.
// motion.css mirrors these values for CSS transitions.

const springOf = (stiffness: number, damping: number, mass: number) =>
  ({ type: "spring", stiffness, damping, mass }) as const;

export const motionTokens = {
  spring: {
    /** Small controls: Button icons, menus, chips, toggles, in-field submit. */
    control: springOf(800, 52, 0.8),
    /** Components: notifications, the status banner, header changes, steps. */
    component: springOf(420, 38, 0.9),
    /** Large surfaces: Modal, its workspace, page-level step changes. */
    surface: springOf(300, 36, 1),
  },
  /** Opacity in and colour changes. */
  fade: { duration: 0.2, ease: [0.2, 0, 0, 1] },
  /** Presence exits: opacity out with any nudge or scale, quicker than enters. */
  exit: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  distance: {
    /** How far components and surfaces travel as they enter or leave. */
    nudge: 8,
    /** Route changes and page-level step changes. */
    page: 120,
    /** A tab panel's slide, smaller than a page's. */
    panel: 80,
  },
  scale: {
    /** Components and surfaces enter from and leave to this scale. */
    presence: 0.96,
    /** Icon and glyph swaps scale through this. */
    swap: 0.6,
  },
  /** List items entering together fade 30ms apart (no nudge); the sixth onwards with the fifth. */
  stagger: { each: 0.03, max: 5 },
  /** Ambient loops, in seconds per turn; `bars` is one
      swing of the speaking bars, a gentle loop, each
      bar starting `barsStep` after the one before. */
  loop: { slow: 180, medium: 140, fast: 100, bars: 1.2, barsStep: 0.15 },
  /** A hovered ambient visual springs its loops to `rate`× on spring.surface;
      an ambient video takes `orb` of the extra rate. */
  boost: { rate: 8, orb: 0.05 },
  /** A heading's erase-and-retype, in seconds per
      character, each phase capped, so a switch takes about 0.55 s. */
  type: { erase: 0.012, eraseMax: 0.24, type: 0.018, typeMax: 0.36 },
} as const;

type Spring = Transition;
export type MotionTokens = {
  spring: Record<keyof typeof motionTokens.spring, Spring>;
  fade: Transition;
  exit: Transition;
  distance: Record<keyof typeof motionTokens.distance, number>;
  scale: Record<keyof typeof motionTokens.scale, number>;
  stagger: { each: number; max: number };
  loop: Record<keyof typeof motionTokens.loop, number>;
  boost: Record<keyof typeof motionTokens.boost, number>;
  type: Record<keyof typeof motionTokens.type, number>;
};

const instant = { duration: 0 } as const;

/** Reduced motion animates nothing: fades go with movement. */
export const reducedMotionTokens: MotionTokens = {
  spring: { control: instant, component: instant, surface: instant },
  fade: instant,
  exit: instant,
  distance: { nudge: 0, page: 0, panel: 0 },
  scale: { presence: 1, swap: 1 },
  stagger: { each: 0, max: 0 },
  // Loops show their still (CSS stops them); a hover boosts nothing.
  loop: motionTokens.loop,
  boost: { rate: 1, orb: 0 },
  // Text swaps at once.
  type: { erase: 0, eraseMax: 0, type: 0, typeMax: 0 },
};

/** The tokens for the user's motion preference; instant while a hard load is
    still arriving (arrival.ts). */
export function useMotionTokens(): MotionTokens {
  // The user's setting, or a MotionConfig that forces reduced motion
  // (stories). Not useReducedMotionConfig: with no MotionConfig its context
  // defaults to "never", which ignored the user's setting everywhere.
  const preferred = useReducedMotion();
  const { reducedMotion } = useContext(MotionConfigContext);
  const arriving = useSyncExternalStore(
    subscribeArrival,
    isArriving,
    () => false,
  );
  return preferred || arriving || reducedMotion === "always"
    ? reducedMotionTokens
    : motionTokens;
}

/** Delay for the `index`th item of a list entering together. */
export function staggerDelay(
  index: number,
  tokens: MotionTokens = motionTokens,
) {
  return Math.min(index, tokens.stagger.max) * tokens.stagger.each;
}

/** A spring as a CSS `<duration> linear(…)` pair, as motion.css stores it. */
export function springCss(value: (typeof motionTokens.spring)["control"]) {
  return spring({ ...value, keyframes: [0, 1] }).toString();
}
