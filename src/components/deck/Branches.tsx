"use client";
// Org and fork (feature 003, T311; the `org` and `fork` blocks): one node
// over the items that branch from it, the deck's branching line between.
import styles from "@/deck/content.module.css";
import { phoneSplit, splitItem, splitList } from "@/deck/split";
import { Body, Card, Glyph, Label, type PointItem } from "./parts";

export type BranchesProps = { root: PointItem; items: PointItem[] };

function Branches({
  kind,
  root,
  items,
}: BranchesProps & { kind: "org" | "fork" }) {
  return (
    <div className={styles[kind]}>
      <Card as="div" surface="card" className={styles.root}>
        <Glyph name={root.icon} />
        <Label text={root.label} />
        <Body text={root.text} />
      </Card>
      <ul
        className={`${styles.branches} ${styles.split}`}
        {...splitList(items.length, "across", phoneSplit(items.length))}
      >
        {/* The item draws its share of the branching line; the glass
            card sits inside it, so neither's pseudo-elements meet. */}
        {items.map((p, i) => (
          <li
            key={p.label}
            className={`${styles.branch} ${styles.splitItem}`}
            {...splitItem(i, items.length)}
          >
            <Card as="div" surface="card" className={styles.branchCard}>
              <Glyph name={p.icon} />
              <Label text={p.label} />
              <Body text={p.text} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One node over the roles that report to it. */
export function Org(props: BranchesProps) {
  return <Branches kind="org" {...props} />;
}

/** One stage branching into options. */
export function Fork(props: BranchesProps) {
  return <Branches kind="fork" {...props} />;
}
