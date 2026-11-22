// The agenda preset (feature 002, T131): two to eight topics in order, each
// led by its number in the accent, with its label and an optional line in
// Averlo Text. Up to four run in one column; more fill two, read down each
// column in turn.
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import styles from "./text.module.css";

export function AgendaPreset({ block, lang }: PresetProps<"agenda">) {
  const n = block.items.length;
  const columns = n > 4 ? 2 : 1;
  return (
    <ol
      className={styles.agenda}
      data-agenda=""
      data-columns={columns}
      style={{ ["--rows" as string]: Math.ceil(n / columns) }}
    >
      {block.items.map((item, i) => (
        <li key={i} className={styles.agendaItem} data-agenda-item="">
          <Text
            as="span"
            variant="title-l"
            className={styles.number}
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
            {say(item.label, lang)}
          </Text>
          {item.text && (
            <Text
              as="p"
              variant="body-m"
              tone="secondary"
              className={styles.agendaText}
            >
              {say(item.text, lang)}
            </Text>
          )}
        </li>
      ))}
    </ol>
  );
}
