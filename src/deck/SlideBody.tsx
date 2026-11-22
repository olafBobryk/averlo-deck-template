import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { Panel } from "@/components/ui/primitives/Panel";
import { Text as Type } from "./text";
import { PresetView } from "@/presets";
import type { HTMLAttributes, ReactNode } from "react";
import { stepsStyle, type Block, type Mark } from "./content";
import { phoneSplit, splitItem, splitList } from "./split";
import type { Lang } from "./langs";
import type { Text } from "./model";
import styles from "./content.module.css";

/** A text in one language. */
const typeset = (text: Text, lang: Lang) => text[lang];

/** Key phrases in body text are marked `**…**`. */
const KEY = "**";

/** A text in one language, as plain words: key-phrase markup dropped, so
 *  labels, tips, alt text, keys and every comparison read the words alone. */
export const say = (text: Text, lang: Lang) =>
  typeset(text, lang).replaceAll(KEY, "");

/** Body text with its key phrases in bold: the same words as `say`,
 *  each `**…**` run a `<strong>`; text without markup stays one string, so
 *  a slide without it renders as before. */
export function rich(text: Text, lang: Lang): ReactNode {
  const runs = typeset(text, lang).split(KEY);
  if (runs.length === 1) return runs[0];
  return runs.map((run, i) =>
    i % 2 ? (
      <strong key={i} className={styles.key}>
        {run}
      </strong>
    ) : (
      run
    ),
  );
}

/** A card is the Averlo Panel; a pill is one rounded fully, as wide as its
 *  content. Each keeps a backdrop blur, so the carried fades (`holdsGlass`,
 *  route-transition's `fade="glass"`) still find each card on its own glass.
 *  Without a surface, the plain element. */
type Surface = "card" | "pill";
function Card({
  as,
  surface,
  className,
  children,
  ...rest
}: {
  as: "li" | "div" | "dl" | "ol";
  surface?: Surface;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  if (!surface) {
    const Tag = as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }
  return (
    <Panel
      as={as}
      background="surface"
      padding="none"
      gap="none"
      className={[
        "backdrop-blur-lg",
        surface === "pill" && "!w-auto rounded-pill",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Panel>
  );
}

/** A block that holds glass cards fades each card on its own glass, never
 *  through a fading wrapper. */
export const holdsGlass = (block: Block) =>
  block.type === "facts" ||
  block.type === "org" ||
  block.type === "fork" ||
  block.type === "week" ||
  block.type === "plan" ||
  block.type === "points";

/** Months from `from` to `to` (YYYY-MM), for the plan's axis. */
const months = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};
const monthName = (at: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${at}-01T12:00:00`));

/** A glyph from the icon set, sized with the slide (--u). */
function Glyph({ name }: { name?: IconName }) {
  if (!name) return null;
  return (
    <span className={styles.glyph}>
      <Icon name={name} className="size-[var(--icon-slot-size)]" />
    </span>
  );
}

/** A number as the muted step label (the navigator's, `.when`): 01, 02, …
 *  It leads a numbered point or a step without a `when`. Hidden from
 *  assistive technology: the ordered list numbers its items. */
const number = (i: number) => String(i + 1).padStart(2, "0");
function StepNumber({ i }: { i: number }) {
  return (
    <Type
      as="p"
      variant="label-m"
      tone="secondary"
      className={styles.when}
      data-step-label=""
      aria-hidden="true"
    >
      {number(i)}
    </Type>
  );
}

function Label({ text, lang }: { text: Text; lang: Lang }) {
  return (
    <Type as="p" variant="title-l" className={styles.pointLabel}>
      {say(text, lang)}
    </Type>
  );
}
function Body({ text, lang }: { text?: Text; lang: Lang }) {
  if (!text) return null;
  return (
    <Type as="p" variant="body-m" tone="secondary" className={styles.pointText}>
      {rich(text, lang)}
    </Type>
  );
}

export function BlockView({
  block,
  lang,
  still,
}: {
  block: Block;
  lang: Lang;
  still?: boolean;
}) {
  switch (block.type) {
    case "lead":
      return (
        <Type
          as="p"
          variant="body-xl"
          tone="secondary"
          className={styles.lead}
          data-size={block.size}
        >
          {rich(block.item.text, lang)}
        </Type>
      );
    case "note":
      return (
        <Type as="p" variant="body-l" tone="primary" className={styles.note}>
          {rich(block.item.text, lang)}
        </Type>
      );
    case "points": {
      const style = block.style ?? "cards";
      const surface: Surface = style === "chips" ? "pill" : "card";
      return (
        <ol
          className={styles.points}
          data-cols={block.columns ?? 3}
          data-style={style}
        >
          {block.items.map((p, i) => (
            <Card
              as="li"
              key={p.label.en}
              surface={surface}
              className={styles.point}
            >
              {style === "numbered" && <StepNumber i={i} />}
              {style !== "numbered" && <Glyph name={p.icon} />}
              <Label text={p.label} lang={lang} />
              <Body text={p.text} lang={lang} />
            </Card>
          ))}
        </ol>
      );
    }
    case "steps": {
      // Each step: its dot on the line, then, in one column, its label (its
      // `when`, or its number), its title and its body.
      const style = stepsStyle(block.style);
      return (
        <ol
          className={styles.steps}
          data-count={block.items.length}
          data-style={style}
          style={{ ["--n" as string]: block.items.length }}
        >
          {block.items.map((s, i) => {
            const status = s.status ?? "upcoming";
            return (
              <li key={s.label.en} className={styles.step} data-status={status}>
                <span className={styles.track} aria-hidden="true">
                  {i < block.items.length - 1 || style === "across" ? (
                    <span className={styles.line} data-step-line="" />
                  ) : null}
                  <span
                    className={styles.stepDot}
                    data-step-dot=""
                    data-status={status}
                  />
                </span>
                {s.when ? (
                  <Type
                    as="p"
                    variant="label-m"
                    tone="secondary"
                    className={styles.when}
                    data-step-label=""
                  >
                    {say(s.when, lang)}
                  </Type>
                ) : (
                  <StepNumber i={i} />
                )}
                <Type as="p" variant="title-l" className={styles.stepLabel}>
                  {say(s.label, lang)}
                </Type>
                {s.text && (
                  <Type
                    as="p"
                    variant="body-m"
                    tone="secondary"
                    className={styles.stepText}
                  >
                    {rich(s.text, lang)}
                  </Type>
                )}
              </li>
            );
          })}
        </ol>
      );
    }
    case "facts":
      return (
        <dl
          className={styles.facts}
          data-cols={Math.min(block.items.length, 4)}
        >
          {block.items.map((f) => (
            <Card
              as="div"
              surface="card"
              key={f.label.en}
              className={styles.fact}
            >
              <Type
                as="dt"
                variant="label-l"
                tone="secondary"
                className={styles.factLabel}
              >
                {say(f.label, lang)}
              </Type>
              <Type
                as="dd"
                variant="title-l"
                tone="primary"
                className={styles.factText}
              >
                {rich(f.text!, lang)}
              </Type>
            </Card>
          ))}
        </dl>
      );
    case "org":
    case "fork":
      return (
        <div className={styles[block.type]}>
          <Card as="div" surface="card" className={styles.root}>
            <Glyph name={block.root.icon} />
            <Label text={block.root.label} lang={lang} />
            <Body text={block.root.text} lang={lang} />
          </Card>
          <ul
            className={`${styles.branches} ${styles.split}`}
            {...splitList(
              block.items.length,
              "across",
              phoneSplit(block.items.length),
            )}
          >
            {/* The item draws its share of the branching line; the glass
                card sits inside it, so neither's pseudo-elements meet. */}
            {block.items.map((p, i) => (
              <li
                key={p.label.en}
                className={`${styles.branch} ${styles.splitItem}`}
                {...splitItem(i, block.items.length)}
              >
                <Card as="div" surface="card" className={styles.branchCard}>
                  <Glyph name={p.icon} />
                  <Label text={p.label} lang={lang} />
                  <Body text={p.text} lang={lang} />
                </Card>
              </li>
            ))}
          </ul>
        </div>
      );
    case "week":
      return (
        <Card
          as="ol"
          surface="card"
          className={styles.week}
          style={{ ["--days" as string]: block.days.length }}
        >
          {block.days.map((day) => {
            const item = block.items.find((d) => d.day.en === day.en);
            return (
              <li
                key={day.en}
                className={styles.day}
                data-empty={item ? undefined : ""}
              >
                <Type
                  as="p"
                  variant="label-m"
                  tone="secondary"
                  className={styles.when}
                >
                  {say(day, lang)}
                </Type>
                {item && (
                  <>
                    <Glyph name={item.icon} />
                    <Label text={item.label} lang={lang} />
                    <Body text={item.text} lang={lang} />
                  </>
                )}
              </li>
            );
          })}
        </Card>
      );
    case "plan":
      return <Plan block={block} lang={lang} />;
    // The preset visuals (feature 002): drawn by src/presets/.
    case "chart":
    case "stat":
    case "flow":
    case "timeline":
    case "cycle":
    case "orgchart":
    case "table":
    case "matrix":
    case "quote":
    case "agenda":
    case "compare":
    case "image":
    case "imageGrid":
    case "custom":
      return <PresetView block={block} lang={lang} still={still} />;
  }
}

/** The plan's time axis, on one card: dated marks at their month, above
 *  and below the axis in turn, each with its dot on the axis; an undated
 *  span as a bar under the axis across its months, in order, with no dates
 *  of its own. */
function Plan({
  block,
  lang,
}: {
  block: Extract<Block, { type: "plan" }>;
  lang: Lang;
}) {
  const total = months(block.start, block.end);
  const at = (m: string) => (months(block.start, m) / total) * 100;
  const dated = block.items.filter((m): m is Mark & { at: string } =>
    Boolean(m.at),
  );
  const spans = block.items.filter((m) => m.span);
  const edge = (m: Mark & { at: string }) =>
    m.at === block.start ? "start" : m.at === block.end ? "end" : undefined;
  const side = (m: Mark & { at: string }, i: number) =>
    m.at === block.end || i % 2 === 0 ? "above" : "below";
  return (
    <Card as="div" surface="card" className={styles.plan}>
      <ol className={styles.marks}>
        {dated.map((m, i) => (
          <li
            key={m.label.en}
            className={styles.mark}
            style={{ ["--at" as string]: `${at(m.at)}%` }}
            data-status={m.status ?? "upcoming"}
            data-side={side(m, i)}
            data-edge={edge(m)}
          >
            <Type
              as="p"
              variant="label-m"
              tone="secondary"
              className={styles.when}
            >
              {monthName(m.at)}
            </Type>
            <Type as="p" variant="title-l" className={styles.stepLabel}>
              {say(m.label, lang)}
            </Type>
          </li>
        ))}
      </ol>
      <div className={styles.axis} aria-hidden="true">
        {dated.map((m) => (
          <span
            key={m.label.en}
            className={styles.dot}
            style={{ ["--at" as string]: `${at(m.at)}%` }}
            data-status={m.status ?? "upcoming"}
          />
        ))}
      </div>
      {spans.length > 0 && (
        <ol className={styles.spans}>
          {spans.map((m) => (
            <li
              key={m.label.en}
              className={styles.span}
              style={{
                ["--from" as string]: `${at(m.span![0])}%`,
                ["--to" as string]: `${at(m.span![1])}%`,
              }}
            >
              <Type
                as="p"
                variant="label-l"
                tone="secondary"
                className={styles.spanLabel}
              >
                {say(m.label, lang)}
              </Type>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
