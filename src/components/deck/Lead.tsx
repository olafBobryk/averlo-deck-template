"use client";
// A slide's lead and its note (feature 003, T311; the `lead` and `note`
// blocks): body text, its key phrases (`**…**`) in bold.
import styles from "@/deck/content.module.css";
import { Text as Type } from "@/deck/text";
import { rich } from "./parts";

/** The slide's body text, large and muted. `statement`: one large claim. */
export function Lead({
  children,
  size,
}: {
  children: string;
  size?: "statement";
}) {
  return (
    <Type
      as="p"
      variant="body-xl"
      tone="secondary"
      className={styles.lead}
      data-size={size}
    >
      {rich(children)}
    </Type>
  );
}

/** A note in the primary tone. */
export function Note({ children }: { children: string }) {
  return (
    <Type as="p" variant="body-l" tone="primary" className={styles.note}>
      {rich(children)}
    </Type>
  );
}
