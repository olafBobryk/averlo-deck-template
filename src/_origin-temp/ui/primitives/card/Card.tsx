"use client";
import { useId, type CSSProperties, type HTMLAttributes } from "react";
import styles from "./Card.module.css";
/** Elevation board levels, the flat materials and `tinted`.
    `dashed` is the dashed glass card; its stroke is an SVG only `Card` draws, so `cardSurface()`
    alone gives no stroke for it. `clear` is its solid twin, a list with no
    fill. */
export type CardMaterial =
  | "card"
  | "now"
  | "quiet"
  | "dashed"
  | "clear"
  | "outline"
  | "glass"
  | "control"
  | "popover"
  | "subtle"
  | "message"
  | "highlight"
  | "inset"
  | "tinted";
/** Status-surface aliases kept for existing callers: each is `tinted` + that tone. */
type CardToneAlias = "warning" | "info" | "success" | "danger" | "tint";
export type CardSurface = CardMaterial | CardToneAlias;
/** `tinted` takes the tone's fill and border; any other surface takes the
    tone as its border only. Either way `--card-tone-fg` colours icons. */
export type CardTone =
  "success" | "info" | "warning" | "danger" | "insight" | "tint" | "neutral";
/** `subtle` (default) is the status/* recipe; `strong` is the action/* recipe
    where Figma has one (danger: action/danger). */
export type CardToneEmphasis = "subtle" | "strong";
/** `card` radius/2xl 24, `xl` 20, `lg` 16, `md` 14, `sm` 12, `pill`; `panel`
    is radius/2xl + space/12 + border, concentric around a `card`-shaped inset
    at padding 12 (setup panel). */
export type CardShape = "panel" | "card" | "xl" | "lg" | "md" | "sm" | "pill";
/** A Scale `space/*` step; padding maps to `--deck-space-<n>`. */
export type CardSpace =
  0 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 22 | 24 | 32 | 40 | 48 | 64 | 96;
export type CardPadding =
  CardSpace | readonly [block: CardSpace, inline: CardSpace];
export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Default `card` (Level 1). */
  surface?: CardSurface;
  /** Toned border, or fill and border on `tinted` (default `neutral` there). */
  tone?: CardTone;
  /** Default `subtle`. */
  emphasis?: CardToneEmphasis;
  /** Default `card`. */
  shape?: CardShape;
  /** One space step for every side, or [block, inline]. Default 22. */
  padding?: CardPadding;
  /**
   * Clip the contents to the Card's rounded inside without hiding its stroke:
   * children render in an inner layer that carries the padding and layout.
   */
  clip?: boolean;
  /** Classes for that inner layer when `clip` is set. */
  clipClassName?: string;
};
const shapes = {
  panel: styles.shapePanel,
  card: styles.shapeCard,
  xl: styles.shapeXl,
  lg: styles.shapeLg,
  md: styles.shapeMd,
  sm: styles.shapeSm,
  pill: styles.shapePill,
} satisfies Record<CardShape, string | undefined>;
const tones = {
  success: styles.toneSuccess,
  info: styles.toneInfo,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  insight: styles.toneInsight,
  tint: styles.toneTint,
  neutral: styles.toneNeutral,
} satisfies Record<CardTone, string | undefined>;
function isAlias(surface: CardSurface): surface is CardToneAlias {
  return (
    surface === "warning" ||
    surface === "info" ||
    surface === "success" ||
    surface === "danger" ||
    surface === "tint"
  );
}
/** Card's surface recipe as class names, for rows and tiles that keep their
    own element and layout but take Card's material, tone and radius. */
export function cardSurface({
  surface = "card",
  tone: ownTone,
  emphasis = "subtle",
  shape = "card",
}: Pick<
  CardProps,
  "surface" | "tone" | "emphasis" | "shape"
> = {}) {
  const material = isAlias(surface) ? "tinted" : surface;
  const tone = ownTone;
  const resolved =
    tone ??
    (isAlias(surface)
      ? surface
      : material === "tinted"
        ? "neutral"
        : undefined);
  return [
    styles.surface,
    styles[material],
    resolved && tones[resolved],
    resolved && emphasis === "strong" && styles.strong,
    resolved && material !== "tinted" && styles.toned,
    shapes[shape],
  ]
    .filter(Boolean)
    .join(" ");
}
function space(value: CardSpace) {
  return `var(--deck-space-${value})`;
}
function Root({
  surface = "card",
  tone: ownTone,
  emphasis,
  shape = "card",
  padding = 22,
  clip = false,
  clipClassName,
  className,
  style,
  children,
  ...props
}: CardProps) {
  const [block, inline] =
    typeof padding === "number" ? [padding, padding] : padding;
  const tone = ownTone;
  return (
    <div
      // Callers such as InlineNote and Notification set their own data-tone;
      // Card's goes first so it never overwrites theirs.
      data-tone={tone}
      {...props}
      data-surface={surface}
      data-emphasis={emphasis}
      className={[
        cardSurface({ surface, tone, emphasis, shape }),
        styles.root,
        clip && styles.clipped,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--card-padding-block": space(block),
          "--card-padding-inline": space(inline),
          ...style,
        } as CSSProperties
      }
    >
      {(surface === "dashed" || surface === "quiet") && <CardDashStroke />}
      {clip ? (
        <div className={[styles.clip, clipClassName].filter(Boolean).join(" ")}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
/** The [6,6] dash: a rect over the reserved border, its gradient bound to the
    surface's stroke (border/glass on `dashed`, border/default on `quiet`, or the
    tone's edge). Anything composing `quiet` renders it first, as Card does. */
export function CardDashStroke() {
  const id = `card-dash-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg className={styles.dashStroke} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.dashTop} />
          <stop offset="1" className={styles.dashBottom} />
        </linearGradient>
      </defs>
      <rect stroke={`url(#${id})`} />
    </svg>
  );
}
function Header({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={[styles.header, className].filter(Boolean).join(" ")}
    />
  );
}
function Content({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={[styles.content, className].filter(Boolean).join(" ")}
    />
  );
}
function Evidence({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={[styles.evidence, className].filter(Boolean).join(" ")}
    />
  );
}
export type CardActionsProps = HTMLAttributes<HTMLDivElement> & {
  /** `start` (default), or `end`: the row sits at the card's right, as some cards draw ghost, secondary and primary. */
  align?: "start" | "end";
};
function Actions({ align = "start", className, ...props }: CardActionsProps) {
  return (
    <div
      {...props}
      data-align={align === "end" ? "end" : undefined}
      className={[styles.actions, className].filter(Boolean).join(" ")}
    />
  );
}
export const Card = Object.assign(Root, {
  Header,
  Content,
  Evidence,
  Actions,
});
