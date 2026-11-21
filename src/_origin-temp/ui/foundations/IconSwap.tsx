"use client";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionTokens, type MotionTokens } from "@/motion/motion";
import styles from "./IconSwap.module.css";

export type IconSwapProps = {
  /** Identity of what shows: a new key swaps, `null` leaves. */
  swapKey: string | null;
  children?: ReactNode;
  /** The role's spring; default `control` (icons and glyphs). */
  spring?: keyof MotionTokens["spring"];
  /** Degrees an entering glyph turns from, and a leaving one turns to
      (the TopBar avatar ↔ ×). Default 0. */
  turn?: number;
  /** Swapped glyphs overlap in place; the leaving one is popped out of the
      layout (`popLayout`), so its slot never holds both. */
  overlap?: boolean;
  /** Animate the first glyph in, rather than show it at rest. */
  appear?: boolean;
  className?: string;
};

/**
 * The one owner of the swap recipe. A glyph
 * enters from `scale.swap` at 0 opacity on its spring (opacity on `fade`)
 * and leaves to the same on `exit`. Button's icons, the password reveal,
 * notices' status glyphs, the TopBar avatar ↔ ×, step pills and the menu
 * check all swap through it; CSS-only swaps (stacked buttons that stay
 * mounted) compose `swap.module.css`, the same recipe.
 */
export function IconSwap({
  swapKey,
  children,
  spring = "control",
  turn = 0,
  overlap = false,
  appear = false,
  className,
}: IconSwapProps) {
  const t = useMotionTokens();
  return (
    <AnimatePresence initial={appear} mode={overlap ? "popLayout" : "sync"}>
      {swapKey !== null && (
        <motion.span
          key={swapKey}
          className={[styles.swap, className].filter(Boolean).join(" ")}
          initial={{ opacity: 0, scale: t.scale.swap, rotate: -turn }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{
            opacity: 0,
            scale: t.scale.swap,
            rotate: turn,
            transition: t.exit,
          }}
          transition={{ ...t.spring[spring], opacity: t.fade }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
