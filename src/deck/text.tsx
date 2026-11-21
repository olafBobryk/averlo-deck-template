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
 *  not. */
const variants = {
  display: "heading1",
  "title-l": "subheading1",
  "title-s": "bodySecondary",
  "body-xl": "bodyPrimary",
  "body-l": "bodyPrimary",
  "body-m": "bodyPrimary",
  "label-l": "fieldLabel",
  "label-m-strong": "fieldLabel",
  "label-m": "support",
} as const satisfies Record<string, AverloVariant>;

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
