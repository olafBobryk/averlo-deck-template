"use client";
// The week (feature 003, T311; the `week` block): a working week on one
// glass card, each day with its fixed moment, if any.
import type { IconName } from "@/components/ui/icons/Icon";
import styles from "@/deck/content.module.css";
import { Text as Type } from "@/deck/text";
import { Body, Card, Glyph, Label } from "./parts";
import { words } from "./words";

/** A day's moment: `day` is one of the week's `days`. */
export type DayItem = {
  day: string;
  label: string;
  text?: string;
  icon?: IconName;
};

export function Week({ days, items }: { days: string[]; items: DayItem[] }) {
  return (
    <Card
      as="ol"
      surface="card"
      className={styles.week}
      style={{ ["--days" as string]: days.length }}
    >
      {days.map((day) => {
        const item = items.find((d) => d.day === day);
        return (
          <li
            key={day}
            className={styles.day}
            data-empty={item ? undefined : ""}
          >
            <Type
              as="p"
              variant="label-m"
              tone="secondary"
              className={styles.when}
            >
              {words(day)}
            </Type>
            {item && (
              <>
                <Glyph name={item.icon} />
                <Label text={item.label} />
                <Body text={item.text} />
              </>
            )}
          </li>
        );
      })}
    </Card>
  );
}
