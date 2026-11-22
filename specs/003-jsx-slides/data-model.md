# Data model: Slides as JSX

## Slide file (`src/slides/NN-name.tsx`)

- `export const meta: SlideMeta = { kind: "title" | "divider" | "slide" | "closing", section?: string (a key of copy), parent?: string (a key of copy), layout?: "stack" | "split" | "split-end" | "center" | "statement" }`.
- `export const copy = { en: { title: "…", …keys }, …other languages } satisfies Copy`. Every language has the same keys. Values are the owner's words and figures: strings, numbers, or arrays of them (a chart's values sit in `copy` too, so the trace check sees them).
- `export default function Slide({ t, lang }: SlideProps)`: free JSX composing `src/components/deck/*`, with every visible word from `t`.
- `id` comes from the file name without its number (`05-results.tsx` → `results`). The order comes from the number.

## Generated index (`src/slides/index.ts`)

- `slides: Slide[]`, in the engine's existing shape (id, kind, section, title), plus `Component`, per slide.

## Generated data (`src/slides/data.ts`)

- `slideData: SlideData[]`: each file's number, id, `meta` and `copy` as plain values, which plain Node and the tests read without the components (`src/deck/slides.ts`, the trace check). `scripts/slides-index.mjs` writes it with the index.

## Preset example (`src/presets/slides/name.tsx`)

- The same shape as a slide file, without a number, using placeholder words only.
- Its second example is `src/presets/slides/alternates/name.tsx`; the composed visual example is `src/presets/slides/composed/composed-visual.tsx`. The registry (`src/presets/registry.ts`) names each preset's `file`; the preset folder has its own generated `index.ts` and `data.ts`.

## Component limits (`src/components/deck/limits.ts`, T341)

- What a component's typed props cannot say, such as 1 to 4 stat cards or one value per category, each component's own and reported in development. They replace feature 002's validator (`src/presets/validate.ts`) and the block types it checked (`src/deck/content.ts`), both removed.

## Where the rules are checked (T340)

- Inline text: `scripts/check-inline-text.mjs`, run by `tests/tools/inline-text_test.mjs`.
- The trace: `tests/docs/workflow-trace.spec.ts` reads every slide file's `copy` (`tests/docs/trace.ts`), from `src/slides/data.ts` and from the dry run's slide files, `tests/fixtures/drafted-slides/`.
