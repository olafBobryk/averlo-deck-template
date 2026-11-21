// The deck's languages, in order: the first is the default. To add a
// language, add its code here and its name to `langNames`, then its string
// to every `Text` (slides.ts and model.ts) and to the intro's `loading`
// (src/gate/Intro.tsx). With two or more, the menu shows the language
// switcher and links carry `?lang=` (contracts/deck-config.md).

export const langs = ["en"] as const;
export type Lang = (typeof langs)[number];

/** Each language's name, written in that language: the menu's language
 *  switcher and its PDF downloads show it. */
export const langNames: Record<Lang, string> = { en: "English" };
