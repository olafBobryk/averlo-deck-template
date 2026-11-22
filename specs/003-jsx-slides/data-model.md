# Data model: Slides as JSX

## Slide file (`src/slides/NN-name.tsx`)

- `export const meta: SlideMeta = { kind: "title" | "divider" | "slide" | "closing", section?: string (a key of copy), parent?: string (a key of copy), layout?: "stack" | "split" | "split-end" | "center" | "statement" }`.
- `export const copy = { en: { title: "…", …keys }, …other languages } satisfies Copy`. Every language has the same keys. Values are the owner's words and figures: strings, numbers, or arrays of them (a chart's values sit in `copy` too, so the trace check sees them).
- `export default function Slide({ t, lang }: SlideProps)`: free JSX composing `src/components/deck/*`, with every visible word from `t`.
- `id` comes from the file name without its number (`05-results.tsx` → `results`). The order comes from the number.

## Generated index (`src/slides/index.ts`)

- `slides: Slide[]`, in the engine's existing shape (id, kind, section, title), plus `Component`, per slide.

## Preset example (`src/presets/slides/name.tsx`)

- The same shape as a slide file, without a number, using placeholder words only.
