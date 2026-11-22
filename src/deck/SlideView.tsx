"use client";
import {
  Aside,
  Block,
  Body,
  Heading,
  SlideContext,
  Title,
} from "@/components/deck";
import { slideContent } from "./content";
import { BlockView } from "./SlideBody";
import type { Lang } from "./langs";
import type { Slide } from "./model";
import { useDeck } from "./version";
import styles from "./deck.module.css";

/** One slide. A content slide with a headline shows its title small (the
 *  h1, as the footer and menu name it) with the headline, which states its
 *  point, then its blocks, in the composition its layout names (stack,
 *  split, split-end, center, statement, module). Without a layout, on title
 *  and divider slides, the title is large, with any lead under it. Sizes
 *  come from the nearest size container (--u), so the same slide renders
 *  full-bleed, in a thumbnail and on a PDF page.
 *
 *  A slide given as a file (src/slides/, feature 003) draws its own
 *  component in the slide's frame, with its words in this language; its
 *  parts (`Title`, `Heading`, `Aside`, `Body`, `Block`, from
 *  `@/components/deck`) keep the frame's entrance. The preset gallery's
 *  slides are still data: they are drawn with the same parts.
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
  const deck = useDeck();
  const file = deck.files?.[slide.id];
  const content = file ? null : slideContent(slide.id, deck.content);
  const layout = file
    ? file.meta.layout
    : content!.headline
      ? (content!.layout ?? "stack")
      : undefined;
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
        {file ? (
          <file.Component t={file.copy[lang]} lang={lang} />
        ) : (
          <DataSlide slide={slide} lang={lang} still={still} />
        )}
      </SlideContext.Provider>
    </div>
  );
}

/** A data slide (the preset gallery's): its title or heading, then its
 *  blocks, each drawn by its component (`BlockView`). In a split layout, a
 *  plain lead that comes first, before a visual, is the slide's body text:
 *  it stands under the headline, in the heading's column, beside the
 *  visual (`Aside`; T051). */
function DataSlide({
  slide,
  lang,
  still,
}: {
  slide: Slide;
  lang: Lang;
  still: boolean;
}) {
  const deck = useDeck();
  const content = slideContent(slide.id, deck.content);
  const { headline } = content;
  const big = !headline;
  const [first] = content.blocks;
  const aside =
    !big &&
    (content.layout === "split" || content.layout === "split-end") &&
    content.blocks.length > 1 &&
    first.type === "lead" &&
    !first.size
      ? first
      : null;
  const blocks = aside ? content.blocks.slice(1) : content.blocks;
  return (
    <>
      {big ? (
        <Title>{slide.title[lang]}</Title>
      ) : (
        <Heading
          title={slide.title[lang]}
          headline={headline.text[lang]}
          muted={headline.muted?.[lang]}
        />
      )}
      {aside && (
        <Aside type={aside.type}>
          <BlockView block={aside} lang={lang} still={still} />
        </Aside>
      )}
      {blocks.length > 0 && (
        <Body>
          {blocks.map((block, i) => (
            <Block key={i} type={block.type}>
              <BlockView block={block} lang={lang} still={still} />
            </Block>
          ))}
        </Body>
      )}
    </>
  );
}
