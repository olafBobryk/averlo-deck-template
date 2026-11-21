"use client";
import type { CSSProperties, ReactNode } from "react";
import { HeadingText } from "@/motion/page-header/heading-text";
import { Text } from "./text";
import type { Lang } from "./langs";
import { sectionLabel } from "./model";
import { useDeck } from "./version";
import styles from "./deck.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** The footer row: wordmark · section label · "07 / 21" ·
 *  menu slot, with the progress bar under it. The bar's real width follows
 *  the slide on the component spring (deck.module.css). The section label
 *  goes through `HeadingText`, so it retypes when it changes; `still` (print)
 *  draws it as plain text. `menu` is MenuCard's slot.
 *
 *  On a portrait screen deck.module.css hides the
 *  wordmark and the section label, leaving the number, the menu and the bar;
 *  print keeps all of it. */
export function Footer({
  index,
  lang,
  menu,
  still = false,
}: {
  index: number;
  lang: Lang;
  menu?: ReactNode;
  still?: boolean;
}) {
  const { slides } = useDeck();
  const label = sectionLabel(slides[index], lang);
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        {/* The wordmark. */}
        <Text variant="title-l" tone="primary" className={styles.wordmark}>
          Deck
        </Text>
        {still ? (
          <Text
            as="p"
            variant="label-m"
            tone="primary"
            className={styles.section}
          >
            {label}
          </Text>
        ) : (
          <HeadingText
            wordings={label}
            as="p"
            variant="label-m"
            tone="primary"
            className={styles.section}
          />
        )}
        <Text variant="label-m-strong" tone="primary" className={styles.count}>
          {pad(index + 1)} / {pad(slides.length)}
        </Text>
      </div>
      {menu !== undefined && (
        <div className={styles.menuSlot} data-footer-menu="">
          {menu}
        </div>
      )}
      <div
        className={styles.progress}
        data-progress=""
        role="progressbar"
        aria-label={`${pad(index + 1)} / ${pad(slides.length)}`}
        aria-valuemin={1}
        aria-valuemax={slides.length}
        aria-valuenow={index + 1}
        style={{ "--progress": (index + 1) / slides.length } as CSSProperties}
      >
        <div className={styles.progressFill} data-progress-fill="" />
      </div>
    </footer>
  );
}
