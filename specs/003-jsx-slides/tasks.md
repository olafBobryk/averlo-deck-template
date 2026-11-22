# Tasks: Slides as JSX

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/slide-file.md](contracts/slide-file.md), [quickstart.md](quickstart.md).

**Status**: Approved by the owner on 2026-11-22 ("Approve, start run"). J0 branches from `feat/003-jsx-slides`, so the spec lands with it.

## Rules for every task

These are the same as feature 002's rules:

- ports go only through the port script, and are never edited;
- carried files change only through rows in `docs/carried/`;
- no blocked terms anywhere;
- owner questions go through the question tool;
- licence rows for anything added;
- screenshots at 390 and 1440 per phase;
- `npm run gate` per phase;
- tests first;
- stacked branches;
- machine settings in `.local/env`;
- at most 2 implementers and one Playwright worker.

## Phase J0: Slide files and the index (branch `j0-files`, base `main`)

- [x] T300 Tests first:
  - `tests/tools/slides_test.mjs`: `scripts/slides-index.mjs` sorts by number, fails on a duplicate or missing number and on a file without `meta` or `copy`, and the generated index matches the files.
  - A Playwright check that a slide added as a file shows in its numbered place, in the menu and overview, prints, and keeps its `?s=` link.
- [x] T301 `src/deck/slide.ts` holds the `SlideMeta`, `Copy` and `SlideProps` types. `scripts/slides-index.mjs` writes `src/slides/index.ts` and runs before `dev`, `build` and `check` (package scripts).
- [x] T302 The engine (`Deck.tsx`, `SlideView.tsx`, `Overview.tsx`, print, render-pdf) reads the generated index. A slide that has a `Component` renders it in the slide's frame, and the old data slides keep working until J2. These are compose rows.
- **Gate J0:** `npm run gate`; the default deck is unchanged.

## Phase J1: Components (branch `j1-components`, base `j0-files`)

- [x] T310 Tests first: every component renders like its former block (a DOM and screenshot comparison per block against the J0 build), at 390 and 1440.
- [x] T311 Move each block's renderer into a named component in `src/components/deck/`: Points, Steps (`rail`, `across`), Facts, Org, Fork, Week, Plan, Lead, Note, Chart, Stat, Flow, Timeline, Cycle, OrgChart, Table, Matrix, Quote, Agenda, Compare, Image and ImageGrid. Each has typed props and the same markup and CSS. The block switch delegates to them.
- **Gate J1:** `npm run gate`.

## Phase J2: The placeholder deck as files (branch `j2-deck`, base `j1-components`)

- [x] T320 Tests first: the deck's slides come from `src/slides/`; every placeholder slide keeps its look and order; the coverage test reads the files.
- [x] T321 Rewrite the placeholder deck as `src/slides/01-…tsx` to `32-…tsx`, with placeholder words in `copy` and the same slides in the same order.
- [x] T322 Remove the data model: `slides.ts` data, the `content.ts` block types and `SlideBody`'s block switch. These are detach rows. Keep `langs.ts`.
  - J2 removed the deck's data: the `slides.ts` data, the showcase generator and the deck's content map. The preset gallery still draws data blocks until T331 points it at the preset files, so `content.ts`'s block types, `SlideBody`'s switch and the `src/presets` adapters go then.
- **Gate J2:** `npm run gate`, with the strips within tolerance.

## Phase J3: Preset examples (branch `j3-presets`, base `j2-deck`)

- [x] T330 Tests first: every file in `src/presets/slides/` renders when copied into a scratch `src/slides/` with a number, and still renders with its JSX rearranged (a scripted edit). `/gallery` and the showcase render the files.
- [x] T331 Write one example slide file per preset in `src/presets/slides/`: headline, body and the visual, with placeholder words. Point `/gallery` and the showcase at them, and remove the registry's data examples.
  - Each preset's second example is a file too (`src/presets/slides/alternates/`), and the composed visual example one in `composed/`, so the gallery draws only files. The data blocks' switch, the preset adapters and the slide view's data path are gone (T322's rest); `content.ts` keeps the block types only as the shapes the preset validator checks, until J4 reworks the skill and the trace check.
- **Gate J3:** `npm run gate`.

## Phase J4: Skill, trace, inline-text check, docs (branch `j4-skill`, base `j3-presets`)

- [ ] T340 Tests first:
  - the inline-text check fails on visible text outside `copy` and names the file (research R3);
  - the trace check reads every slide's `copy`, labels and figures included;
  - the skill test checks the skill names every preset file.
- [ ] T341 Update the deck-visuals skill (both copies) and "Draft a deck from any source": copy the fitting preset file into `src/slides/` with its number, and put the owner's words in `copy`. Redo the dry-run fixture as slide files.
- [ ] T342 Update the README ("Write your deck", "Visuals") and the docs.
- **Gate J4:** `npm run gate`, then preview.

## Dependencies

J0 → J1 → J2 → J3 → J4, in order. Within a phase, tasks marked [P] may run 2 at once.
