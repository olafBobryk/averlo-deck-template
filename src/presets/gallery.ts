// The preset gallery's slides (feature 002, FR-004; feature 003, T331): a
// title slide, a divider for each family that has presets, then for each
// preset its example file and its second example
// (src/presets/slides/<file>.tsx and alternates/<file>.tsx), and last a
// divider and the composed visual example (src/presets/slides/composed/),
// which is not a preset. The /gallery route and the print view's
// `?deck=gallery` draw them through the deck engine (GalleryDeck.tsx gives
// each slide its file's component). Each file's slide takes its title from
// the file's words and its section from its family. Plain Node imports
// this module (the tests do): it reads the files' data, not their
// components.
import { langs } from "@/deck/langs";
import type { Slide, Text } from "@/deck/model";
import { presetData } from "./slides/data";
import { families, registry, type Family, type PresetEntry } from "./registry";

/** The same words in every language. */
const words = (value: string) =>
  Object.fromEntries(langs.map((lang) => [lang, value])) as Text;

/** The families' names, as contracts/presets.md gives them. */
export const familyNames: Record<Family, string> = {
  charts: "Charts and stats",
  diagrams: "Diagrams",
  text: "Text layouts",
  images: "Image slides",
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const exampleId = (name: string) => `preset-${slug(name)}`;
const alternateId = (name: string) => `preset-${slug(name)}-alternate`;

/** The composed visual examples: not presets, so not in the registry; each
 *  is a file in src/presets/slides/composed/. */
export const composedExamples: { name: string; file: string }[] = [
  { name: "Composed visual (example)", file: "composed/composed-visual" },
];

export type Gallery = {
  slides: Slide[];
  /** Each slide's file in src/presets/slides/ (without `.tsx`), by slide
   *  id; the title and the dividers have none. */
  files: Record<string, string>;
  /** A preset's two slides, by its registry name. */
  presetSlides: (name: string) => { example?: Slide; alternate?: Slide };
};

/** A file's title, in every language. */
function titleOf(file: string): Text {
  const data = presetData.find((entry) => entry.id === file);
  if (!data) throw new Error(`src/presets/slides/${file}.tsx: no such file`);
  return Object.fromEntries(
    langs.map((lang) => [lang, data.copy[lang].title]),
  ) as Text;
}

/** The gallery for a list of presets (the registry's, by default). */
export function buildGallery(
  entries: PresetEntry[] = registry,
  composed = composedExamples,
): Gallery {
  const slides: Slide[] = [
    { id: "gallery-title", kind: "title", title: words("Preset gallery") },
  ];
  const files: Record<string, string> = {};
  for (const family of families) {
    const members = entries.filter((entry) => entry.family === family);
    if (!members.length) continue;
    const section = words(familyNames[family]);
    slides.push({
      id: `family-${family}`,
      kind: "divider",
      section,
      title: section,
    });
    for (const entry of members)
      for (const [id, file] of [
        [exampleId(entry.name), entry.file],
        [alternateId(entry.name), `alternates/${entry.file}`],
      ]) {
        slides.push({ id, kind: "slide", section, title: titleOf(file) });
        files[id] = file;
      }
  }
  if (composed.length) {
    const section = words("Composed visuals");
    slides.push({ id: "composed", kind: "divider", section, title: section });
    for (const { name, file } of composed) {
      const id = slug(name);
      slides.push({ id, kind: "slide", section, title: titleOf(file) });
      files[id] = file;
    }
  }
  const byId = (id: string) => slides.find((slide) => slide.id === id);
  return {
    slides,
    files,
    presetSlides: (name) => ({
      example: byId(exampleId(name)),
      alternate: byId(alternateId(name)),
    }),
  };
}

/** The template's gallery. */
export const gallery = buildGallery();
