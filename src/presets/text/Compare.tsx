// The compare preset (feature 002, T131): two options side by side, each an
// Averlo Panel card with its title and its points, in Averlo Text. On a
// phone the two cards stack.
import { Panel } from "@/components/ui/primitives/Panel";
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import styles from "./text.module.css";

export function ComparePreset({ block, lang }: PresetProps<"compare">) {
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
            {say(block[side].title, lang)}
          </Text>
          <ul className={styles.sidePoints}>
            {block[side].points.map((point, i) => (
              <Text
                as="li"
                key={i}
                variant="body-m"
                tone="secondary"
                className={styles.sidePoint}
                data-compare-point=""
              >
                {say(point, lang)}
              </Text>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
