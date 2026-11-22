# Tasks: Averlo deck template

**Input**: [spec.md](spec.md) (approved), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/deck-config.md](contracts/deck-config.md), [quickstart.md](quickstart.md). Local only (ignored, on the gate machine): `.local/origin.md`, `.local/origin-inventory.md`, `.local/public-scan-terms.txt`, `.local/env`. If any of them is missing, stop.

**Status**: Approved by the owner on 2026-11-21 ("Approve, start run"). This approval also re-approves the revised spec.

Format: `- [ ] T### [P] [Story] What — done when`. `[P]` = may run in parallel with the other `[P]` task in the same phase (never more than 2 at once).

## Rules for every task

1. **Ports** come only through `scripts/port-averlo.mjs` and its manifest, following the port procedure (research R3a): whole, unchanged copies with their closure, minus the listed exclusions. Never edit a port, not even to make it compile.
2. **Carried files** change only by rename (product identifier → `deck`), detach, compose or redact (FR-009b). A redact rewords or removes a comment that names a person, gives a date, cites the origin's specs or describes its client, and never changes code. Each change is a row in `docs/carried/<area>.md` with its reason (data-model).
3. **Blocked terms** never appear in files, commit messages, branch names, PR text or gate reports. Check text with `npm run scan:public -- --text <file>` before posting it. The scan prints only file, line and term number.
4. **Raising with the owner** means:
   - write the question, its context, options and recommendation in the phase's draft PR;
   - notify the owner;
   - continue with phases that don't depend on it.

   The owner thread, the only writer of `docs/decisions/open-questions.md`, records it there. Do the same after 3 failed attempts at a phase's gate.
5. **Licences:** every task that adds a font, image, direct dependency or port adds its row to `docs/licences.md` in the same commit (data-model, including the brand-asset value).
6. **Screenshots:** PRs from P3 to P6 attach before/after screenshots at 390 and 1440. P1 attaches "after" only (its base has no app). They are saved under `specs/001-deck-template/references/screens/<phase>/`. Only template builds are ever screenshotted, never the origin.
7. **Gate:** every phase ends with `npm run gate`. It runs check, smoke at 390 and 1440, the strip diff, the drift test and the public scan, and reports each as passed, failed or not run. "Not run" is allowed only for a check whose tool a later task creates, and the report names that task.
8. **Tests first:** each phase's first task writes or adapts its tests and records them failing. The one exception is T009, the strip diff, which must pass on unchanged code.
9. **Branches** are stacked as in plan.md. The owner merges into `main` in phase order. Agents never merge into `main` and never change repository settings; T011 is the single approved exception.
10. **Environment:** machine-specific settings (`LD_LIBRARY_PATH`, `PORT_SOURCES_DIR`, `SCAN_TERMS_FILE`, `ORIGIN_URL`, `TARGET_URL`) live only in the ignored `.local/env`, which `scripts/gate.mjs` loads. Never put them in a tracked config.

## Before P0 (owner thread, after approval)

- [x] T000 Fast-forward local `main` to the approved tip of `feat/001-deck-template`, and cut `p0-baseline` from it (plan.md, setup).

## Phase P0: Baseline, tooling and public safety (branch `p0-baseline`, base `main`)

- [x] T001 Tooling:
  - `package.json` with the origin's exact pins and the scripts `dev`, `build`, `pdf`, `check`, `test:smoke`, `test:strips`, `check:ports`, `scan:public`, `gate`.
  - `.nvmrc`, tsconfig (alias `@/*` → `./src/*`), eslint and prettier.
  - The Playwright config, carried from the origin, with its row in `docs/carried/tests.md`.
  - Check that `.local/env` holds the five values of rule 10.

  Done when `npm ci` and `npm run check` run.
- [x] T002 `docs/decisions/decisions.md` (entries as `- YYYY-MM-DD — decision — link to the spec Session bullet`; linked, never copied, nothing from the origin) and an empty `docs/decisions/open-questions.md`. Both are written only by the owner thread.
- [x] T003 Licences and scan. Tests first, recorded failing: fixture tests for a missing list, an empty list, and a term in a file, in history, in a commit message and in a branch name, plus an unlisted image, an unlisted dependency and `--text` input. Then:
  - `LICENSE`: MIT, with a notice that the Averlo name and mark are excluded as brand assets (FR-020).
  - `docs/licences.md`: the tooling packages, and the screenshots row (data-model).
  - `scripts/scan-public.mjs` (research R5), with `--text`.
  - Prove `.local/` is ignored with `git check-ignore`.
- [x] T004 `scripts/gate.mjs` (`npm run gate`). Tests first, recorded failing: a fixture that exercises "not run" reporting. It loads `.local/env`, starts and stops the origin scratch server at `ORIGIN_URL` and the template's production server at `TARGET_URL` as each check needs, runs every check, and reports each as passed, failed or not run (FR-021).
- [x] T005 A minimal `docs/orchestration.md`: roles, the delegation brief, at most 2 parallel implementers, and the park rule. It is completed in T039.
- [x] T006 [US2] Build the unchanged origin in its scratch folder (`.local/origin.md`). Done when it serves at `ORIGIN_URL`.
- [x] T007 [US2] `tests/baseline/record.spec.ts`. It records the strips of research R8 against `ORIGIN_URL`, with the origin's own per-frame sampling approach and its `tests/evidence.ts`. That file is carried, renamed, redacted and rerouted to `specs/001-deck-template/references/strips/`, with rows in `docs/carried/tests.md`.
- [x] T008 [US2] Record 3 runs at 390 and 1440, resampled on the 16.7 ms grid, and write the strips with their tolerances (R8). Also write `references/strips/constants.json`: the origin's `motionTokens`, `reducedMotionTokens` and the swipe, intro and boot constants named in `.local/origin-inventory.md`, as numbers only. Done when they contain numbers and generic names only and `scan:public` passes.
- [x] T009 [US2] `tests/motion/strips.spec.ts`. It replays the strips against `TARGET_URL`, diffs them against the baseline (FR-015), and covers reduced motion (no intermediate frames). Done when it passes with `TARGET_URL` pointed at the origin build (the regression exception to rule 8).
- [x] T010 Run `npm run gate`.
  - The strip diff runs against the origin build as a self-check.
  - Smoke is reported "not run — T012 and T016"; drift "not run — T020".
- [x] T011 Create the GitHub repo `averlo-deck-template`, public and marked as a template (approved in spec.md). Push `main`, which T000 fast-forwarded, once `scan:public` passes over `git log --all -p`; this is the single approved agent push to `main`. Then push `p0-baseline` and open its PR.
- **Gate P0:** T010's report.

## Phase P1: Carry, strip and motion module (branch `p1-carry`, base `p0-baseline`)

- [x] T012 [US1, US2] Tests first. Adapt the origin's tests marked "Adapt" in `.local/origin-inventory.md` to the template's routes, ids and placeholder titles, and add the "Harvest" tests. Also add:
  - an over-long placeholder triggers the dev overflow report;
  - the menu's PDF download returns a file;
  - every placeholder slide fits its stage at 390 and 1440 (SC-005);
  - `tests/motion/constants.spec.ts`: the motion module's `motionTokens` and `reducedMotionTokens`, and the swipe, intro and boot constants, deep-equal `references/strips/constants.json` (T008); no file imports the product's screen-switch, registry or config code.

  Record them failing.
- [x] T013 [US1] Carry the files marked "Carry" in `.local/origin-inventory.md` into their listed paths:
  - the boot loader goes into `src/boot/`, and the origin's `slides.ts` into `src/deck/model.ts`;
  - apply exactly the listed removals, keeping FR-001 intact, including the second-language detach and the import re-pointing listed in the inventory;
  - `src/app/globals.css` is carried temporarily, importing `src/_origin-temp/base.css`, until T023;
  - rename every product identifier, CSS variables included (`--deck-*`), and redact comments (rule 2);
  - detach the product orb from the intro and the hard-load screen, and compose the template-owned placeholder mark (`src/brand/placeholder/`) in its box and role, rendered as an `<img>` so the boot wait holds (research R9). Copy no orb image or video;
  - carry `scripts/render-pdf.mjs`, wired into `npm run build` and `npm run pdf` (FR-003);
  - add the Material Symbols licence row for the glyph inside the carried lock.

  Every change is a row in `docs/carried/<area>.md`.
- [x] T014 [US2] Carry the files listed under "Motion" in `.local/origin-inventory.md` (including `route-map.ts`, `SizeFrame` and `fade`) into `src/motion/`:
  - rename and redact;
  - detach the product's screen-switch, registry and config imports and calls (owner: "Detach them");
  - include the selection indicator only if a file kept after T013 imports it.

  Copy nothing from the origin's `lib/`. Rows go in `docs/carried/motion.md`.
- [x] T015 [US1] Copy the code files listed under "Temporary design files" into `src/_origin-temp/`, renamed and redacted, and detach the same screen-switch imports from its Button and DropdownMenu. Their public assets (fonts, icons) stay under `public/`, so they are served. Point the imports there so P1 builds. Rows go in `docs/carried/temp.md`, and licence rows are added for the Inter files and icon glyphs. P3 replaces and deletes them (T025, T026).
- [x] T016 [US1] Template-owned `src/deck/langs.ts` (`langs = ["en"]` and `Lang`) and `src/deck/slides.ts`. `slides.ts` imports `model.ts` and the carried content types, and holds one slide per kind and layout plus their content map, using only the generic blocks, with "Placeholder title" and "Placeholder text" (FR-002).
- **Gate P1:** `npm run gate` (drift "not run — T020"); the strip diff against the template build is within tolerance, and the constants are exact.

## Phase P3: Averlo ports and brand config (branch `p3-averlo`, base `p1-carry`)

- [x] T020 [US2] Tests first, recorded failing:
  - `scripts/check-ports.mjs` (the drift test, FR-009; research R3a step 9), with a fixture test where an edited port is named;
  - a test that fails while `src/_origin-temp/` exists;
  - 4.5:1 contrast and visible-focus assertions in the a11y spec.
- [x] T021 [US2] `scripts/ports.manifest.json` (the entries of research R3 for averlo-web-transition @ `cfa3d61` and averlo-next-template @ `dc3b01d`), `scripts/port-averlo.mjs` implementing R3a, and the port procedure written to `process/workflows.md#port-the-design-system`. The script writes `docs/design-source.md`.
- [x] T022 [US2] Run the port script, and add every recorded package by the precedence in research R2. Licence rows: the ports are MIT under this repository (owner); the Averlo `Logo` is a brand asset (data-model value). Done when `check:ports` passes at 100% (SC-002).
- [x] T023 [US2] Template-owned styles:
  - `src/app/globals.css` imports `library.css`, then `src/styles/fonts.css`, then `src/styles/tokens.css` (research R6, R7). Tailwind is not imported a second time.
  - The postcss config as in averlo-web-transition.
  - Apply the ported font's variable on `<html>`.
  - The token mapping table goes in `docs/design-source.md`.
- [x] T024 [US3] `src/brand/config.ts` (data-model: brand, deckTitle, accent), defaulting to Averlo. Add Averlo-mark app icons for the manifest, with brand-asset licence rows.
- [x] T025 [US2] Apply the disposition table in `.local/origin-inventory.md` to every temporary file:
  - compose the Averlo ports in their place;
  - detach ShimmerRoot and the theme bootstrap from `src/app/layout.tsx`;
  - wrap the app in the ported MotionProvider, and set `class="dark"` on `<html>`.

  All changes are listed rows, and the icon mapping table goes in `docs/carried/deck.md`.
- [x] T026 Delete `src/_origin-temp/` and `docs/carried/temp.md`. Remove the origin's `@radix-ui/react-dropdown-menu`, `@radix-ui/react-radio-group` and `@material-symbols/svg-400` if nothing imports them. Keep the Material Symbols licence row for the lock glyph, and update `docs/licences.md`.
- [x] T026a [US2] Owner addition (spec, "During P3"). Tests first: the popup's slide list shows every slide as the same ghost button; slides under a section are indented under its row; the section row has a chevron with `aria-expanded` that opens and closes its slides; only the current slide's section is open when the menu opens; keys and visible focus work; the expanded overview is unchanged.
- [x] T026b [US2] Port the Averlo `Collapse` primitive through the manifest, and build the popup's slide list from ghost `Button`s, the chevron `Icon` and `Collapse` (compose rows in `docs/carried/deck.md`). A section is a `divider` slide; its children are the following slides with the same `section`.
- [x] T026c [US2] Size the Averlo menu button and controls row to the origin's boxes with template-owned classes, so the menu-open and menu-close strips keep their baseline (owner: "Keep origin geometry").
- [x] T026d [US1] Below about 480 px, Previous, Next and Fullscreen in the menu footer are icon-only, keeping their accessible names (owner: "Icon-only on phones").
- [x] T026e The strip diff re-runs a failing strip once; a pass on retry is reported as flaky in the gate report (owner: "Retry once, report it").
- **Gate P3:** `npm run gate`, every check run.

## Phase P4: Top bar (branch `p4-topbar`, base `p3-averlo`) [parallel with P5]

- [x] T027 Upstream rename (research R4). In the questionnaire's clone under `PORT_SOURCES_DIR`, on branch `rename-client-names`:
  - rename every blocked term across the whole repository (file names, identifiers, comments, every importer) to neutral names, with no other change;
  - its own build and tests must pass;
  - open a PR there whose text passes `scan:public --text`.

  Raise it with the owner (rule 4) and wait for the merge. Then pin the manifest to the merged commit.
- [x] T028 [US2] Tests first, in `tests/topbar.spec.ts`:
  - the bar spans the full width on every slide;
  - pressing or dragging the navigator jumps slides;
  - the footer shows its progress indicator and no divider (FR-012, FR-013);
  - the brand slot and the footer wordmark follow the brand config (FR-005);
  - the bar's computed font is Inter;
  - a DOM and screenshot parity test of the bar against the questionnaire's own top, rendered with the same font override, at 390 and 1440.
- [x] T029 [US2] Port the top bar:
  - first, a quick check that `next build` accepts a stylesheet whose excluded `url()`s are unresolved, using template-owned build settings if needed (R3a step 6). If nothing works, raise it.
  - add the questionnaire's header, progress navigator, progress model, wording modules, logo and shell CSS (with the utility and foundation CSS of their closure) to the manifest, and list its non-redistributable font files as exclusions (owner: "Exclude the font files only").
  - run the port script, and list the shell CSS's unscoped rules in `docs/design-source.md`.
  - licence rows: the questionnaire's logo mark is a brand asset.
- [x] T030 [US2] `src/deck/TopBar.tsx`:
  - wrap in `.aq`, and set the `--aq-*` variables from `src/brand/config.ts` plus `--font-sf-pro: var(--font-inter)` inline (R4);
  - reproduce only the composition lines of the questionnaire's `react.tsx`, recorded by line range in `docs/design-source.md`, without the save chip and the Review button;
  - the brand slot shows the brand's logo, or the placeholder mark plus the name as text;
  - pass the deck's copy through the wording context, and make `onNavigate` jump to a slide.
- [x] T031 [US1] Put the stage below the bar, remove the footer divider, and make the footer wordmark follow the brand config (compose rows in `docs/carried/deck.md`).
- [x] T031a [US2] Owner additions (spec, "During P4"): hide the bar on phones (under about 480 px wide or 500 px tall) with the slides taking the full stage, and adapt the bar tests to it; leave out the Review button and remove it from the parity reference; SC-005 checks visible content; keep `utilities.css` and `foundations.css` ported but not imported, with the reason in `docs/design-source.md`.
- **Gate P4:** `npm run gate`; every placeholder slide fits at 390 and 1440 (SC-005).

## Phase P5: Intro and hard-load screen (branch `p5-brand`, base `p3-averlo`) [parallel with P4]

- [x] T032 [US3] Tests first, in `tests/brand.spec.ts`:
  - the Averlo mark shows by default in the intro and on the hard-load screen;
  - brand `owner` without a mark shows the "your logo" placeholder;
  - the hard-load screen keeps its 400 ms minimum and 3 s cap (FR-004a, FR-005).
- [x] T033 [US3] The intro and the hard-load screen compose the brand mark in the placeholder's box (as an `<img>` on the hard-load screen): the ported Averlo `Logo` variant `mark`, or the owner's mark. Every timing value is kept (R9). Rows go in `docs/carried/{gate,boot}.md`.
- **Gate P5:** `npm run gate`, including the intro strips and constants.

## Phase P6: Slides and languages (branch `p6-slides`, as in plan.md)

- [x] T034 [US4] Tests first: one language means no language switcher; with two, the switcher appears and `?lang=` holds on the same slide (FR-007).
- [x] T035 [US4] The language switcher condition in the menu (compose row).
- [x] T036 [US1] The final placeholder deck: about 12 slides covering every kind, layout and generic block. The PDF file name is `<slug>-<lang>.pdf`, where the slug is `deckTitle` lowercased, with every run of non-alphanumerics replaced by `-` and the ends trimmed.
- [x] T036a [US4] Defect (light path): the deck drops `?lang=` for `langs[0]`, not for a hard-coded `en`.
- **Gate P6:** `npm run gate`.

## Phase P7: Docs and fresh copy (branch `p7-public`, base `p6-slides`)

- [ ] T037 Tests first, recorded failing:
  - `tests/docs/workflow-trace.spec.ts` reads `tests/fixtures/drafted-deck.json` and `tests/fixtures/answers.md` (written by T041), and checks every slide's text against them and `tests/fixtures/sample-source.md`;
  - `tests/docs/readme.spec.ts` checks the README for the quickstart, keys, config, drift-test, scan and gate sections;
  - `scripts/fresh-copy.mjs` clones, installs, runs and times a fresh copy.
- [ ] T038 [P] Finish `docs/licences.md`: every ported notice kept, and the brand assets marked as excluded from MIT.
- [ ] T039 [P] [US3] Documentation:
  - "Draft a deck from any source" in `process/workflows.md` (FR-016), including asking for brand assets when the brand isn't Averlo;
  - `WORKFLOWS.md`;
  - the complete `docs/orchestration.md`;
  - `tests/fixtures/sample-source.md` (generic sample text).
- [ ] T040 README:
  - quickstart (SC-001) and the presenting keys;
  - brand and language config;
  - how a deck re-pins, re-targets or turns off the drift test (FR-009);
  - how a deck supplies its own blocked-term list or turns the public scan off;
  - the gate.
- [ ] T041 [US3] Dry-run the workflow on the sample source twice: once with the Averlo brand, and once with a named other brand, where the agent must ask for the logo and assets. Save the drafted deck and the answers as the T037 fixtures, and check every slide's text (SC-006).
- [ ] T042 Fresh-copy check: `scripts/fresh-copy.mjs` clones the pushed repo into a new folder, copies `.local/` into it (it stays ignored there), runs `npm ci`, and starts and steps through the deck, timed against SC-001.
- **Gate P7:** `npm run gate` on the fresh clone; all PRs open; nothing merged by an agent.
