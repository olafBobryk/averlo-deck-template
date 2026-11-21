# Data model: Averlo deck template

## Slide (`src/deck/slides.ts`)

- `id`: string, unique and stable. The URL's `?s=` holds the slide's position, not its id, as in the origin.
- `kind`: `title` | `divider` | `slide` | `closing`.
- `section?`, `parent?`, `title`: `Text` (one string per configured language).
- `content`: `{ headline?, blocks: Block[], layout?: "stack" | "split" | "split-end" | "center" | "statement" | "module", notes? }`.
- `Block`, the generic types kept from the origin:
  - `lead`, `note`
  - `points` (2 to 5 columns; cards, numbered or chips)
  - `steps` (rail or nodes)
  - `facts`
  - `org` (tree or ledger)
  - `fork`, `week`
  - `plan` (a YYYY-MM axis)
- Validation: every `Text` has every configured language. The template ships placeholder text only (FR-002).

## Languages (`src/deck/slides.ts`)

- `languages`: an ordered list of codes; the first is the default. `["en"]` by default. With two or more, the language switcher shows.

## Deck configuration (`src/brand/config.ts`)

- `brand`: `{ kind: "averlo" }` | `{ kind: "owner", name, logo?, mark? }` (asset paths under `public/brand/`). With `owner` and no `mark`, the "your logo" placeholder shows.
- `deckTitle`: shown in the top bar and used in the PDF file name.
- `accent`: the top bar's accent colour, default `#ff3200`. Its hover and active shades are derived the way the questionnaire derives them. It must keep 4.5:1 text contrast.

## Port record (`docs/design-source.md`, written by `scripts/port-averlo.mjs` from `scripts/ports.manifest.json`)

- `source repository`, `commit`, `source path`, `target path`, plus the npm packages recorded with their lockfile versions.
- Validation: the drift test compares each target with `source@commit:path` byte for byte.

## Carried-file record (`docs/carried/<area>.md`: `app`, `deck`, `gate`, `boot`, `motion`, `tests`)

- `file` (target path) and `changes`: a list of `{ kind: rename | detach | compose | redact, what, why }`. Rename rows say "product identifier → deck" and never name the product. Redact rows give the line and "comment reworded" or "comment removed", never the original text.
- One file per area, so phases that run in parallel never write the same record.

## Open question (`docs/decisions/open-questions/<phase>-<slug>.md`)

- `question`, `context`, `options` with a recommendation, `blocks` (the task and phase). One file per question, so parallel phases never write the same file. When the owner answers, the answer moves to the spec's Session block or `decisions.md`, and the question file is deleted.

## Motion baseline (`specs/001-deck-template/references/strips/*.json`)

- `strip`, `viewport`, `runs` (3), `frames` [{ t ms, values }], `tolerance` per value, `recorded` (date). Numbers and generic names only. The values are defined in research R8.

## Licence entry (`docs/licences.md`)

- `file, package or port`, `source`, `licence`, `redistributable` (yes/no). A missing entry, or a `no`, fails the public scan.
