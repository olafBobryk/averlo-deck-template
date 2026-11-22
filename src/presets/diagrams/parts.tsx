// The diagram presets' shared parts (feature 002, T121, T122),
// template-owned: a card (the Averlo Panel, as the deck's facts, plan and
// week cards are), the step label (the navigator's muted step label, the
// deck's own `.when` style from feature 001, P8, so both stay one style),
// and the arrow that joins two items where their order matters: a line and
// an Averlo icon's chevron, both in the border token.
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons/Icon";
import { Panel } from "@/components/ui/primitives/Panel";
import deck from "@/deck/content.module.css";
import { Text } from "@/deck/text";
import styles from "./diagrams.module.css";

/** A diagram's card: the Averlo Panel on the surface, padded by the
 *  diagram's CSS. */
export function Card({
  as = "div",
  className,
  children,
  ...rest
}: {
  as?: "div" | "li" | "span";
  className?: string;
  children: ReactNode;
  [data: `data-${string}`]: string | undefined;
}) {
  return (
    <Panel
      as={as}
      background="surface"
      padding="none"
      gap="none"
      className={[styles.card, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </Panel>
  );
}

/** A step, event or stage label: its number or its date, in the deck's
 *  muted step label. */
export function StepLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      as="span"
      variant="label-m"
      tone="secondary"
      className={`${deck.when} ${styles.stepLabel}`}
      data-step-label=""
    >
      {children}
    </Text>
  );
}

/** Item `i`'s number, as the step label shows it: 01, 02, … */
export const number = (i: number) => String(i + 1).padStart(2, "0");

/** The arrow from one item to the next: a line in the border token ending
 *  in the icon set's chevron, in the same token. It points right; a
 *  diagram's CSS turns it where its items run down. */
export function Arrow({ className }: { className?: string }) {
  return (
    <span
      className={[styles.arrow, className].filter(Boolean).join(" ")}
      aria-hidden="true"
      data-connector=""
    >
      <span className={styles.arrowLine} data-line="" />
      <ArrowHead />
    </span>
  );
}

/** An arrow's head alone: the icon set's chevron in the border token. */
export function ArrowHead({
  className,
  up = false,
}: {
  className?: string;
  up?: boolean;
}) {
  return (
    <Icon
      name={up ? "chevron-up" : "chevron-right"}
      className={[styles.arrowHead, className].filter(Boolean).join(" ")}
      data-arrow=""
    />
  );
}
