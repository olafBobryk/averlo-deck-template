"use client";
// The plan (feature 003, T311; the `plan` block): a time axis from `start`
// to `end` (YYYY-MM) on one glass card. Dated marks sit at their month,
// above and below the axis in turn, each with its dot on the axis; an
// undated span is a bar under the axis across its months, in order, with no
// dates of its own.
import styles from "@/deck/content.module.css";
import { Text as Type } from "@/deck/text";
import { Card } from "./parts";
import { words } from "./words";

/** A mark on the plan's time axis: a date (`at`, YYYY-MM) or a span. */
export type PlanMark = {
  label: string;
  at?: string;
  span?: [string, string];
  status?: "done" | "current" | "upcoming";
};

export type PlanProps = { start: string; end: string; items: PlanMark[] };

/** Months from `from` to `to` (YYYY-MM), for the plan's axis. */
const months = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};
const monthName = (at: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${at}-01T12:00:00`));

export function Plan({ start, end, items }: PlanProps) {
  const total = months(start, end);
  const at = (m: string) => (months(start, m) / total) * 100;
  const dated = items.filter((m): m is PlanMark & { at: string } =>
    Boolean(m.at),
  );
  const spans = items.filter((m) => m.span);
  const edge = (m: PlanMark & { at: string }) =>
    m.at === start ? "start" : m.at === end ? "end" : undefined;
  const side = (m: PlanMark & { at: string }, i: number) =>
    m.at === end || i % 2 === 0 ? "above" : "below";
  return (
    <Card as="div" surface="card" className={styles.plan}>
      <ol className={styles.marks}>
        {dated.map((m, i) => (
          <li
            key={m.label}
            className={styles.mark}
            style={{ ["--at" as string]: `${at(m.at)}%` }}
            data-status={m.status ?? "upcoming"}
            data-side={side(m, i)}
            data-edge={edge(m)}
          >
            <Type
              as="p"
              variant="label-m"
              tone="secondary"
              className={styles.when}
            >
              {monthName(m.at)}
            </Type>
            <Type as="p" variant="title-l" className={styles.stepLabel}>
              {words(m.label)}
            </Type>
          </li>
        ))}
      </ol>
      <div className={styles.axis} aria-hidden="true">
        {dated.map((m) => (
          <span
            key={m.label}
            className={styles.dot}
            style={{ ["--at" as string]: `${at(m.at)}%` }}
            data-status={m.status ?? "upcoming"}
          />
        ))}
      </div>
      {spans.length > 0 && (
        <ol className={styles.spans}>
          {spans.map((m) => (
            <li
              key={m.label}
              className={styles.span}
              style={{
                ["--from" as string]: `${at(m.span![0])}%`,
                ["--to" as string]: `${at(m.span![1])}%`,
              }}
            >
              <Type
                as="p"
                variant="label-l"
                tone="secondary"
                className={styles.spanLabel}
              >
                {words(m.label)}
              </Type>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
