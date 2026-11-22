import { langs, type Lang } from "@/deck/langs";
import type { Text } from "@/deck/model";

/** A text in one language, as plain words: the deck's `say`
 *  (src/deck/SlideBody.tsx), here so a preset does not import the block
 *  switch that imports the presets. */
export const say = (text: Text, lang: Lang) => text[lang].replaceAll("**", "");

/** A block's value with every `Text` in it as its string in one language
 *  (feature 003, T311): what a block hands its component
 *  (src/components/deck/), which takes plain strings. The string is the
 *  text as written, key-phrase marks (`**…**`) included: the component
 *  draws them bold in body text and drops them from labels, as the block
 *  did. */
export type Plain<T> = T extends Text
  ? string
  : T extends object
    ? { [K in keyof T]: Plain<T[K]> }
    : T;

const isText = (value: object): value is Text => {
  const keys = Object.keys(value);
  return (
    keys.length === langs.length &&
    langs.every(
      (lang) => typeof (value as Record<string, unknown>)[lang] === "string",
    )
  );
};

export function plain<T>(value: T, lang: Lang): Plain<T> {
  if (Array.isArray(value))
    return value.map((item) => plain(item, lang)) as Plain<T>;
  if (value && typeof value === "object") {
    if (isText(value)) return value[lang] as Plain<T>;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, plain(item, lang)]),
    ) as Plain<T>;
  }
  return value as Plain<T>;
}
