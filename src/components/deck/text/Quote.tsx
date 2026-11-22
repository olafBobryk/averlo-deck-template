"use client";
// The quote preset (feature 002, T131): a quotation, word for word, large
// in Averlo Text under an accent quotation mark, with who said it and their
// role, when given, muted under it.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Text } from "@/deck/text";
import { words } from "../words";
import styles from "@/presets/text/text.module.css";

export type QuoteProps = { text: string; by?: string; role?: string };

export function Quote(props: QuoteProps) {
  return (
    <figure className={styles.quote} data-quote="">
      <span className={styles.mark} aria-hidden="true">
        {"“"}
      </span>
      <Text
        as="blockquote"
        variant="display"
        tone="primary"
        className={styles.quoteText}
      >
        {words(props.text)}
      </Text>
      {(props.by || props.role) && (
        <figcaption className={styles.by}>
          {props.by && (
            <Text
              as="span"
              variant="title-l"
              tone="primary"
              className={styles.byName}
              data-quote-by=""
            >
              {words(props.by)}
            </Text>
          )}
          {props.role && (
            <Text
              as="span"
              variant="body-m"
              tone="secondary"
              className={styles.byRole}
              data-quote-role=""
            >
              {words(props.role)}
            </Text>
          )}
        </figcaption>
      )}
    </figure>
  );
}
