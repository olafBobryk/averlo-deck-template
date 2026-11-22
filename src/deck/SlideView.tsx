"use client";
import { SlideContext } from "@/components/deck";
import type { Lang } from "./langs";
import type { Slide } from "./model";
import { useDeck } from "./version";
import styles from "./deck.module.css";

/** One slide: its file's component (src/slides/, feature 003) in the
 *  slide's frame, with its words in this language. A slide with a layout
 *  shows its title small (the h1, as the footer and menu name it) with the
 *  headline, which states its point, then its blocks, in that composition
 *  (stack, split, split-end, center, statement, module); without one, on
 *  title and divider slides, the title is large, with any lead under it.
 *  The file's parts (`Title`, `Heading`, `Aside`, `Body`, `Block`, from
 *  `@/components/deck`) keep the frame's entrance. Sizes come from the
 *  nearest size container (--u), so the same slide renders full-bleed, in a
 *  thumbnail and on a PDF page.
 *
 *  `still` draws plain text for thumbnails and print: no entrance, no
 *  retype. */
export function SlideView({
  slide,
  lang,
  still = false,
}: {
  slide: Slide;
  lang: Lang;
  still?: boolean;
}) {
  const file = useDeck().files[slide.id];
  if (!file) throw new Error(`slide "${slide.id}" has no slide file`);
  const { layout } = file.meta;
  return (
    <div
      className={styles.slide}
      data-kind={slide.kind}
      data-layout={layout}
      data-headline={layout ? "" : undefined}
      data-deck-title={still ? undefined : ""}
      lang={lang}
    >
      <SlideContext.Provider value={{ still, big: !layout }}>
        <file.Component t={file.copy[lang]} lang={lang} />
      </SlideContext.Provider>
    </div>
  );
}
