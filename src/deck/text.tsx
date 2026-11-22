import type { ComponentPropsWithRef, ElementType } from "react";
import {
  Text as AverloText,
  type TextTone as AverloTone,
  type TextVariant as AverloVariant,
} from "@/components/ui/primitives/Text";

/** The deck's text roles, as its carried code names them, each drawn by an
 *  Averlo `Text` variant (the table is in docs/carried/deck.md). Sizes,
 *  weights and line heights the carried CSS sets on an element still win:
 *  Averlo's variants are Tailwind utilities in a layer, the CSS modules are
 *  not. Body and supporting roles (`bodyRoles`) are drawn regular, 400:
 *  their Averlo variants are regular, and the deck's CSS sets them at
 *  `--deck-type-body-weight` (owner, after the final build: "Regular 400 +
 *  test"; tests/text-weight.spec.ts). */
const variants = {
  display: "heading1",
  "title-l": "subheading1",
  "title-s": "bodySecondary",
  "body-xl": "bodyPrimary",
  "body-l": "bodyPrimary",
  "body-m": "bodyPrimary",
  "label-l": "support",
  "label-m-strong": "fieldLabel",
  "label-m": "support",
} as const satisfies Record<string, AverloVariant>;

/** The body and supporting text roles: block text, point and card
 *  bodies, notes, leads, and the labels that support a title (eyebrows,
 *  fact labels, dates, step labels). Titles and headings keep their
 *  weight. */
export const bodyRoles = [
  "body-xl",
  "body-l",
  "body-m",
  "label-l",
  "label-m",
] as const;

/** The deck's text tones, each an Averlo tone. */
const tones = {
  primary: "default",
  heading: "default",
  secondary: "muted",
} as const satisfies Record<string, AverloTone>;

export type TextVariant = keyof typeof variants;
export type TextTone = keyof typeof tones;

export type TextProps<E extends ElementType = "span"> = {
  variant: TextVariant;
  /** Without one, the text inherits its colour. */
  tone?: TextTone;
  /** Body roles default to `p`, the rest to `span`. */
  as?: E;
} & Omit<ComponentPropsWithRef<E>, "as" | "color">;

/** The Averlo `Text` under the deck's role names. The element keeps
 *  `data-variant` and `data-tone` with the deck's names, which the deck's
 *  tests and styles read. */
export function Text<E extends ElementType = "span">({
  variant,
  tone,
  as,
  ...props
}: TextProps<E>) {
  return (
    <AverloText
      {...(props as object)}
      as={as ?? (variant.startsWith("body-") ? "p" : "span")}
      variant={variants[variant]}
      tone={tone ? tones[tone] : "inherit"}
      data-variant={variant}
      {...(tone ? { "data-tone": tone } : {})}
    />
  );
}
