// The presets' showcase in the template's placeholder deck (feature 002,
// "Session 2026-11-22 (owner, after the final build)": "Put them in the
// demo"): a divider "Presets", then one slide per registry preset, in the
// registry's order, with its example in the layout its entry names (stack by
// default), after a short body text (`presetBlocks`; T051). Built from the
// registry, so it stays in step with it; the
// gallery at /gallery stays the full reference, with each alternate. Its
// section and titles are the preset names, as the gallery's are; everything
// on a slide is the registry's placeholder content. src/deck/slides.ts
// imports it, so it imports the registry and the languages, and types only.
import type { SlideContent } from "../deck/content";
import { langs } from "../deck/langs";
import type { Slide, Text } from "../deck/model";
import { presetBlocks, registry, type PresetEntry } from "./registry";

/** The same words in every language. */
const words = (value: string) =>
  Object.fromEntries(langs.map((lang) => [lang, value])) as Text;

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The showcase's slides and their content, for a list of presets (the
 *  registry's, by default). Its ids start `showcase`, apart from the
 *  gallery's. */
export function showcase(entries: PresetEntry[] = registry): {
  slides: Slide[];
  content: Record<string, SlideContent>;
} {
  const section = words("Presets");
  const slides: Slide[] = [
    { id: "showcase", kind: "divider", section, title: section },
  ];
  const content: Record<string, SlideContent> = { showcase: { blocks: [] } };
  for (const entry of entries) {
    const id = `showcase-${slug(entry.name)}`;
    slides.push({ id, kind: "slide", section, title: words(entry.name) });
    content[id] = {
      headline: { text: words("Placeholder text") },
      layout: entry.layout ?? "stack",
      blocks: presetBlocks(entry, entry.example),
    };
  }
  return { slides, content };
}
