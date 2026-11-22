import {
  Facts,
  Fork,
  Lead,
  Note,
  Org,
  Plan,
  Points,
  Steps,
  Week,
} from "@/components/deck";
import { PresetView } from "@/presets";
import { plain } from "@/presets/say";
import { stepsStyle, type Block } from "./content";
import type { Lang } from "./langs";
import type { Text } from "./model";

/** A text in one language. */
const typeset = (text: Text, lang: Lang) => text[lang];

/** Key phrases in body text are marked `**…**`. */
const KEY = "**";

/** A text in one language, as plain words: key-phrase markup dropped, so
 *  labels, tips, alt text, keys and every comparison read the words alone. */
export const say = (text: Text, lang: Lang) =>
  typeset(text, lang).replaceAll(KEY, "");

/** A block that holds glass cards fades each card on its own glass, never
 *  through a fading wrapper. */
export const holdsGlass = (block: Block) =>
  block.type === "facts" ||
  block.type === "org" ||
  block.type === "fork" ||
  block.type === "week" ||
  block.type === "plan" ||
  block.type === "points";

/** A block, drawn by its component (src/components/deck/, feature 003),
 *  its words in this language as written (`plain`): the component draws
 *  key phrases bold in body text and drops their marks from labels. */
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
      return <Lead size={block.size}>{typeset(block.item.text, lang)}</Lead>;
    case "note":
      return <Note>{typeset(block.item.text, lang)}</Note>;
    case "points":
      return (
        <Points
          items={plain(block.items, lang)}
          columns={block.columns}
          style={block.style}
        />
      );
    case "steps":
      return (
        <Steps
          items={plain(block.items, lang)}
          style={stepsStyle(block.style)}
        />
      );
    case "facts":
      return <Facts items={plain(block.items, lang)} />;
    case "org":
      return (
        <Org root={plain(block.root, lang)} items={plain(block.items, lang)} />
      );
    case "fork":
      return (
        <Fork root={plain(block.root, lang)} items={plain(block.items, lang)} />
      );
    case "week":
      return (
        <Week days={plain(block.days, lang)} items={plain(block.items, lang)} />
      );
    case "plan":
      return (
        <Plan
          start={block.start}
          end={block.end}
          items={plain(block.items, lang)}
        />
      );
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
