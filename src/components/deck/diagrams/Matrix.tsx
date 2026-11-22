"use client";
// The 2×2 matrix preset (feature 002, T122): two axes, labelled with `x`
// and `y`, each a line in the border token ending in an arrow from low to
// high; four quadrant Averlo Panel cards, each with its Point's label and
// optional line; and optional items, each a dot at its `x` and `y` (from 0
// to 1, the origin at the bottom left) with its label on a chip beside it.
// The quadrants are given in reading order: top left (low x, high y), top
// right (high x, high y), bottom left (low x, low y), bottom right (high x,
// low y).
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Panel } from "@/components/ui/primitives/Panel";
import { Text } from "@/deck/text";
import type { PointItem } from "../parts";
import { words } from "../words";
import { ArrowHead, Card } from "./parts";
import styles from "@/presets/diagrams/diagrams.module.css";

/** Which side of its dot an item's label sits on, kept inside the plot. */
const side = (x: number) => (x > 0.5 ? "start" : "end");
const level = (y: number) => (y > 0.8 ? "top" : y < 0.2 ? "bottom" : "middle");

/** Two axes, four quadrants (top left, top right, bottom left, bottom
 *  right), and items placed at x and y from 0 to 1. */
export type MatrixProps = {
  x: string;
  y: string;
  quadrants: [PointItem, PointItem, PointItem, PointItem];
  items?: { label: string; x: number; y: number }[];
};

export function Matrix(props: MatrixProps) {
  const items = props.items ?? [];
  return (
    <figure className={styles.matrix} data-diagram="matrix">
      <div className={styles.yAxis}>
        <Text
          as="p"
          variant="label-m"
          tone="secondary"
          className={styles.axisLabel}
          data-matrix-axis="y"
        >
          {words(props.y)}
        </Text>
        <span className={styles.yLine} aria-hidden="true" data-connector="">
          <ArrowHead up className={styles.axisHead} />
          <span className={styles.axisLine} data-line="" />
        </span>
      </div>
      <div className={styles.plot} data-matrix-plot="">
        <ul className={styles.quadrants}>
          {props.quadrants.map((quadrant, i) => (
            <Card
              as="li"
              key={i}
              className={styles.quadrant}
              data-matrix-quadrant=""
            >
              <Text
                as="p"
                variant="title-l"
                tone="primary"
                className={styles.label}
                data-matrix-label=""
              >
                {words(quadrant.label)}
              </Text>
              {quadrant.text && (
                <Text
                  as="p"
                  variant="body-m"
                  tone="secondary"
                  className={styles.text}
                >
                  {words(quadrant.text)}
                </Text>
              )}
            </Card>
          ))}
        </ul>
        {items.length > 0 && (
          <ul className={styles.items}>
            {items.map((item, i) => (
              <li
                key={i}
                className={styles.item}
                data-matrix-item=""
                data-side={side(item.x)}
                data-level={level(item.y)}
                style={{
                  ["--x" as string]: item.x,
                  ["--y" as string]: item.y,
                }}
              >
                <span className={styles.itemDot} data-matrix-dot="" />
                <Panel
                  as="span"
                  background="surface"
                  padding="none"
                  gap="none"
                  className={`!w-auto rounded-pill ${styles.chip}`}
                >
                  <Text
                    as="span"
                    variant="label-m"
                    tone="primary"
                    className={styles.chipText}
                    data-matrix-item-label=""
                  >
                    {words(item.label)}
                  </Text>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.xAxis}>
        <span className={styles.xLine} aria-hidden="true" data-connector="">
          <span className={styles.axisLine} data-line="" />
          <ArrowHead className={styles.axisHead} />
        </span>
        <Text
          as="p"
          variant="label-m"
          tone="secondary"
          className={styles.axisLabel}
          data-matrix-axis="x"
        >
          {words(props.x)}
        </Text>
      </div>
    </figure>
  );
}
