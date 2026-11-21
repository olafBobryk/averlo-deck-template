"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useShimmerRegistration } from "../../foundations/ShimmerRoot";
import { Text, type TextVariant } from "../text/Text";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: number | string | "pill";
  animation?: "shimmer" | "static";
  className?: string;
};
export function Skeleton({
  width = "100%",
  height = 10,
  radius = 5,
  animation = "shimmer",
  className,
}: SkeletonProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const register = useShimmerRegistration();
  useEffect(() => {
    if (ref.current && animation === "shimmer") return register?.(ref.current);
  }, [animation, register]);
  return (
    <span
      ref={ref}
      data-skeleton=""
      data-animation={register ? animation : "static"}
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={{
        width,
        height,
        borderRadius: radius === "pill" ? "var(--deck-radius-pill)" : radius,
      }}
    />
  );
}

export type SkeletonTextProps = {
  /** The Text variant the content renders in. */
  variant: TextVariant;
  /** The text this stands for: the exact copy when it is known, else a
      realistic exemplar. It is typeset, hidden, in the variant, and each of
      its lines draws one bar as long as that line. */
  copy?: string;
  /** The live slot truncates to one line: the copy is cut the same way. */
  truncate?: boolean;
  /** The live slot clamps to this many lines. */
  maxLines?: number;
  /** Where the lines sit, as the text's alignment. Default start. */
  align?: "start" | "center" | "end";
  /** @deprecated Without `copy`: lines the content wraps to. */
  lines?: number;
  /** @deprecated Without `copy`: the last (or only) bar's width. */
  width?: CSSProperties["width"];
  className?: string;
};
type Bar = { left: number; top: number; width: number; height: number };
/** Cap height over font size for Inter. */
const CAP = 0.72;
/** Above 16px bars grow faster than the cap height, reaching 0.96 of the size
    at Display: big text reads heavier than its cap height. */
const GROWTH = 1.056;
const GROWTH_OFFSET = 5.376;
const barHeight = (size: number) =>
  Math.max(size * CAP, size * GROWTH - GROWTH_OFFSET);
/** The bars for each line `copy` wraps to, inside `slot`. */
function measureBars(
  slot: HTMLElement,
  copy: HTMLElement,
  maxLines?: number,
): Bar[] {
  const range = document.createRange();
  range.selectNodeContents(copy);
  // Environments without layout (jsdom) draw no bars.
  if (typeof range.getClientRects !== "function") return [];
  const origin = slot.getBoundingClientRect();
  const clip = copy.getBoundingClientRect();
  const size = parseFloat(getComputedStyle(copy).fontSize) || 16;
  const lines: { top: number; bottom: number; left: number; right: number }[] =
    [];
  for (const rect of range.getClientRects()) {
    if (!rect.width) continue;
    const line = lines.find(
      (at) => Math.abs(at.top + at.bottom - rect.top - rect.bottom) < size / 2,
    );
    if (line) {
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
    } else
      lines.push({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      });
  }
  const height = Math.round(barHeight(size));
  return lines.slice(0, maxLines).map((line) => {
    // A truncating slot cuts its copy at its own edge.
    const left = Math.max(line.left, clip.left);
    const right = Math.min(line.right, clip.right);
    return {
      left: left - origin.left,
      top: (line.top + line.bottom) / 2 - height / 2 - origin.top,
      width: Math.max(0, right - left),
      height,
    };
  });
}
/**
 * Text that is not known yet. With `copy`, the
 * copy is typeset hidden in the variant, so the slot is exactly the size the
 * text will be, and each line it wraps to draws one glyph-height bar as long
 * as the line, centred in its line box, its radius half its height. Without
 * `copy` (deprecated) it draws `lines` line boxes with glyph-height bars.
 */
function SkeletonText({
  variant,
  copy,
  truncate = false,
  maxLines,
  align = "start",
  lines = 1,
  width = lines > 1 ? "60%" : "100%",
  className,
}: SkeletonTextProps) {
  const slot = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [bars, setBars] = useState<Bar[] | null>(null);
  useLayoutEffect(() => {
    const at = slot.current;
    const typeset = text.current;
    if (!at || !typeset || copy === undefined) return;
    const draw = () => setBars(measureBars(at, typeset, maxLines));
    draw();
    // Fonts arriving or the slot resizing re-wrap the copy.
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(draw);
    observer?.observe(at);
    void document.fonts?.ready.then(draw);
    return () => observer?.disconnect();
  }, [copy, maxLines]);
  const barCss = `max(var(--deck-type-size-${variant}) * ${CAP}, var(--deck-type-size-${variant}) * ${GROWTH} - ${GROWTH_OFFSET}px)`;
  const style = {
    "--skeleton-line": `calc(var(--deck-type-size-${variant}) * var(--deck-type-${variant}-line-height))`,
    "--skeleton-clamp": maxLines,
  } as CSSProperties;
  if (copy !== undefined)
    return (
      <span
        ref={slot}
        aria-hidden="true"
        data-skeleton-text={variant}
        data-align={align}
        data-measured={bars ? "" : undefined}
        className={[styles.text, styles.copied, className]
          .filter(Boolean)
          .join(" ")}
        style={style}
      >
        <Text
          ref={text}
          as="span"
          variant={variant}
          className={styles.copy}
          data-truncate={truncate || undefined}
          data-clamp={maxLines ? "" : undefined}
        >
          <span className={styles.ink}>{copy}</span>
        </Text>
        {bars?.map((bar, index) => (
          <span
            key={index}
            className={styles.bar}
            style={{ left: bar.left, top: bar.top }}
          >
            <Skeleton
              width={bar.width}
              height={bar.height}
              radius={bar.height / 2}
            />
          </span>
        ))}
      </span>
    );
  return (
    <span
      aria-hidden="true"
      data-skeleton-text={variant}
      data-align={align}
      className={[styles.text, className].filter(Boolean).join(" ")}
      style={style}
    >
      {Array.from({ length: lines }, (_, line) => (
        <span key={line} className={styles.line}>
          <Skeleton
            width={line === lines - 1 ? width : "100%"}
            height={barCss}
            radius={`calc(${barCss} / 2)`}
          />
        </span>
      ))}
    </span>
  );
}
Skeleton.Text = SkeletonText;
