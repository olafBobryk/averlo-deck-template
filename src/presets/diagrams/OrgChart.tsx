// The org chart preset (feature 002, T122): a root over the nodes that
// report to it, each over its own nodes, two levels below the root at most.
// Every node is an Averlo Panel card with its label and an optional line.
// Each parent's line splits downward to the nodes in a row below it, the
// outer ones curving left and right with rounded corners and a middle one
// going straight down (T123, the owner's review), in the border token: the
// deck's own branching (`.split`, src/deck/split.ts), as its org and fork
// blocks draw it. A node's own nodes split under it while they fit, and are
// listed down under it otherwise. Reporting lines carry no order, so they
// have no arrows. On a phone the nodes split across while two fit; more,
// and a node's own nodes, are listed down, each below its parent.
import type { Lang } from "@/deck/langs";
import type { Point } from "@/deck/content";
import deck from "@/deck/content.module.css";
import { phoneSplit, splitItem, splitList, type SplitMode } from "@/deck/split";
import { Text } from "@/deck/text";
import type { PresetProps } from "..";
import { say } from "../say";
import { Card } from "./parts";
import styles from "./diagrams.module.css";

function Node({
  point,
  lang,
  className,
  ...data
}: {
  point: Point;
  lang: Lang;
  className: string;
  [data: `data-${string}`]: string;
}) {
  return (
    <Card className={className} {...data}>
      <Text
        as="p"
        variant="title-l"
        tone="primary"
        className={styles.label}
        data-org-label=""
      >
        {say(point.label, lang)}
      </Text>
      {point.text && (
        <Text as="p" variant="body-m" tone="secondary" className={styles.text}>
          {say(point.text, lang)}
        </Text>
      )}
    </Card>
  );
}

/** On a slide, a node's own nodes split across under it while the chart
 *  is at most this many leaf columns wide (the nodes times the most nodes
 *  any of them has); wider, they are listed down under it. */
const ACROSS = 6;

export function OrgChartPreset({ block, lang }: PresetProps<"orgchart">) {
  const n = block.children.length;
  const most = Math.max(...block.children.map((c) => c.children?.length ?? 0));
  const leaves: SplitMode = n * most <= ACROSS ? "across" : "down";
  return (
    <div className={styles.org} data-diagram="orgchart">
      <Node
        point={block.root}
        lang={lang}
        className={styles.orgRoot}
        data-org-root=""
      />
      <ul className={deck.split} {...splitList(n, "across", phoneSplit(n))}>
        {block.children.map((child, i) => (
          <li
            key={i}
            className={`${deck.splitItem} ${styles.branch}`}
            data-org-branch=""
            {...splitItem(i, n)}
          >
            <Node
              point={child.node}
              lang={lang}
              className={styles.orgNode}
              data-org-node=""
            />
            {child.children && child.children.length > 0 && (
              <ul
                className={deck.split}
                {...splitList(child.children.length, leaves, "down")}
              >
                {child.children.map((leaf, j) => (
                  <li
                    key={j}
                    className={`${deck.splitItem} ${styles.leaf}`}
                    data-org-leaf=""
                    {...splitItem(j, child.children!.length)}
                  >
                    <Node point={leaf} lang={lang} className={styles.orgLeaf} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
