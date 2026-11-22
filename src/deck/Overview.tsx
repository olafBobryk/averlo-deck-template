"use client";
import { motion } from "motion/react";
import {
  staggerDelay,
  useMotionTokens,
} from "@/motion/motion";
import { Button } from "@/components/ui/primitives/Button";
import { DeckIcon } from "./icon";
import { MenuDropdown } from "./menu-dropdown";
import { SlideView } from "./SlideView";
import { langNames, langs, type Lang } from "./langs";
import { ui } from "./model";
import { useDeck } from "./version";
import styles from "./menu.module.css";

const two = (n: number) => String(n).padStart(2, "0");

/** The menu card's expanded content: every slide as a thumbnail, sized by its
 *  own 16:9 container. The thumbnails enter by the list recipe, their fade
 *  only, `stagger` apart.
 *  Choosing one goes there; the card closes (MenuCard). */
export function Overview({
  index,
  lang,
  onChoose,
}: {
  index: number;
  lang: Lang;
  onChoose: (index: number) => void;
}) {
  const t = useMotionTokens();
  const { slides } = useDeck();
  return (
    <ol className={styles.grid} aria-label={ui.slides[lang]}>
      {slides.map((slide, i) => (
        <motion.li
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...t.fade, delay: staggerDelay(i, t) }}
        >
          <button
            type="button"
            data-thumb=""
            className={styles.thumb}
            aria-current={i === index || undefined}
            onClick={() => onChoose(i)}
          >
            {/* The picture is not read out; the label line names the button,
                as the menu's slide list does (WCAG 2.5.3, label in name). */}
            <span className={styles.thumbStage} aria-hidden="true">
              <SlideView slide={slide} lang={lang} still />
            </span>
            <span className={styles.thumbLabel}>
              <span>{two(i + 1)}</span>
              {slide.title[lang]}
            </span>
          </button>
        </motion.li>
      ))}
    </ol>
  );
}

/** One Download control, in the card's footer, opening a dropdown
 *  (MenuDropdown) with one PDF per language. Each item is a link to its PDF;
 *  choosing it saves the file and Next does not navigate. */
export function Downloads({
  lang,
  align = "start",
}: {
  lang: Lang;
  align?: "start" | "end";
}) {
  const { pdfHref } = useDeck();
  return (
    <div className={styles.downloads}>
      <MenuDropdown
        kind="menu"
        align={align}
        options={langs.map((option) => ({
          key: option,
          value: option,
          href: pdfHref(option),
          content: (
            <>
              {ui.pdf[lang]} ·{" "}
              {langNames[option]}
            </>
          ),
        }))}
        onChoose={(option, event) => {
          // Saved as a file, as a link with `download` would be.
          event.preventDefault();
          const link = document.createElement("a");
          link.href = pdfHref(option.value);
          link.download = "";
          link.click();
        }}
        trigger={({ isOpen, toggleMenu, ref }) => (
          <Button
            ref={ref}
            variant="outline"
            size="sm"
            leadingIcon={<DeckIcon name="download" />}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={toggleMenu}
          >
            {/* A narrow footer keeps the icon; the name is still read out. */}
            <span className={styles.downloadLabel}>{ui.download[lang]}</span>
          </Button>
        )}
      />
    </div>
  );
}
