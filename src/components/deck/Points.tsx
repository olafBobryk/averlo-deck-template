"use client";
// Points (feature 003, T311; the `points` block): glass cards in columns,
// numbered rows, or chips for a short checklist.
import styles from "@/deck/content.module.css";
import {
  Body,
  Card,
  Glyph,
  Label,
  StepNumber,
  type PointItem,
  type Surface,
} from "./parts";

export type PointsProps = {
  items: PointItem[];
  columns?: 2 | 3 | 4 | 5;
  /** cards (default), numbered rows, or chips for a short checklist. */
  style?: "cards" | "numbered" | "chips";
};

export function Points({ items, columns = 3, style = "cards" }: PointsProps) {
  const surface: Surface = style === "chips" ? "pill" : "card";
  return (
    <ol className={styles.points} data-cols={columns} data-style={style}>
      {items.map((p, i) => (
        <Card as="li" key={p.label} surface={surface} className={styles.point}>
          {style === "numbered" && <StepNumber i={i} />}
          {style !== "numbered" && <Glyph name={p.icon} />}
          <Label text={p.label} />
          <Body text={p.text} />
        </Card>
      ))}
    </ol>
  );
}
