"use client";
import { HeadingText } from "@/motion/page-header/heading-text";
import { PageSection } from "@/motion/route-transition";
import { Text } from "./text";
import { slideContent, type Headline } from "./content";
import { BlockView, holdsGlass, say } from "./SlideBody";
import type { Lang } from "./langs";
import type { Slide } from "./model";
import styles from "./deck.module.css";
import body from "./content.module.css";

/** One slide. A content slide with a headline shows its title small (the
 *  h1, as the footer and menu name it) with the headline, which states its
 *  point, then its blocks, in the composition its content names (stack,
 *  split, split-end, center, statement). Without a headline, and on title
 *  and divider slides, the title is large, with any lead under it. Sizes
 *  come from the nearest size container (--u), so the same slide renders
 *  full-bleed, in a thumbnail and on a PDF page.
 *
 *  Live, the heading group is the page's first section and each block its
 *  own second section (`PageSection`, the page step's entrance): a block of
 *  glass cards fades each card on its own glass. Text that changes language
 *  goes through `HeadingText`, which erases and retypes it. `still` draws
 *  plain text for thumbnails and print: no entrance, no retype. */
export function SlideView({
  slide,
  lang,
  still = false,
}: {
  slide: Slide;
  lang: Lang;
  still?: boolean;
}) {
  const content = slideContent(slide.id);
  const { headline } = content;
  const big = !headline;
  const Section = still ? StillSection : PageSection;

  const title = big ? (
    still ? (
      <Text as="p" variant="display" tone="heading" className={styles.title}>
        {slide.title[lang]}
      </Text>
    ) : (
      <HeadingText
        wordings={slide.title[lang]}
        as="h1"
        variant="display"
        tone="heading"
        className={styles.title}
      />
    )
  ) : (
    <>
      <Text
        as={still ? "p" : "h1"}
        variant="label-l"
        tone="secondary"
        className={body.eyebrow}
      >
        {slide.title[lang]}
      </Text>
      <div>
        <BigLine headline={headline} lang={lang} still={still} />
      </div>
    </>
  );

  return (
    <div
      className={styles.slide}
      data-kind={slide.kind}
      data-layout={big ? undefined : (content.layout ?? "stack")}
      data-headline={big ? undefined : ""}
      data-deck-title={still ? undefined : ""}
      lang={lang}
    >
      <Section
        index={0}
        className={`${styles.titleBox} ${body.head}`}
      >
        {title}
      </Section>
      {content.blocks.length > 0 && (
        <div
          className={`${body.body} ${big ? body.centred : ""}`}
          data-slide-body=""
        >
          {content.blocks.map((block, i) => (
            <Section
              key={i}
              index={1}
              fade={holdsGlass(block) ? "glass" : "self"}
              className={body.block}
              data-block={block.type}
            >
              <BlockView block={block} lang={lang} still={still} />
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

/** The big line. With a `muted` part it is two-tone: that
 *  part in the secondary tone, the rest in the heading gradient, one block
 *  in one type. Live, each part is its own `HeadingText` run, so a change of
 *  language still erases and retypes it; still, plain spans. */
function BigLine({
  headline,
  lang,
  still,
}: {
  headline: Headline;
  lang: Lang;
  still: boolean;
}) {
  const text = say(headline.text, lang);
  const muted = headline.muted ? say(headline.muted, lang) : "";
  const at = muted ? text.indexOf(muted) : -1;
  if (at < 0)
    return still ? (
      <Text as="p" variant="display" tone="heading" className={body.headline}>
        {text}
      </Text>
    ) : (
      <HeadingText
        wordings={text}
        as="p"
        variant="display"
        tone="heading"
        className={body.headline}
      />
    );
  const runs = [
    { text: text.slice(0, at), muted: false },
    { text: muted, muted: true },
    { text: text.slice(at + muted.length), muted: false },
  ].filter((run) => run.text);
  return (
    <Text
      as="p"
      variant="display"
      tone="heading"
      className={body.headline}
      data-two-tone=""
    >
      {runs.map((run, i) =>
        still ? (
          run.muted ? (
            <span key={i} className={body.muted}>
              {run.text}
            </span>
          ) : (
            run.text
          )
        ) : (
          <HeadingText
            key={i}
            wordings={run.text}
            as="span"
            variant="display"
            tone={run.muted ? "secondary" : "heading"}
            className={body.run}
          />
        ),
      )}
    </Text>
  );
}

/** A still slide's section: a plain div, no entrance (`index` and `fade` are
 *  the live section's, unused here). */
function StillSection(
  props: React.ComponentProps<"div"> & {
    index: number;
    fade?: "self" | "glass";
  },
) {
  const { index, fade, ...rest } = props;
  void index;
  void fade;
  return <div {...rest} />;
}
