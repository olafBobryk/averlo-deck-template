import type { ReactNode } from "react";
import styles from "./WeightLabel.module.css";

/**
 * Crossfade the weight: a selectable item's label,
 * drawn twice in one grid cell, regular and strong, both the wider of the
 * two, so the item never changes width. Its control's selected state
 * (`[data-state=checked|active]`, or `data-selected`) fades the strong layer
 * in on `fade` and the regular out on `exit`, each on itself. The control
 * sets each layer's type with `--weight-regular-font` / `--weight-strong-font`
 * (and the matching `-tracking`).
 */
export function WeightLabel({ children }: { children: ReactNode }) {
  return (
    <span className={styles.label} data-weight-label="">
      <span className={styles.regular}>{children}</span>
      <span className={styles.strong} aria-hidden="true">
        {children}
      </span>
    </span>
  );
}
