"use client";
// The flow preset (feature 002, T121): two to seven steps in order, each an
// Averlo Panel card led by its number in the muted step label, with its
// label and an optional line, and an arrow in the border token to the next
// step. The steps run across a slide; on a phone they run down.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Text } from "@/deck/text";
import { words } from "../words";
import { Arrow, Card, StepLabel, number, type Entry } from "./parts";
import styles from "@/presets/diagrams/diagrams.module.css";

/** Two to seven steps, in order. */
export type FlowProps = { steps: Entry[] };

export function Flow(props: FlowProps) {
  const n = props.steps.length;
  return (
    <ol
      className={styles.flow}
      data-diagram="flow"
      data-count={n}
      style={{ ["--n" as string]: n }}
    >
      {props.steps.map((step, i) => (
        <li key={i} className={styles.flowStep} data-flow-step="">
          <Card className={styles.flowCard}>
            <StepLabel>{number(i)}</StepLabel>
            <Text
              as="p"
              variant="title-l"
              tone="primary"
              className={styles.label}
              data-flow-label=""
            >
              {words(step.label)}
            </Text>
            {step.text && (
              <Text
                as="p"
                variant="body-m"
                tone="secondary"
                className={styles.text}
                data-flow-text=""
              >
                {words(step.text)}
              </Text>
            )}
          </Card>
          {i < n - 1 && <Arrow className={styles.next} />}
        </li>
      ))}
    </ol>
  );
}
