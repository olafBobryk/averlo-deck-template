// The comparison table preset (feature 002, T122): options against
// criteria, at most 5 columns and 8 rows, on one Averlo Panel card. The
// header row names the columns in the muted label; each row leads with its
// label, then one cell per column, in the given order, between hairlines in
// the border token. On a phone each row stacks: its label, then each cell
// under its column's name.
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import { Card } from "./parts";
import styles from "./diagrams.module.css";

export function CompareTablePreset({ block, lang }: PresetProps<"table">) {
  return (
    <Card className={styles.tableCard} data-diagram="table">
      <table
        className={styles.table}
        data-columns={block.columns.length}
        style={{ ["--columns" as string]: block.columns.length }}
      >
        <thead>
          <tr>
            <td className={styles.corner} />
            {block.columns.map((column, i) => (
              <Text
                as="th"
                key={i}
                scope="col"
                variant="label-m"
                tone="secondary"
                className={styles.head}
                data-table-column=""
              >
                {say(column, lang)}
              </Text>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className={styles.row} data-table-row="">
              <Text
                as="th"
                scope="row"
                variant="title-l"
                tone="primary"
                className={styles.rowLabel}
                data-table-label=""
              >
                {say(row.label, lang)}
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
                    {say(block.columns[i], lang)}
                  </Text>
                  <Text
                    as="span"
                    variant="body-m"
                    tone="secondary"
                    className={styles.cellText}
                    data-table-cell=""
                  >
                    {say(cell, lang)}
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
