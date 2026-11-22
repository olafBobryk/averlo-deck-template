"use client";
// A slide's parts (feature 003, J2): what a slide file composes inside the
// deck's slide frame (src/deck/SlideView.tsx), with the frame's markup and
// entrance unchanged from the data slides it replaced. Live, the heading is
// the page's first section and each block its own second section
// (`PageSection`, the page step's entrance): a block of glass cards fades
// each card on its own glass. Text that changes language goes through
// `HeadingText`, which erases and retypes it. Still (thumbnails and print),
// each part is a plain element: no entrance, no retype.
//
//   <Title>          a title or divider slide's large title
//   <Heading>        a content slide's small title and its headline
//   <Aside>          a split slide's body text, in the heading's column
//   <Body>           the slide's blocks
//   <Block type>     one block: a component from `@/components/deck`
import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";
import { HeadingText } from "@/motion/page-header/heading-text";
import { PageSection } from "@/motion/route-transition";
import body from "@/deck/content.module.css";
import styles from "@/deck/deck.module.css";
import { Text } from "@/deck/text";
import { words } from "./words";

/** What the slide's frame tells its parts: `still` for thumbnails and
 *  print, and `big` for a slide without a layout, whose title is large and
 *  whose body is centred under it. */
export const SlideContext = createContext<{ still: boolean; big: boolean }>({
  still: false,
  big: false,
});
const useSlide = () => useContext(SlideContext);

/** The block types a slide's `Block` names, as `data-block`: the component
 *  it holds, in lower case. */
export type BlockType =
  | "lead"
  | "note"
  | "points"
  | "steps"
  | "facts"
  | "org"
  | "fork"
  | "week"
  | "plan"
  | "chart"
  | "stat"
  | "flow"
  | "timeline"
  | "cycle"
  | "orgchart"
  | "table"
  | "matrix"
  | "quote"
  | "agenda"
  | "compare"
  | "image"
  | "imageGrid"
  | "custom";

/** The blocks that hold glass cards: each card fades on its own glass,
 *  never through a fading wrapper. */
const glass = new Set<BlockType>([
  "facts",
  "org",
  "fork",
  "week",
  "plan",
  "points",
]);

type SectionProps = {
  index: number;
  fade?: "self" | "glass";
  className: string;
  children: ReactNode;
  "data-block"?: BlockType;
  "data-aside"?: "";
};

/** A still slide's section: a plain div, no entrance (`index` and `fade`
 *  are the live section's, unused here). */
function StillSection({ index, fade, ...rest }: SectionProps) {
  void index;
  void fade;
  return <div {...rest} />;
}

function Section(props: SectionProps) {
  const { still } = useSlide();
  const Part: ComponentType<SectionProps> = still ? StillSection : PageSection;
  return <Part {...props} />;
}

/** A title or divider slide's title, large. */
export function Title({ children }: { children: string }) {
  const { still } = useSlide();
  return (
    <Section index={0} className={`${styles.titleBox} ${body.head}`}>
      {still ? (
        <Text as="p" variant="display" tone="heading" className={styles.title}>
          {children}
        </Text>
      ) : (
        <HeadingText
          wordings={children}
          as="h1"
          variant="display"
          tone="heading"
          className={styles.title}
        />
      )}
    </Section>
  );
}

/** A content slide's heading: its title small (the h1, as the footer and
 *  menu name it) over its headline, which states its point. `muted`: the
 *  headline's obvious lead-in (or any one part of it), word for word as it
 *  stands in `headline`, set in the secondary tone. */
export function Heading({
  title,
  headline,
  muted,
}: {
  title: string;
  headline: string;
  muted?: string;
}) {
  const { still } = useSlide();
  return (
    <Section index={0} className={`${styles.titleBox} ${body.head}`}>
      <Text
        as={still ? "p" : "h1"}
        variant="label-l"
        tone="secondary"
        className={body.eyebrow}
      >
        {title}
      </Text>
      <div>
        <BigLine headline={headline} muted={muted} still={still} />
      </div>
    </Section>
  );
}

/** The headline. With a `muted` part it is two-tone: that part in the
 *  secondary tone, the rest in the heading gradient, one block in one type.
 *  Live, each part is its own `HeadingText` run, so a change of language
 *  still erases and retypes it; still, plain spans. */
function BigLine({
  headline,
  muted: mutedText,
  still,
}: {
  headline: string;
  muted?: string;
  still: boolean;
}) {
  const text = words(headline);
  const muted = mutedText ? words(mutedText) : "";
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

/** In a split or split-end slide, the body text that stands under the
 *  headline, in the heading's column, beside the blocks. */
export function Aside({
  type = "lead",
  children,
}: {
  type?: BlockType;
  children: ReactNode;
}) {
  return (
    <Section
      index={1}
      fade="self"
      className={`${body.block} ${body.aside}`}
      data-block={type}
      data-aside=""
    >
      {children}
    </Section>
  );
}

/** The slide's blocks, in its layout's body; centred under a large title. */
export function Body({ children }: { children: ReactNode }) {
  const { big } = useSlide();
  return (
    <div
      className={`${body.body} ${big ? body.centred : ""}`}
      data-slide-body=""
    >
      {children}
    </div>
  );
}

/** One block: the component it holds enters as the page's second section,
 *  and `type` names it (`data-block`). */
export function Block({
  type,
  children,
}: {
  type: BlockType;
  children: ReactNode;
}) {
  return (
    <Section
      index={1}
      fade={glass.has(type) ? "glass" : "self"}
      className={body.block}
      data-block={type}
    >
      {children}
    </Section>
  );
}
