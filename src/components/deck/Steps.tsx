"use client";
// Steps (feature 003, T311; the `steps` block): each step's dot on a line,
// then, in one column, its label (its `when`, or its number), its title and
// its body. rail (default): down a line at the left; across: along a line,
// in columns.
import styles from "@/deck/content.module.css";
import { Text as Type } from "@/deck/text";
import { StepNumber, rich } from "./parts";
import { words } from "./words";

export type StepItem = {
  label: string;
  when?: string;
  text?: string;
  status?: "done" | "current" | "upcoming";
};

export type StepsProps = { items: StepItem[]; style?: "rail" | "across" };

export function Steps({ items, style = "rail" }: StepsProps) {
  return (
    <ol
      className={styles.steps}
      data-count={items.length}
      data-style={style}
      style={{ ["--n" as string]: items.length }}
    >
      {items.map((s, i) => {
        const status = s.status ?? "upcoming";
        return (
          <li key={s.label} className={styles.step} data-status={status}>
            <span className={styles.track} aria-hidden="true">
              {i < items.length - 1 || style === "across" ? (
                <span className={styles.line} data-step-line="" />
              ) : null}
              <span
                className={styles.stepDot}
                data-step-dot=""
                data-status={status}
              />
            </span>
            {s.when ? (
              <Type
                as="p"
                variant="label-m"
                tone="secondary"
                className={styles.when}
                data-step-label=""
              >
                {words(s.when)}
              </Type>
            ) : (
              <StepNumber i={i} />
            )}
            <Type as="p" variant="title-l" className={styles.stepLabel}>
              {words(s.label)}
            </Type>
            {s.text && (
              <Type
                as="p"
                variant="body-m"
                tone="secondary"
                className={styles.stepText}
              >
                {rich(s.text)}
              </Type>
            )}
          </li>
        );
      })}
    </ol>
  );
}
