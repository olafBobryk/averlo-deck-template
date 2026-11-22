"use client";
// The comparison table preset (feature 002, T122): options against
// criteria, at most 5 columns and 8 rows, on one Averlo Panel card. The
// header row names the columns in the muted label; each row leads with its
// label, then one cell per column, in the given order, between hairlines in
// the border token. On a phone each row stacks: its label, then each cell
// under its column's name.
// A deck component (feature 003, T311): moved here from src/presets/ with
// its markup unchanged; its words are plain strings.
import { Text } from "@/deck/text";
import { words } from "../words";
import { Card } from "./parts";
import styles from "@/presets/diagrams/diagrams.module.css";

/** At most 5 columns and 8 rows, each row a label and one cell per
 *  column. */
export type TableProps = {
  columns: string[];
  rows: { label: string; cells: string[] }[];
};

export function Table(props: TableProps) {
  return (
    <Card className={styles.tableCard} data-diagram="table">
      <table
        className={styles.table}
        data-columns={props.columns.length}
        style={{ ["--columns" as string]: props.columns.length }}
      >
        <thead>
          <tr>
            <td className={styles.corner} />
            {props.columns.map((column, i) => (
              <Text
                as="th"
                key={i}
                scope="col"
                variant="label-m"
                tone="secondary"
                className={styles.head}
                data-table-column=""
              >
                {words(column)}
              </Text>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, r) => (
            <tr key={r} className={styles.row} data-table-row="">
              <Text
                as="th"
                scope="row"
                variant="title-l"
                tone="primary"
                className={styles.rowLabel}
                data-table-label=""
              >
                {words(row.label)}
              </Text>
              {row.cells.map((cell, i) => (
                <td key={i} className={styles.cell} data-column={i}>
                  {/* The column's name, shown only where the row stacks. */}
                  <Text
                    as="span"
                    variant="label-m"
                    tone="secondary"
                    className={styles.cellColumn}
                    aria-hidden="true"
                  >
                    {words(props.columns[i])}
                  </Text>
                  <Text
                    as="span"
                    variant="body-m"
                    tone="secondary"
                    className={styles.cellText}
                    data-table-cell=""
                  >
                    {words(cell)}
                  </Text>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
