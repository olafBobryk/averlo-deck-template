// The quote preset (feature 002, T131): a quotation, word for word, large
// in Averlo Text under an accent quotation mark, with who said it and their
// role, when given, muted under it.
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import styles from "./text.module.css";

export function QuotePreset({ block, lang }: PresetProps<"quote">) {
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
        {say(block.text, lang)}
      </Text>
      {(block.by || block.role) && (
        <figcaption className={styles.by}>
          {block.by && (
            <Text
              as="span"
              variant="title-l"
              tone="primary"
              className={styles.byName}
              data-quote-by=""
            >
              {say(block.by, lang)}
            </Text>
          )}
          {block.role && (
            <Text
              as="span"
              variant="body-m"
              tone="secondary"
              className={styles.byRole}
              data-quote-role=""
            >
              {say(block.role, lang)}
            </Text>
          )}
        </figcaption>
      )}
    </figure>
  );
}
