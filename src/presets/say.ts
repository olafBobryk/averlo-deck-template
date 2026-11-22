import type { Lang } from "@/deck/langs";
import type { Text } from "@/deck/model";

/** A text in one language, as plain words: the deck's `say`
 *  (src/deck/SlideBody.tsx), here so a preset does not import the block
 *  switch that imports the presets. */
export const say = (text: Text, lang: Lang) => text[lang].replaceAll("**", "");
