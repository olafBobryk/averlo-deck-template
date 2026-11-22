"use client";
// Facts (feature 003, T311; the `facts` block): labelled facts on glass
// cards, up to four across.
import styles from "@/deck/content.module.css";
import { Text as Type } from "@/deck/text";
import { Card, rich } from "./parts";
import { words } from "./words";

export type FactItem = { label: string; text?: string };

export function Facts({ items }: { items: FactItem[] }) {
  return (
    <dl className={styles.facts} data-cols={Math.min(items.length, 4)}>
      {items.map((f) => (
        <Card as="div" surface="card" key={f.label} className={styles.fact}>
          <Type
            as="dt"
            variant="label-l"
            tone="secondary"
            className={styles.factLabel}
          >
            {words(f.label)}
          </Type>
          <Type
            as="dd"
            variant="title-l"
            tone="primary"
            className={styles.factText}
          >
            {f.text !== undefined && rich(f.text)}
          </Type>
        </Card>
      ))}
    </dl>
  );
}
