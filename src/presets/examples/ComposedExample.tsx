// The template's one composed visual (feature 002, T143; research D3): an
// example of what the deck-visuals skill builds when no preset fits, here a
// funnel of stages, each narrower than the one above. It is built only from
// Averlo parts: the ported `Panel` for each stage and Averlo `Text` (through
// `@/deck/text`), on the deck's tokens. It is drawn only in the preset
// gallery, as "Composed visual (example)", through the gallery's own
// visuals (src/presets/GalleryDeck.tsx); the deck's map,
// src/deck/visuals/index.ts, stays empty. A deck's own visual takes the same
// props shape: `DeckVisualProps`.
import { Panel } from "@/components/ui/primitives/Panel";
import type { DeckVisualProps } from "@/deck/visuals";
import type { Text as Words } from "@/deck/model";
import { Text } from "@/deck/text";
import { say } from "../say";
import styles from "./examples.module.css";

/** Its props: the funnel's stages, widest first. */
export type ComposedExampleProps = { stages: Words[] };

export function ComposedExample({ props, lang }: DeckVisualProps) {
  const { stages } = props as ComposedExampleProps;
  const n = stages.length;
  return (
    <ol className={styles.funnel} data-composed-example="">
      {stages.map((stage, i) => (
        <li
          key={i}
          className={styles.stage}
          // Each stage narrower than the one above, by an equal step.
          style={{
            ["--width" as string]: `${100 - (i * 40) / Math.max(1, n - 1)}%`,
          }}
        >
          <Panel
            as="div"
            background="surface"
            padding="none"
            gap="none"
            className={styles.card}
          >
            <Text
              as="p"
              variant="title-l"
              tone="primary"
              className={styles.label}
            >
              {say(stage, lang)}
            </Text>
          </Panel>
        </li>
      ))}
    </ol>
  );
}
