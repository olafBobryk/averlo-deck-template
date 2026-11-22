"use client";
// The timeline preset (feature 002, T121): two to eight events in date
// order on one Averlo Panel card, like the deck's plan. Each event is led
// by its date in the muted step label, then its dot on the axis, its label
// and an optional line. The axis, in the border token, runs through every
// dot and ends in an arrow, pointing on in time. The events run across a
// slide; on a phone they run down, the axis down their left.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Text } from "@/deck/text";
import { words } from "../words";
import { ArrowHead, Card, StepLabel, type Entry } from "./parts";
import styles from "@/presets/diagrams/diagrams.module.css";
import { reportLimits } from "../limits";

/** Two to eight events, in date order. */
export type TimelineProps = { events: (Entry & { when: string })[] };

export function Timeline(props: TimelineProps) {
  reportLimits("Timeline", props);
  const n = props.events.length;
  return (
    <Card className={styles.timeline} data-diagram="timeline">
      <ol
        className={styles.events}
        data-count={n}
        style={{ ["--n" as string]: n }}
      >
        {props.events.map((event, i) => (
          <li key={i} className={styles.event} data-timeline-event="">
            <StepLabel>{words(event.when)}</StepLabel>
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
              {words(event.label)}
            </Text>
            {event.text && (
              <Text
                as="p"
                variant="body-m"
                tone="secondary"
                className={styles.text}
                data-timeline-text=""
              >
                {words(event.text)}
              </Text>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
