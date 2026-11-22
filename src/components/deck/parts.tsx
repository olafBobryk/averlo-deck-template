"use client";
// The deck components' shared parts (feature 003, T311), moved from the
// data block switch the deck had then, with their markup unchanged: a
// card (the Averlo Panel) or pill, a glyph from the icon set, the muted
// step number, and a point's label and body. Words are plain strings; key
// phrases in body text are marked `**…**` and drawn bold (`rich`), and
// labels drop the marks (`words`).
import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { Panel } from "@/components/ui/primitives/Panel";
import styles from "@/deck/content.module.css";
import { Text as Type } from "@/deck/text";
import { words } from "./words";

/** Key phrases in body text are marked `**…**`. */
const KEY = "**";

/** Body text with its key phrases in bold: the same words as `words`,
 *  each `**…**` run a `<strong>`; text without marks stays one string. */
export function rich(text: string): ReactNode {
  const runs = text.split(KEY);
  if (runs.length === 1) return runs[0];
  return runs.map((run, i) =>
    i % 2 ? (
      <strong key={i} className={styles.key}>
        {run}
      </strong>
    ) : (
      run
    ),
  );
}

/** A card is the Averlo Panel; a pill is one rounded fully, as wide as its
 *  content. Each keeps a backdrop blur, so the deck's fades (a glass
 *  block's `Block`, route-transition's `fade="glass"`) still find each card
 *  on its own glass. Without a surface, the plain element. */
export type Surface = "card" | "pill";
export function Card({
  as,
  surface,
  className,
  children,
  ...rest
}: {
  as: "li" | "div" | "dl" | "ol";
  surface?: Surface;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  if (!surface) {
    const Tag = as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  return (
    <Panel
      as={as}
      background="surface"
      padding="none"
      gap="none"
      className={[
        "backdrop-blur-lg",
        surface === "pill" && "!w-auto rounded-pill",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Panel>
  );
}

/** A glyph from the icon set, sized with the slide (--u). */
export function Glyph({ name }: { name?: IconName }) {
  if (!name) return null;
  return (
    <span className={styles.glyph}>
      <Icon name={name} className="size-[var(--icon-slot-size)]" />
    </span>
  );
}

/** A number as the muted step label (the navigator's, `.when`): 01, 02, …
 *  It leads a numbered point or a step without a `when`. Hidden from
 *  assistive technology: the ordered list numbers its items. */
const number = (i: number) => String(i + 1).padStart(2, "0");
export function StepNumber({ i }: { i: number }) {
  return (
    <Type
      as="p"
      variant="label-m"
      tone="secondary"
      className={styles.when}
      data-step-label=""
      aria-hidden="true"
    >
      {number(i)}
    </Type>
  );
}

export function Label({ text }: { text: string }) {
  return (
    <Type as="p" variant="title-l" className={styles.pointLabel}>
      {words(text)}
    </Type>
  );
}
export function Body({ text }: { text?: string }) {
  if (text === undefined) return null;
  return (
    <Type as="p" variant="body-m" tone="secondary" className={styles.pointText}>
      {rich(text)}
    </Type>
  );
}

/** A point, a node or a day's moment: a label, an optional body and an
 *  optional glyph. */
export type PointItem = { label: string; text?: string; icon?: IconName };
