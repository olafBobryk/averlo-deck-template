"use client";
// The compare preset (feature 002, T131): two options side by side, each an
// Averlo Panel card with its title and its points, in Averlo Text. On a
// phone the two cards stack.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Panel } from "@/components/ui/primitives/Panel";
import { Text } from "@/deck/text";
import { words } from "../words";
import styles from "@/presets/text/text.module.css";

/** Two sides, each a title and its points. */
export type CompareProps = {
  left: { title: string; points: string[] };
  right: { title: string; points: string[] };
};

export function Compare(props: CompareProps) {
  return (
    <div className={styles.compare} data-compare="">
      {(["left", "right"] as const).map((side) => (
        <Panel
          as="section"
          key={side}
          background="surface"
          padding="none"
          gap="none"
          className={styles.side}
          data-compare-side={side}
        >
          <Text
            as="p"
            variant="title-l"
            tone="primary"
            className={styles.sideTitle}
            data-compare-title=""
          >
            {words(props[side].title)}
          </Text>
          <ul className={styles.sidePoints}>
            {props[side].points.map((point, i) => (
              <Text
                as="li"
                key={i}
                variant="body-m"
                tone="secondary"
                className={styles.sidePoint}
                data-compare-point=""
              >
                {words(point)}
              </Text>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
