// The deck's languages, in order: the first is the default. Add a code here
// and its strings to every `Text` in slides.ts and model.ts to add a
// language.

export const langs = ["en"] as const;
export type Lang = (typeof langs)[number];
