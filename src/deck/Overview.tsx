"use client";
import { motion } from "motion/react";
import {
  staggerDelay,
  useMotionTokens,
} from "@/motion/motion";
import { Button } from "@/_origin-temp/ui/primitives/button/Button";
import { Icon } from "@/_origin-temp/ui/primitives/icon/Icon";
import { DropdownMenu } from "@/_origin-temp/ui/overlays/dropdown-menu/DropdownMenu";
import { SlideView } from "./SlideView";
import { langs, type Lang } from "./langs";
import { pdfHref, ui } from "./model";
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

/** One Download control, in the card's footer, opening the DropdownMenu
 *  with one PDF per language. A row is a link with
 *  `download`, so choosing it saves the file and Next does not navigate. */
export function Downloads({
  lang,
  align = "start",
  side = "bottom",
}: {
  lang: Lang;
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  return (
    <div className={styles.downloads}>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button size="sm" leadingIcon={<Icon name="download" />}>
            {/* A narrow footer keeps the icon; the name is still read out. */}
            <span className={styles.downloadLabel}>{ui.download[lang]}</span>
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align={align} side={side} data-menu-downloads="">
          {langs.map((option) => (
            <DropdownMenu.Item
              key={option}
              href={pdfHref(option)}
              // Passed on to the link: save the file, and no prefetch of it.
              {...({ download: "", prefetch: false } as object)}
            >
              {ui.pdf[lang]} ·{" "}
              {option === "en" ? ui.english[lang] : ui.french[lang]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
}
