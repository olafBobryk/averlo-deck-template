"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type RefObject,
} from "react";
import {
  useMotionTokens,
  type MotionTokens,
} from "../motion";
import {
  Text,
  type TextTone,
  type TextVariant,
} from "@/_origin-temp/ui/primitives/text/Text";
import styles from "./PageHeader.module.css";

/** A heading's wordings, longest first; one string is one wording. */
export type Wordings = string | readonly string[];

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
/** Characters as a reader counts them: an emoji or accented letter is one. */
function graphemes(text: string) {
  return segmenter
    ? [...segmenter.segment(text)].map((part) => part.segment)
    : [...text];
}

/**
 * Text that erases and retypes when it
 * changes within a page. Only what differs after the shared beginning
 * erases, one character at a time on `type.erase` (capped), then the new
 * text types in on `type.type` (capped), so a switch takes about 0.55 s.
 * A change mid-way restarts from what is showing. `retype` false swaps at
 * once (a resize choosing another wording); reduced motion swaps at
 * once. A new page mounts a new header, so routes never retype.
 */
function useTyped(target: string, retype: boolean, t: MotionTokens) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useLayoutEffect(() => {
    if (target === current.current) return;
    const show = (text: string) => {
      current.current = text;
      setShown(text);
    };
    if (!retype || !t.type.typeMax) {
      show(target);
      return;
    }
    const from = graphemes(current.current);
    const to = graphemes(target);
    let shared = 0;
    while (
      shared < from.length &&
      shared < to.length &&
      from[shared] === to[shared]
    )
      shared++;
    const erase = from.length - shared;
    const type = to.length - shared;
    const eraseMs = Math.min(erase * t.type.erase, t.type.eraseMax) * 1000;
    const typeMs = Math.min(type * t.type.type, t.type.typeMax) * 1000;
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      let text = target;
      if (elapsed < eraseMs)
        text = from
          .slice(
            0,
            from.length - Math.max(1, Math.ceil((erase * elapsed) / eraseMs)),
          )
          .join("");
      else if (elapsed < eraseMs + typeMs)
        text = to
          .slice(
            0,
            shared +
              Math.max(1, Math.floor((type * (elapsed - eraseMs)) / typeMs)),
          )
          .join("");
      show(text);
      if (text !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, retype, t]);
  return shown;
}

/** Warned once per wording set, in development only. */
const warned = new Set<string>();

/**
 * The fit-to-line choice: the index of the first wording (longest first)
 * whose one-line width fits `box`, measured from `measureBox`'s
 * `[data-wording]` spans, or, for a lone wording, from the line itself; the
 * last one with `none` when nothing fits. Chosen before paint and again on
 * resize or once fonts load. `resized` marks a choice made by a new width
 * (it swaps without retyping).
 */
export function useFitChoice(
  list: readonly string[],
  fit: boolean,
  box: RefObject<HTMLElement | null>,
  measureBox: RefObject<HTMLElement | null>,
) {
  const key = list.join("\u0000");
  const [chosen, setChosen] = useState({
    key,
    index: 0,
    none: false,
    resized: true,
  });
  useLayoutEffect(() => {
    const element = box.current;
    if (!fit || !element) return;
    const measure = () => {
      const room = element.clientWidth;
      const spans = [
        ...(measureBox.current?.querySelectorAll<HTMLElement>(
          "[data-wording]",
        ) ?? []),
      ];
      // One wording: it fits unless its line overflows (then it ellipsises).
      const typed = element.querySelector<HTMLElement>("[data-typed]");
      const widths = spans.length
        ? spans.map((wording) => wording.offsetWidth)
        : [typed ? typed.scrollWidth : 0];
      const index = widths.findIndex((width) => width <= room + 0.5);
      const none = index === -1;
      setChosen((previous) =>
        previous.key === key &&
        previous.index === (none ? list.length - 1 : index) &&
        previous.none === none
          ? previous
          : {
              key,
              index: none ? list.length - 1 : index,
              none,
              resized: previous.key === key,
            },
      );
      if (none && process.env.NODE_ENV !== "production" && !warned.has(key)) {
        warned.add(key);
        console.warn(
          `[PageHeader] No wording fits on one line at ${Math.round(room)}px: "${list[list.length - 1]}". Add a shorter wording (headings.md, C2).`,
        );
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
    // `list` is `key`; the refs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fit]);
  // A line that wraps, or new wordings before they are measured: the first,
  // retyped on a change (useTyped never animates an unchanged text).
  return fit && chosen.key === key
    ? chosen
    : { key, index: 0, none: false, resized: false };
}

/** Every wording laid out invisibly in the heading's own type, beside it,
    never inside it (a gradient heading paints through every glyph inside). */
export function WordingsMeasure({
  list,
  variant,
  measureRef,
}: {
  list: readonly string[];
  variant: TextVariant;
  measureRef: RefObject<HTMLElement | null>;
}) {
  return (
    <Text
      ref={measureRef}
      as="span"
      variant={variant}
      aria-hidden="true"
      className={styles.measure}
    >
      {list.map((wording, at) => (
        <span key={at} data-wording="">
          {wording}
        </span>
      ))}
    </Text>
  );
}

/**
 * A heading or description line.
 * - **Fit to line.** With several wordings (longest first), it shows the
 *   first that fits its width on one line, chosen before paint and again on
 *   resize or once fonts load; the server renders the first, clipped.
 *   When none fits, the shortest ends in an ellipsis, with the full text in
 *   the accessible name and a tooltip, and a development warning.
 *   One wording that is a plain string wraps as text does (descriptions).
 * - **Erase and retype** on a change within the page (`useTyped`); a resize
 *   swaps at once; no caret.
 * - **Screen readers** read the final text: the typed characters are
 *   hidden, a visually hidden copy carries the name.
 */
export function HeadingText({
  wordings,
  oneLine = typeof wordings !== "string",
  as,
  variant,
  tone,
  className,
}: {
  wordings: Wordings;
  /** Never wraps (a heading): fits the longest wording that fits on one
      line. Default: when there are several wordings. */
  oneLine?: boolean;
  as: ElementType;
  variant: TextVariant;
  tone: TextTone;
  className?: string;
}) {
  const t = useMotionTokens();
  const list = typeof wordings === "string" ? [wordings] : wordings;
  const fit = oneLine;
  const box = useRef<HTMLElement>(null);
  const measureBox = useRef<HTMLElement>(null);
  const chosen = useFitChoice(list, fit, box, measureBox);
  const target = list[Math.min(chosen.index, list.length - 1)] ?? "";
  // Retype a change of wordings within the page; a resize swaps at once.
  const retype = !chosen.resized;
  const shown = useTyped(target, retype, t);
  // At rest the text is plain; while it types, the typed characters are
  // hidden from assistive technology and the element is named with the final
  // text, so the name never holds a half-typed string. (Not a visually
  // hidden copy: a gradient heading paints through every glyph inside it.)
  const typing = shown !== target;
  const heading = (
    <Text
      ref={box}
      as={as}
      variant={variant}
      tone={tone}
      className={[styles.heading, className].filter(Boolean).join(" ")}
      data-fit={fit || undefined}
      data-none={chosen.none || undefined}
      title={chosen.none ? list[0] : undefined}
      aria-label={typing ? target : undefined}
    >
      <span
        data-typed=""
        aria-hidden={typing || undefined}
        className={styles.typed}
      >
        {shown}
      </span>
    </Text>
  );
  // Every wording laid out invisibly in the same type, beside the heading,
  // never inside it: a gradient heading paints through every glyph inside
  // it, hidden ones included.
  return fit && list.length > 1 ? (
    <>
      {heading}
      <WordingsMeasure list={list} variant={variant} measureRef={measureBox} />
    </>
  ) : (
    heading
  );
}
