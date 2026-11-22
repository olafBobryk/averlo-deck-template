"use client";
// The stat preset (feature 002, T112): one to four headline figures, each
// an Averlo Panel card with its value exactly as the source writes it, an
// optional unit, its label and an optional note, in Averlo Text.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Panel } from "@/components/ui/primitives/Panel";
import { Text as AverloText } from "@/components/ui/primitives/Text";
import { Text } from "@/deck/text";
import { words } from "../words";
import styles from "@/presets/charts/charts.module.css";

/** One headline figure: its value exactly as the source writes it. */
export type StatItem = {
  value: string;
  label: string;
  unit?: string;
  note?: string;
};

/** One to four figures. */
export type StatProps = { items: StatItem[] };

export function Stat(props: StatProps) {
  return (
    <ul
      className={styles.stats}
      style={{ ["--n" as string]: props.items.length }}
      data-count={props.items.length}
    >
      {props.items.map((item, i) => (
        <Panel
          as="li"
          key={i}
          background="surface"
          padding="none"
          gap="none"
          className={styles.stat}
          data-stat=""
        >
          <p className={styles.figure}>
            <AverloText
              as="span"
              variant="metricNumber"
              className={styles.value}
              data-stat-value=""
            >
              {item.value}
            </AverloText>
            {item.unit && (
              <Text
                as="span"
                variant="label-l"
                tone="secondary"
                className={styles.statUnit}
              >
                {words(item.unit)}
              </Text>
            )}
          </p>
          <Text
            as="p"
            variant="title-l"
            className={styles.statLabel}
            data-stat-label=""
          >
            {words(item.label)}
          </Text>
          {item.note && (
            <Text
              as="p"
              variant="body-m"
              tone="secondary"
              className={styles.statNote}
            >
              {words(item.note)}
            </Text>
          )}
        </Panel>
      ))}
    </ul>
  );
}
