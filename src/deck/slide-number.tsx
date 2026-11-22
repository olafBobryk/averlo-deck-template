"use client";
import { useRef, useState } from "react";
import { focusRing } from "@/components/ui/foundations/focus";
import type { Lang } from "./langs";
import { ui } from "./model";
import styles from "./slide-number.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** The footer's slide number, which takes a typed slide number (owner, after
 *  reviewing the merged build: "Yes, in the footer"). It behaves as the
 *  questionnaire's step label (`StepProgressLabel`, ported in
 *  src/questionnaire/progress-navigator.tsx), whose markup and styles live
 *  in its `.aq` scope and print the number unpadded: pressed, the number
 *  becomes a field holding it; Enter, or leaving the field, goes to the
 *  typed slide; Escape cancels and gives the focus back; a number out of
 *  range is ignored. Only digits are taken, at most as many as the last
 *  slide's. `n` is the live slide (1-based); `onGo(n)` goes to slide `n`. */
export function SlideNumber({
  n,
  total,
  lang,
  onGo,
}: {
  n: number;
  total: number;
  lang: Lang;
  onGo: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(n));
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // Set once Enter or Escape has closed the field, so the blur its removal
  // brings neither goes nor cancels a second time.
  const closed = useRef(false);

  const begin = () => {
    setValue(String(n));
    closed.current = false;
    setEditing(true);
    requestAnimationFrame(() => {
      input.current?.focus({ preventScroll: true });
      input.current?.select();
    });
  };
  const cancel = (returnFocus = false) => {
    closed.current = true;
    setEditing(false);
    if (returnFocus)
      requestAnimationFrame(() => button.current?.focus({ preventScroll: true }));
  };
  const commit = (explicit = false) => {
    if (closed.current) return;
    const to = Number(value);
    if (!Number.isInteger(to) || to < 1 || to > total) {
      cancel(explicit);
      return;
    }
    closed.current = true;
    setEditing(false);
    if (to !== n) onGo(to);
    if (explicit)
      requestAnimationFrame(() => button.current?.focus({ preventScroll: true }));
  };

  if (editing)
    return (
      <input
        ref={input}
        className={`${styles.field} ${focusRing.visibleDefault}`}
        aria-label={ui.slideNumber[lang]}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onBlur={() => commit()}
        onChange={(event) =>
          setValue(
            event.target.value
              .replace(/\D/g, "")
              .slice(0, String(total).length),
          )
        }
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            commit(true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancel(true);
          }
        }}
        style={{ width: `${Math.max(2, value.length)}ch` }}
      />
    );
  return (
    <button
      ref={button}
      type="button"
      className={`${styles.number} ${focusRing.visibleDefault}`}
      // Its name holds the number as shown (WCAG's label in name).
      aria-label={ui.goSlide[lang].replace("{count}", pad(n))}
      onClick={begin}
    >
      {pad(n)}
    </button>
  );
}
