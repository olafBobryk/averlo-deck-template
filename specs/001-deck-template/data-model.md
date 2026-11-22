# Data model: Averlo deck template

## Slide (types in carried `src/deck/model.ts`; data in template-owned `src/deck/slides.ts`)

- `id`: string, unique and stable. The URL's `?s=` holds the slide's position, not its id, as in the origin.
- `kind`: `title` | `divider` | `slide` | `closing`.
- `section?`, `parent?`, `title`: `Text` (one string per configured language).
- Content lives in a separate map keyed by slide id, read through the carried `slideContent(id)` (types in carried `src/deck/content.ts`): `{ headline?, blocks: Block[], layout?: "stack" | "split" | "split-end" | "center" | "statement" | "module", notes? }`.
- In a `split` or `split-end` layout, a plain `lead` that comes first, before another block, is the slide's body text: it is drawn under the headline, in the heading's column, beside the visual (T051). The preset slides of the showcase and the gallery each carry such a body text (`presetBlocks` in `src/presets/registry.ts`).
- `Block`, the generic types kept from the origin:
  - `lead`, `note`
  - `points` (2 to 5 columns; cards, numbered or chips)
  - `steps` (rail or across; `nodes`, the old name, draws across)
  - `facts`
  - `org`
  - `fork`, `week`
  - `plan` (a YYYY-MM axis)
- Validation: every `Text` has every configured language. The template ships placeholder text only (FR-002).
- Before its closing slide, the placeholder deck shows every preset (feature 002): a divider "Presets" and one slide per registry preset with its example, built by `showcase()` in `src/presets/showcase.ts`. Their section and titles are the preset names; the rest is the registry's placeholder content.

## Languages (`langs` and `Lang`, in template-owned `src/deck/langs.ts`)

- `langs`: an ordered list of codes; the first is the default. `["en"]` by default. With two or more, the language switcher shows.

## Deck configuration (`src/brand/config.ts`)

- `brand`: `{ kind: "averlo" }` | `{ kind: "owner", name, logo?, mark? }` (asset paths under `public/brand/`). With `owner` and no `mark`, the "your logo" placeholder shows. The mark also draws the app icons.
- `deckTitle`: shown in the top bar, the browser tab and the home-screen app's name, and used in the PDF file name.
- `accent`: the top bar's accent colour, default `#ff3200`. Its hover and active shades are derived the way the questionnaire derives them. It must keep 4.5:1 text contrast.

## Port record (`docs/design-source.md`, written by `scripts/port-averlo.mjs` from `scripts/ports.manifest.json`)

- `source repository`, `commit`, `source path`, `target path`, plus the npm packages recorded with their lockfile versions.
- Validation: the drift test compares each target with `source@commit:path` byte for byte.

## Carried-file record (`docs/carried/<area>.md`: `app`, `deck`, `gate`, `boot`, `motion`, `tests`)

- `file` (target path) and `changes`: a list of `{ kind: rename | detach | compose | redact, what, why }`. Rename rows say "product identifier → deck" and never name the product. Redact rows give the line and "comment reworded" or "comment removed", never the original text.
- One file per area, so phases that run in parallel never write the same record.

## Motion baseline (`specs/001-deck-template/references/strips/*.json`)

- `strip`, `viewport`, `runs` (3), `frames` [{ t ms, values }], `tolerance` per value, `recorded` (date). Numbers and generic names only. The values are defined in research R8.

## Licence entry (`docs/licences.md`)

- `file, package or port`, `source`, `licence`, `redistributable` (yes/no). A missing entry, or a `no`, fails the public scan.
- Licence value `brand asset (not under MIT)` with `redistributable: yes (placeholder in this repo)`: the Averlo name, the Averlo `Logo` port and the questionnaire's logo mark. The scan accepts it.
- One row covers `specs/*/references/screens/`: own work, MIT, screenshots of template builds only.
