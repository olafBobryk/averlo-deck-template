"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/primitives/Button";
import { Collapse } from "@/components/ui/primitives/Collapse";
import { DeckIcon } from "./icon";
import { langs, type Lang } from "./langs";
import { ui, type Slide } from "./model";
import menu from "./menu.module.css";
import styles from "./slide-list.module.css";

/** One line of the list: a slide, and, for a section, its slides
 *  (0-based positions in the deck). */
export type Entry = { index: number; children: number[] };

const sameSection = (a: Slide, b: Slide) =>
  a.section !== undefined &&
  b.section !== undefined &&
  langs.every((lang) => a.section![lang] === b.section![lang]);

/** The list's lines. A section is a `divider` slide; its slides are the ones
 *  after it with the same `section`, up to the next divider. Every other
 *  slide is a line of its own. */
export function entriesOf(slides: Slide[]): Entry[] {
  const entries: Entry[] = [];
  for (let i = 0; i < slides.length; i++) {
    const children: number[] = [];
    if (slides[i].kind === "divider")
      for (
        let j = i + 1;
        j < slides.length &&
        slides[j].kind !== "divider" &&
        sameSection(slides[i], slides[j]);
        j++
      )
        children.push(j);
    entries.push({ index: i, children });
    i += children.length;
  }
  return entries;
}

/** The entry (a section with slides) that holds slide `index`, or -1. */
const holding = (entries: Entry[], index: number) =>
  entries.findIndex(
    (entry) =>
      entry.children.length > 0 &&
      (entry.index === index || entry.children.includes(index)),
  );

/** The menu popup's slide list. Every slide is the same Averlo ghost
 *  `Button`, the current one highlighted. A section's slides sit indented
 *  under its row, in a `Collapse` (sequenced) that its chevron opens and
 *  closes; the row itself goes to the section's slide. Only the current
 *  slide's section is open as the list mounts (each time the menu opens), and
 *  opening one closes the other. When the current slide moves into another
 *  section while the list is up (Previous, Next), that section opens. */
export function SlideList({
  slides,
  index,
  lang,
  onChoose,
}: {
  slides: Slide[];
  index: number;
  lang: Lang;
  onChoose: (index: number) => void;
}) {
  const entries = entriesOf(slides);
  const [open, setOpen] = useState(() => holding(entries, index));
  const [seen, setSeen] = useState(index);
  if (seen !== index) {
    setSeen(index);
    const now = holding(entries, index);
    if (now !== -1 && now !== holding(entries, seen)) setOpen(now);
  }
  const id = useId();
  const pad = (i: number) => String(i + 1).padStart(2, "0");

  const row = (i: number) => {
    const slide = slides[i];
    const current = i === index;
    return (
      <Button
        variant="ghost"
        align="between"
        size="sm"
        hitArea="none"
        className={
          current
            ? `${menu.slideItem} ${styles.row} !bg-background-hover`
            : `${menu.slideItem} ${styles.row}`
        }
        data-sub={slide.parent ? "" : undefined}
        aria-current={current || undefined}
        onClick={() => onChoose(i)}
      >
        <span className={menu.number}>{pad(i)}</span>
        {slide.title[lang]}
      </Button>
    );
  };

  return (
    <ol data-menu-slides="" className={menu.list} aria-label={ui.slides[lang]}>
      {entries.map((entry, k) => {
        const slide = slides[entry.index];
        if (!entry.children.length)
          return <li key={slide.id}>{row(entry.index)}</li>;
        const expanded = open === k;
        const region = `${id}-section-${k}`;
        return (
          <li key={slide.id} data-menu-section="">
            <div className={styles.head}>
              {row(entry.index)}
              <Button
                variant="ghost"
                size="icon-sm"
                hitArea="none"
                className={styles.chevron}
                aria-expanded={expanded}
                aria-controls={region}
                aria-label={`${ui.sectionSlides[lang]}: ${pad(entry.index)} ${slide.title[lang]}`}
                onClick={() => setOpen(expanded ? -1 : k)}
              >
                <DeckIcon name={expanded ? "chevron-down" : "chevron-right"} />
              </Button>
            </div>
            {/* Always there, so the chevron's aria-controls names an element
                whether its slides are shown or not. */}
            <div id={region}>
              <Collapse open={expanded} mode="sequenced">
                <ol className={styles.children}>
                  {entry.children.map((i) => (
                    <li key={slides[i].id}>{row(i)}</li>
                  ))}
                </ol>
              </Collapse>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
