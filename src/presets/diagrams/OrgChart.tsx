// The org chart preset (feature 002, T122): a root over the nodes that
// report to it, each over its own nodes, two levels below the root at most.
// Every node is an Averlo Panel card with its label and an optional line.
// Lines in the border token join them, as the deck's org block does (feature
// 001): a stem from the root to a bar, a stub from the bar to each node; a
// node's own nodes hang from a line down its left. Reporting lines carry no
// order, so they have no arrows. On a phone the nodes stack, each indented
// under the one it reports to.
import type { Lang } from "@/deck/langs";
import type { Point } from "@/deck/content";
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

/** The lines into a node from the one it reports to. */
function Lines() {
  return (
    <>
      <span
        className={styles.trunk}
        aria-hidden="true"
        data-line=""
        data-connector=""
      />
      <span
        className={styles.twig}
        aria-hidden="true"
        data-line=""
        data-connector=""
      />
    </>
  );
}

export function OrgChartPreset({ block, lang }: PresetProps<"orgchart">) {
  const n = block.children.length;
  return (
    <div className={styles.org} data-diagram="orgchart">
      <Node
        point={block.root}
        lang={lang}
        className={styles.orgRoot}
        data-org-root=""
      />
      <span
        className={styles.stem}
        aria-hidden="true"
        data-line=""
        data-connector=""
      />
      <ul
        className={styles.branches}
        data-count={n}
        style={{ ["--n" as string]: n }}
      >
        {block.children.map((child, i) => (
          <li key={i} className={styles.branch} data-org-branch="">
            <Lines />
            <Node
              point={child.node}
              lang={lang}
              className={styles.orgNode}
              data-org-node=""
            />
            {child.children && child.children.length > 0 && (
              <ul className={styles.leaves}>
                {child.children.map((leaf, j) => (
                  <li key={j} className={styles.leaf} data-org-leaf="">
                    <Lines />
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
