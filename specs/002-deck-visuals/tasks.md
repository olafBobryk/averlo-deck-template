# Tasks: Deck visuals

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/presets.md](contracts/presets.md), [contracts/skill.md](contracts/skill.md), [quickstart.md](quickstart.md). Local only (ignored, on the gate machine): `.local/env`, `.local/public-scan-terms.txt`, `.local/origin.md`. If any of them is missing, stop.

**Status**: Draft, waiting for the owner's approval.

Format: `- [ ] T### [P] [Story] What — done when`. `[P]` means it may run in parallel with the other `[P]` task in the same phase, never more than 2 at once.

## Rules for every task

1. **Ports** come only through `scripts/port-averlo.mjs` and its manifest (`process/workflows.md#port-the-design-system`). Never edit a port; presets compose them.
2. **Carried files** (`src/deck/*` from feature 001, `src/app/print/page.tsx`, etc.) change only by rename, detach, compose or redact. Each change is a row in `docs/carried/<area>.md`.
3. **Blocked terms** never appear in files, commit messages, branch names, PR text or gate reports. Check text with `npm run scan:public -- --text <file>`.
4. **Raising with the owner** goes through the question tool (AskUserQuestion) with options and a recommendation. Each answer is recorded in `spec.md`'s Clarifications.
5. **Licences:** every package, font and image added gets its row in `docs/licences.md` in the same commit.
6. **Screenshots:** every phase's PR attaches gallery screenshots at 390 and 1440 under `specs/002-deck-visuals/references/screens/<phase>/`. Template builds only.
7. **Gate:** every phase ends with `npm run gate`, reported as passed, failed or not run. Failing strips are retried once and reported as flaky. The default deck's strips must stay within tolerance.
8. **Tests first:** each phase's first task writes its tests and records them failing in `.local/evidence/`.
9. **Content:** presets and the gallery carry placeholder text and placeholder data only: "Placeholder title", "Placeholder text", and round placeholder numbers marked as placeholders in comments. No invented claims.
10. **Branches** are stacked as in plan.md. The owner merges into `main`, unless they grant merging for a run.
11. **Environment:** machine settings live only in `.local/env`. 8 GB machine: at most 2 implementers and one Playwright worker.

## Phase V0: Model, registry and gallery (branch `v0-model`, base `main`)

- [ ] T100 [US2] Tests first:
  - `tests/presets/gallery.spec.ts`: every registry entry has a gallery slide; each gallery slide fits its stage at 390 and 1440 (visible content inside the stage, as feature 001's SC-005 check); 4.5:1 contrast via axe; the gallery PDF has one page per slide; each preset also renders with a second, different example and still fits (SC-005).
  - `tests/tools/presets_test.mjs`: the registry's names are unique, every family is one of the four, and every example validates against its block type.

  Done when both are recorded failing.
- [ ] T101 [US2] Add the block types of data-model.md to `Block` in `src/deck/content.ts` (compose rows): `chart`, `stat`, `flow`, `timeline`, `cycle`, `orgchart`, `table`, `matrix`, `quote`, `agenda`, `compare`, `image`, `imageGrid`, `custom`, with their field limits. `SlideBody.tsx` dispatches each new block type to its preset component through `src/presets/index.ts` (compose row). Done when `npm run check` passes and the default deck renders unchanged.
- [ ] T102 [US2] `src/presets/registry.ts`: the registry entry type `{ name, family, block, fits, example }`, starting empty. `src/presets/gallery.ts` builds the gallery's slides from the registry: one divider per family, then one slide per preset with its example. Done when the registry test passes for an empty registry.
- [ ] T103 [US2] The `/gallery` route (`src/app/gallery/`, template-owned) renders the deck engine with the gallery's slides through `DeckContext`. The carried print page takes `?deck=gallery` (compose row), and the PDF script also renders `gallery-<lang>.pdf` (compose row). Done when `/gallery` opens and its PDF builds.
- **Gate V0:** `npm run gate`. The default deck's smoke and strip tests are unchanged and pass.

## Phase V1: Charts and stats (branch `v1-charts`, base `v0-model`)

- [ ] T110 [US2] Tests first: gallery entries for `chart` bar, line and donut and for `stat` render and fit. A chart's colours come from Averlo tokens: no colour literal in `src/presets/charts/`. A series with fewer values than categories is rejected by the example validator.
- [ ] T111 [US2] Add `recharts` 3.10.1 (research D1), with its licence row. Build `src/presets/charts/{Bar,Line,Donut}.tsx` from Averlo tokens (accent and muted scale, Inter, the border token for the grid), with no tooltip and no interactive legend. Each draws `categories` and `series` exactly as given, shows `unit`, and shows `source` muted under the chart. "At most 12 categories": a validator error, never truncation.
- [ ] T112 [P] [US2] `src/presets/charts/Stat.tsx`: 1 to 4 big-number cards from `Panel` and `Text`. `value` is shown as written. Add its registry entry and example.
- **Gate V1:** `npm run gate`, plus gallery screenshots.

## Phase V2: Diagrams (branch `v2-diagrams`, base `v0-model`) [parallel with V1]

- [ ] T120 [US2] Tests first: gallery entries for `flow`, `timeline`, `cycle`, `orgchart`, `table` and `matrix` render and fit. The data-model limits ("2 to 7 steps", "2 to 8 events", "3 to 6 stages", "two levels below the root at most", "at most 5 columns and 8 rows", x and y from 0 to 1) are enforced by the validator.
- [ ] T121 [US2] `src/presets/diagrams/{Flow,Timeline,Cycle}.tsx`, composed from Averlo `Panel`, `Text` and `Icon` and tokens. Connectors are SVG in the border token, and step labels use the navigator's muted step style (feature 001, P8). Registry entries and examples.
- [ ] T122 [P] [US2] `src/presets/diagrams/{OrgChart,CompareTable,Matrix}.tsx`, composed the same way. Registry entries and examples.
- **Gate V2:** `npm run gate`, plus gallery screenshots.

## Phase V3: Text and image slides (branch `v3-text-images`, base `v0-model`)

- [ ] T130 [US2] [US4] Tests first: gallery entries for `quote`, `agenda`, `compare`, statement (the layout), image + text (`image` in `split`), `image` full-bleed, `image` with caption and `imageGrid` render and fit. An `image` without `src` shows the placeholder. An image file under `public/images/` without a licence row fails the public scan (fixture test).
- [ ] T131 [US2] `src/presets/text/{Quote,Agenda,Compare}.tsx`, plus registry entries for statement and image + text using existing layouts.
- [ ] T132 [P] [US4] `src/presets/images/{Image,ImageGrid,ImagePlaceholder}.tsx`. The placeholder is template-owned, neutral and labelled "Image". `fit` is `"cover" | "contain"`, `bleed` gives full-bleed, and alt text is required. Placeholder images only in the gallery; no real photos.
- **Gate V3:** `npm run gate`, plus gallery screenshots.

## Phase V4: The skill (branch `v4-skill`, from `v1-charts` with V2 and V3 merged in)

- [ ] T140 [US1] [US3] Tests first:
  - `tests/tools/skill_test.mjs`: the Claude and Codex copies of the skill are identical; `references/presets.md` matches the registry (generated); every preset in the registry is named in the selection rules.
  - `tests/docs/workflow-trace.spec.ts` extended so chart values and every visual's labels must trace (FR-016).
  - A `custom` block naming a missing visual fails validation.
- [ ] T141 [US1] `.claude/skills/deck-visuals/SKILL.md` (copied to `.agents/skills/deck-visuals/`), as in contracts/skill.md: the selection rules of research D5, the confirm loop, the trace rule, asking for missing values, units and periods, and the image rule (ask which generator the owner has; generate only on a yes; licence row).
- [ ] T142 [US1] `scripts/presets-doc.mjs` writes `references/presets.md` (name, family, fits, an example) from the registry into both skill copies. Add an `npm run presets:doc` script.
- [ ] T143 [US3] Compose-per-deck: `src/deck/visuals/index.ts` (empty export map) and one example composed visual shown in the gallery, built only from Averlo parts. Also "Promote a visual to a preset" in `process/workflows.md` (move it to `src/presets/`, add a registry entry, an example and a gallery slide, run the tests).
- [ ] T144 [US1] Dry run: use the skill on `tests/fixtures/sample-source.md`, ask the owner to confirm the proposed visuals through the question tool, and save the result as `tests/fixtures/drafted-visuals.json` and the answers in `tests/fixtures/answers.md`. Done when the trace test passes over it.
- **Gate V4:** `npm run gate`.

## Phase V5: Docs (branch `v5-docs`, base `v4-skill`)

- [ ] T150 README: a "Visuals" section listing the presets by family, the gallery, and the skill. `process/workflows.md`: "Draft a deck from any source" uses the skill to pick visuals, plus "Add an image". `WORKFLOWS.md` updated. `tests/docs/readme.spec.ts` checks the new section.
- **Gate V5:** `npm run gate`; a Vercel preview of `/gallery` once the owner says to deploy.

## Dependencies

- T121 uses the muted step style from feature 001's phase P8, so V2 starts after P8 is merged.

- V0 blocks everything.
- V1, V2 and V3 depend only on V0, and V1 and V2 may run in parallel; at most 2 at once.
- V4 needs V1–V3.
- V5 needs V4.
- **MVP:** V0, then V1 (US2 with charts), then V4 (US1), with diagrams and text and images following.
