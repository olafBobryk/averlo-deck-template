import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { Panel } from "@/components/ui/primitives/Panel";
import { Text as Type } from "./text";
import type { HTMLAttributes, ReactNode } from "react";
import { type Block, type Mark } from "./content";
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
  as: "li" | "div" | "dl";
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
  (block.type === "points" && (block.style ?? "cards") !== "numbered");

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
      const surface: Surface | undefined =
        style === "cards" ? "card" : style === "chips" ? "pill" : undefined;
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
              {style === "numbered" && (
                <span className={styles.numeral} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              {style !== "numbered" && <Glyph name={p.icon} />}
              <Label text={p.label} lang={lang} />
              <Body text={p.text} lang={lang} />
            </Card>
          ))}
        </ol>
      );
    }
    case "steps":
      return (
        <ol
          className={styles.steps}
          data-count={block.items.length}
          data-style={block.style ?? "rail"}
        >
          {block.items.map((s, i) => (
            <li key={s.label.en} className={styles.step}>
              {block.style === "nodes" ? (
                <span className={styles.nodeRow} aria-hidden="true">
                  <span
                    className={styles.node}
                    data-status={s.status ?? "upcoming"}
                  >
                    {i + 1}
                  </span>
                  {i < block.items.length - 1 && (
                    <span className={styles.link} />
                  )}
                </span>
              ) : (
                <>
                  {s.when && (
                    <Type
                      as="p"
                      variant="label-m"
                      tone="secondary"
                      className={styles.when}
                    >
                      {say(s.when, lang)}
                    </Type>
                  )}
                  <span
                    className={styles.rail}
                    data-status={s.status ?? "upcoming"}
                  />
                </>
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
          ))}
        </ol>
      );
    case "facts":
      return (
        <Card as="dl" surface="card" className={styles.facts}>
          {block.items.map((f) => (
            <div key={f.label.en} className={styles.fact}>
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
                variant="body-l"
                tone="primary"
                className={styles.factText}
              >
                {rich(f.text!, lang)}
              </Type>
            </div>
          ))}
        </Card>
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
          <ul className={styles.branches}>
            {/* The item holds the connector; the glass card sits inside it,
                so neither's pseudo-elements meet. */}
            {block.items.map((p) => (
              <li key={p.label.en} className={styles.branch}>
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
        <ol className={styles.week}>
          {block.days.map((day) => {
            const item = block.items.find((d) => d.day.en === day.en);
            return (
              <Card
                as="li"
                key={day.en}
                surface={item ? "card" : undefined}
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
              </Card>
            );
          })}
        </ol>
      );
    case "plan":
      return <Plan block={block} lang={lang} />;
  }
}

/** The plan's time axis: dated marks at their month, an undated span as a
 *  band across its months, in order, with no dates of its own. */
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
  return (
    <div className={styles.plan}>
      <div className={styles.axis} aria-hidden="true" />
      <ol className={styles.marks}>
        {dated.map((m, i) => (
          <li
            key={m.label.en}
            className={styles.mark}
            style={{ ["--at" as string]: `${at(m.at)}%` }}
            data-status={m.status ?? "upcoming"}
            data-side={m.at === block.end || i % 2 === 0 ? "above" : "below"}
            data-edge={
              m.at === block.start
                ? "start"
                : m.at === block.end
                  ? "end"
                  : undefined
            }
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
      {spans.map((m) => (
        <div
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
        </div>
      ))}
    </div>
  );
}
