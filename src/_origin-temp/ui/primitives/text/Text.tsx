import type { ComponentPropsWithRef, ElementType } from "react";
import styles from "./Text.module.css";

/**
 * The 25 Deck text styles on the Typography board, named after their
 * tokens (`--deck-font-*`, `--deck-type-*`): Title/XL is `title-xl`,
 * Body/M Strong is `body-m-strong`.
 */
export const textVariants = [
  "display",
  "display-m",
  "title-xl",
  "title-l",
  "title-18",
  "title-m",
  "title-16",
  "title-s",
  "body-xl",
  "body-l",
  "body-l-strong",
  "body-m",
  "body-m-strong",
  "body-s",
  "body-xs",
  "label-l",
  "label-l-strong",
  "label-m",
  "label-m-strong",
  "label-s",
  "label-s-strong",
  "meta",
  "caption",
  "overline",
  "canvas-label",
] as const;
export type TextVariant = (typeof textVariants)[number];

/**
 * Text colours from the `text/*` tokens. Figma text styles carry no colour, so
 * each layer picks one; `heading` is the Text/Heading gradient fill.
 * Without a tone the text inherits its colour.
 */
export const textTones = [
  "primary",
  "secondary",
  "tertiary",
  "hint",
  "accent",
  "accent-soft",
  "title",
  "on-primary",
  "heading",
  "warning",
  "success",
  "danger",
  "insight",
  "live",
] as const;
export type TextTone = (typeof textTones)[number];

export type TextProps<E extends ElementType = "span"> = {
  variant: TextVariant;
  tone?: TextTone;
  /** The element to render. Body styles default to `p`, the rest to `span`; headings are never implied. */
  as?: E;
} & Omit<ComponentPropsWithRef<E>, "as" | "color">;

export function Text<E extends ElementType = "span">({
  variant,
  tone: ownTone,
  as,
  className,
  ...props
}: TextProps<E>) {
  const Element: ElementType =
    as ?? (variant.startsWith("body-") ? "p" : "span");
  const tone = ownTone;
  return (
    <Element
      {...props}
      data-variant={variant}
      // Only when given, so a caller's own data-tone survives (as in Card f0496c4).
      {...(tone ? { "data-tone": tone } : {})}
      className={[styles.text, className].filter(Boolean).join(" ")}
    />
  );
}
