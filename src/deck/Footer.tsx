"use client";
import type { ReactNode } from "react";
import { HeadingText } from "@/motion/page-header/heading-text";
import { Text } from "./text";
import type { Lang } from "./langs";
import { sectionLabel } from "./model";
import { Navigator } from "./navigator";
import { SlideNumber } from "./slide-number";
import { useDeck } from "./version";
import styles from "./deck.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** The footer row: section label · "07 / 21" · menu slot, with the
 *  progress navigator under it at the bottom edge (navigator.tsx), its mound
 *  pointing up; `onNavigate(step)` goes to slide `step` (1-based), from the
 *  navigator or from a slide number typed into the count (slide-number.tsx).
 *  The section label goes through `HeadingText`, so it retypes when it
 *  changes; `still` (print) draws it as plain text. `menu` is MenuCard's
 *  slot.
 *
 *  On a portrait screen deck.module.css hides the section label, leaving the
 *  number, the menu and the navigator; print keeps all of it. */
export function Footer({
  index,
  lang,
  menu,
  onNavigate,
  still = false,
}: {
  index: number;
  lang: Lang;
  menu?: ReactNode;
  onNavigate?: (step: number) => void;
  still?: boolean;
}) {
  const { slides } = useDeck();
  const label = sectionLabel(slides[index], lang);
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
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
          {still || !onNavigate ? (
            pad(index + 1)
          ) : (
            <SlideNumber
              n={index + 1}
              total={slides.length}
              lang={lang}
              onGo={onNavigate}
            />
          )}{" "}
          / {pad(slides.length)}
        </Text>
      </div>
      {menu !== undefined && (
        <div className={styles.menuSlot} data-footer-menu="">
          {menu}
        </div>
      )}
      <div className={styles.progress} data-progress="">
        <Navigator
          index={index}
          total={slides.length}
          lang={lang}
          onNavigate={onNavigate}
        />
      </div>
    </footer>
  );
}
