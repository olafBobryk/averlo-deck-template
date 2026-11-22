// The flow preset (feature 002, T121): two to seven steps in order, each an
// Averlo Panel card led by its number in the muted step label, with its
// label and an optional line, and an arrow in the border token to the next
// step. The steps run across a slide; on a phone they run down.
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import { Arrow, Card, StepLabel, number } from "./parts";
import styles from "./diagrams.module.css";

export function FlowPreset({ block, lang }: PresetProps<"flow">) {
  const n = block.steps.length;
  return (
    <ol
      className={styles.flow}
      data-diagram="flow"
      data-count={n}
      style={{ ["--n" as string]: n }}
    >
      {block.steps.map((step, i) => (
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
              {say(step.label, lang)}
            </Text>
            {step.text && (
              <Text
                as="p"
                variant="body-m"
                tone="secondary"
                className={styles.text}
                data-flow-text=""
              >
                {say(step.text, lang)}
              </Text>
            )}
          </Card>
          {i < n - 1 && <Arrow className={styles.next} />}
        </li>
      ))}
    </ol>
  );
}
