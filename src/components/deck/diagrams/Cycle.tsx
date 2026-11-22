"use client";
// The cycle preset (feature 002, T121): three to six stages that repeat,
// each an Averlo Panel card led by its number in the muted step label, with
// its label and an optional line. An arrow in the border token leads from
// each stage to the next, and a return line under them leads from the last
// back into the first, so the order reads as a loop. The stages run across
// a slide, the return under them; on a phone they run down, the return up
// their left.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Text } from "@/deck/text";
import { words } from "../words";
import { Arrow, ArrowHead, Card, StepLabel, number, type Entry } from "./parts";
import styles from "@/presets/diagrams/diagrams.module.css";
import { reportLimits } from "../limits";

/** Three to six stages. */
export type CycleProps = { stages: Entry[] };

export function Cycle(props: CycleProps) {
  reportLimits("Cycle", props);
  const n = props.stages.length;
  return (
    <ol
      className={styles.cycle}
      data-diagram="cycle"
      data-count={n}
      style={{ ["--n" as string]: n }}
    >
      {props.stages.map((stage, i) => (
        <li
          key={i}
          className={styles.stage}
          data-cycle-stage=""
          data-at={i === 0 ? "first" : i === n - 1 ? "last" : undefined}
        >
          <Card className={styles.flowCard}>
            <StepLabel>{number(i)}</StepLabel>
            <Text
              as="p"
              variant="title-l"
              tone="primary"
              className={styles.label}
              data-cycle-label=""
            >
              {words(stage.label)}
            </Text>
            {stage.text && (
              <Text
                as="p"
                variant="body-m"
                tone="secondary"
                className={styles.text}
                data-cycle-text=""
              >
                {words(stage.text)}
              </Text>
            )}
          </Card>
          {i < n - 1 && <Arrow className={styles.next} />}
          {/* Its share of the return line; the first stage's ends in the
              arrow back into it. */}
          <span
            className={styles.loop}
            aria-hidden="true"
            data-line=""
            data-connector=""
          >
            {i === 0 && <ArrowHead className={styles.loopHead} />}
          </span>
        </li>
      ))}
    </ol>
  );
}
