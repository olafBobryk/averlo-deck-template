// The timeline preset (feature 002, T121): two to eight events in date
// order on one Averlo Panel card, like the deck's plan. Each event is led
// by its date in the muted step label, then its dot on the axis, its label
// and an optional line. The axis, in the border token, runs through every
// dot and ends in an arrow, pointing on in time. The events run across a
// slide; on a phone they run down, the axis down their left.
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import { ArrowHead, Card, StepLabel } from "./parts";
import styles from "./diagrams.module.css";

export function TimelinePreset({ block, lang }: PresetProps<"timeline">) {
  const n = block.events.length;
  return (
    <Card className={styles.timeline} data-diagram="timeline">
      <ol
        className={styles.events}
        data-count={n}
        style={{ ["--n" as string]: n }}
      >
        {block.events.map((event, i) => (
          <li key={i} className={styles.event} data-timeline-event="">
            <StepLabel>{say(event.when, lang)}</StepLabel>
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.trackLine}
                data-line=""
                data-connector=""
              />
              <span className={styles.dot} />
              {i === n - 1 && <ArrowHead className={styles.trackHead} />}
            </span>
            <Text
              as="p"
              variant="title-l"
              tone="primary"
              className={styles.label}
              data-timeline-label=""
            >
              {say(event.label, lang)}
            </Text>
            {event.text && (
              <Text
                as="p"
                variant="body-m"
                tone="secondary"
                className={styles.text}
                data-timeline-text=""
              >
                {say(event.text, lang)}
              </Text>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
