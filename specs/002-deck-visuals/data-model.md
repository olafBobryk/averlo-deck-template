# Data model: Deck visuals

All new blocks extend `Block` in the carried `src/deck/content.ts` (compose rows). Every `Text` has every configured language. Numbers are plain numbers, never translated.

## Charts and stats

- `chart`: `{ kind: "bar" | "line" | "donut", categories: Text[], series: { name: Text, values: number[] }[], unit?: Text, source?: Text }`.
  - Validation: each series has one value per category.
  - A donut has one series.
  - At most 12 categories. More is raised with the owner, never dropped.
- `stat`: `{ items: { value: string, label: Text, unit?: Text, note?: Text }[] }` (1 to 4 items).
  - `value` is kept as the source writes it, e.g. "1.2M" or "38%".

## Diagrams

- `flow`: `{ steps: { label: Text, text?: Text }[] }`, 2 to 7 steps, in order.
- `timeline`: `{ events: { when: Text, label: Text, text?: Text }[] }`, 2 to 8 events, in date order.
- `cycle`: `{ stages: { label: Text, text?: Text }[] }`, 3 to 6 stages.
- `orgchart`: `{ root: Point, children: { node: Point, children?: Point[] }[] }`, two levels below the root at most.
- `table`: `{ columns: Text[], rows: { label: Text, cells: Text[] }[] }`, at most 5 columns and 8 rows.
- `matrix`: `{ x: Text, y: Text, quadrants: [Point, Point, Point, Point], items?: { label: Text, x: number, y: number }[] }`, with x and y from 0 to 1.

## Text layouts

- `quote`: `{ text: Text, by?: Text, role?: Text }`.
- `agenda`: `{ items: { label: Text, text?: Text }[] }`, 2 to 8 items.
- `compare`: `{ left: { title: Text, points: Text[] }, right: { title: Text, points: Text[] } }`.
- Statement: the existing `statement` layout with a `lead` block.
- Image + text: an `image` block in a `split` or `split-end` layout.

## Image slides

- `image`: `{ src?: string, alt: Text, caption?: Text, fit?: "cover" | "contain", bleed?: boolean }`.
  - `src` is a path under `public/images/`. Without it, the placeholder shows.
- `imageGrid`: `{ images: { src?: string, alt: Text, caption?: Text }[] }`, 2 to 6 images.

## Composed visuals

- `custom`: `{ visual: string, props: Record<string, unknown> }`.
  - `visual` names an export of the deck's `src/deck/visuals/index.ts`.
  - Its texts follow the `Text` rule.

## Preset registry (`src/presets/registry.ts`)

- `{ name, family: "charts" | "diagrams" | "text" | "images", block: Block["type"], fits: string (one line: the source structure it suits), example: Block, alternate: Block }`: `alternate` is a second, different example, used to check that a preset needs no polishing with new content (SC-005).
- One entry per preset. The gallery and the skill's reference are generated from it.

## Image licence

- A row in `docs/licences.md` for each file under `public/images/`.
- For a generated image, the source is the generator's name and the date, and the licence states the generator's terms as the owner gives them.
