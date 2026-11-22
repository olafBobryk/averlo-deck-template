// The preset gallery's slides (feature 002, FR-004), built from the
// registry: a title slide, a divider for each family that has presets, then
// for each preset a slide with its example and a slide with its alternate
// (SC-005). The /gallery route and the print view's `?deck=gallery` draw
// them through the deck engine. Slide titles name the gallery, its families
// and its presets; everything on a slide is placeholder text and the
// registry's placeholder examples.
import type { SlideContent } from "@/deck/content";
import { langs } from "@/deck/langs";
import type { Slide, Text } from "@/deck/model";
import { families, registry, type Family, type PresetEntry } from "./registry";

/** The same words in every language. */
const words = (value: string) =>
  Object.fromEntries(langs.map((lang) => [lang, value])) as Text;

const placeholder = words("Placeholder text");

/** The families' names, as contracts/presets.md gives them. */
const familyNames: Record<Family, string> = {
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

export type Gallery = {
  slides: Slide[];
  content: Record<string, SlideContent>;
  /** A preset's two slides, by its registry name. */
  presetSlides: (name: string) => { example?: Slide; alternate?: Slide };
};

/** The gallery for a list of presets (the registry's, by default). */
export function buildGallery(entries: PresetEntry[] = registry): Gallery {
  const slides: Slide[] = [
    { id: "gallery-title", kind: "title", title: words("Preset gallery") },
  ];
  const content: Record<string, SlideContent> = {
    "gallery-title": { blocks: [] },
  };
  for (const family of families) {
    const members = entries.filter((entry) => entry.family === family);
    if (!members.length) continue;
    const section = words(familyNames[family]);
    const divider = `family-${family}`;
    slides.push({ id: divider, kind: "divider", section, title: section });
    content[divider] = { blocks: [] };
    for (const entry of members) {
      const shown = [
        { id: exampleId(entry.name), title: entry.name, block: entry.example },
        {
          id: alternateId(entry.name),
          title: `${entry.name}, alternate`,
          block: entry.alternate,
        },
      ];
      for (const { id, title, block } of shown) {
        slides.push({ id, kind: "slide", section, title: words(title) });
        content[id] = {
          headline: { text: placeholder },
          layout: "stack",
          blocks: [block],
        };
      }
    }
  }
  const byId = (id: string) => slides.find((slide) => slide.id === id);
  return {
    slides,
    content,
    presetSlides: (name) => ({
      example: byId(exampleId(name)),
      alternate: byId(alternateId(name)),
    }),
  };
}

/** The template's gallery. */
export const gallery = buildGallery();
