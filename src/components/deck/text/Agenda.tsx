"use client";
// The agenda preset (feature 002, T131): two to eight topics in order, each
// led by its number as the muted step label above its label (feature 001,
// T050: "No circles, muted step labels"), with an optional line in Averlo
// Text. Up to four run in one column; more fill two, read down each column
// in turn.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import deck from "@/deck/content.module.css";
import { Text } from "@/deck/text";
import type { Entry } from "../diagrams/parts";
import { words } from "../words";
import styles from "@/presets/text/text.module.css";
import { reportLimits } from "../limits";

/** Two to eight items. */
export type AgendaProps = { items: Entry[] };

export function Agenda(props: AgendaProps) {
  reportLimits("Agenda", props);
  const n = props.items.length;
  const columns = n > 4 ? 2 : 1;
  return (
    <ol
      className={styles.agenda}
      data-agenda=""
      data-columns={columns}
      style={{ ["--rows" as string]: Math.ceil(n / columns) }}
    >
      {props.items.map((item, i) => (
        <li key={i} className={styles.agendaItem} data-agenda-item="">
          <Text
            as="span"
            variant="label-m"
            tone="secondary"
            className={`${deck.when} ${styles.number}`}
            data-step-label=""
            data-agenda-number=""
          >
            {String(i + 1).padStart(2, "0")}
          </Text>
          <Text
            as="p"
            variant="title-l"
            tone="primary"
            className={styles.agendaLabel}
            data-agenda-label=""
          >
            {words(item.label)}
          </Text>
          {item.text && (
            <Text
              as="p"
              variant="body-m"
              tone="secondary"
              className={styles.agendaText}
            >
              {words(item.text)}
            </Text>
          )}
        </li>
      ))}
    </ol>
  );
}
