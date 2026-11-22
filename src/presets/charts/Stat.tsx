// The stat preset (feature 002, T112): one to four headline figures, each
// an Averlo Panel card with its value exactly as the source writes it, an
// optional unit, its label and an optional note, in Averlo Text.
import { Panel } from "@/components/ui/primitives/Panel";
import { Text as AverloText } from "@/components/ui/primitives/Text";
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import styles from "./charts.module.css";

export function StatPreset({ block, lang }: PresetProps<"stat">) {
  return (
    <ul
      className={styles.stats}
      style={{ ["--n" as string]: block.items.length }}
      data-count={block.items.length}
    >
      {block.items.map((item, i) => (
        <Panel
          as="li"
          key={i}
          background="surface"
          padding="none"
          gap="none"
          className={styles.stat}
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
                {say(item.unit, lang)}
              </Text>
            )}
          </p>
          <Text as="p" variant="title-l" className={styles.statLabel}>
            {say(item.label, lang)}
          </Text>
          {item.note && (
            <Text
              as="p"
              variant="body-m"
              tone="secondary"
              className={styles.statNote}
            >
              {say(item.note, lang)}
            </Text>
          )}
        </Panel>
      ))}
    </ul>
  );
}
