# Tasks: Averlo deck template

**Input**: [spec.md](spec.md) (approved), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/deck-config.md](contracts/deck-config.md), [quickstart.md](quickstart.md). Local only (ignored, on the gate machine): `.local/origin.md`, `.local/origin-inventory.md`, `.local/public-scan-terms.txt`, `.local/env`. If any of the first three is missing, stop.

**Status**: Draft, awaiting the owner's approval. Nothing below may be implemented before it is approved (constitution IV, VI).

Format: `- [ ] T### [P] [Story] What — done when`. `[P]` = may run in parallel with the other `[P]` task in the same phase (never more than 2 at once).

## Rules for every task

1. **Ports** come only through `scripts/port-averlo.mjs` and its manifest, as whole, unchanged copies with their closure and exclusions (research R3a). Never edit a port, not even to make it compile.
2. **Carried files** change only by rename (product identifier → `deck`), detach, compose or redact (FR-009b). A redact rewords or removes a comment that names a person, gives a date, cites the origin's specs or describes its client, and never changes code. Each change is a row in `docs/carried/<area>.md` with its reason (data-model).
3. **Blocked terms** never appear in files, commit messages, branch names, PR text or gate reports. The scan prints only file, line and term number.
4. **Raising with the owner** means: write one file under `docs/decisions/open-questions/` (data-model), park the phase as a draft PR, notify the owner, and continue with phases that don't depend on it. Do the same after 3 failed attempts at a phase's gate.
5. **Licences:** every task that adds a font, image, direct dependency or port adds its row to `docs/licences.md` in the same commit.
6. **Screenshots:** every PR from P1 to P6 attaches before/after screenshots at 390 and 1440, saved under `specs/001-deck-template/references/screens/<phase>/`.
7. **Gate:** every phase ends with `npm run gate`. It runs check, smoke at 390 and 1440, the strip diff, the drift test and the public scan, and reports each as passed, failed or not run. "Not run" is allowed only for a check whose tool a later task creates, and the report names that task.
8. **Tests first:** each phase's first task writes or adapts its tests and records them failing. The one exception is T009, the strip diff, which must pass on unchanged code.
9. **Branches** are stacked as in plan.md. The owner merges into `main` in phase order. Agents never merge into `main` and never change repository settings; T011 is the single approved exception.
10. **Environment:** machine-specific settings (the Chromium library path, `PORT_SOURCES_DIR`, `SCAN_TERMS_FILE`) live only in the ignored `.local/env`, which `scripts/gate.mjs` loads. Never put them in a tracked config.

## Phase P0: Baseline, tooling and public safety (branch `p0-baseline`, base `main`)

- [ ] T001 Tooling:
  - `package.json` with the origin's exact pins and the scripts `dev`, `build`, `pdf`, `check`, `test:smoke`, `test:strips`, `check:ports`, `scan:public`, `gate`.
  - `.nvmrc`, tsconfig (alias `@/*` → `./src/*`), eslint and prettier.
  - The Playwright config, carried from the origin, with its row in `docs/carried/tests.md`.
  - `.local/env` with the values from `.local/origin.md`.

  Done when `npm ci` and `npm run check` run.
- [ ] T002 `docs/decisions/decisions.md`: entries as `- YYYY-MM-DD — decision — source (link to the spec Session bullet)`, linked, never copied, and nothing from the origin. Also `docs/decisions/open-questions/README.md`, describing the one-file-per-question format.
- [ ] T003 Licences and scan:
  - `LICENSE`: MIT, with a notice that the Averlo name and mark are excluded as brand assets (FR-020).
  - `docs/licences.md`: the tooling packages.
  - `scripts/scan-public.mjs` (research R5): terms from `SCAN_TERMS_FILE`, checked in files, `git log --all -p`, commit messages and branch names; failing on a missing or empty list; printing no matched text; checking licence coverage of fonts, images, direct dependencies and ports.
  - Prove `.local/` is ignored with `git check-ignore`.
- [ ] T004 `scripts/gate.mjs`, run as `npm run gate`. It loads `.local/env`, runs every check, and reports each as passed, failed or not run (FR-021).
- [ ] T005 A minimal `docs/orchestration.md`: roles, the delegation brief, at most 2 parallel implementers, and the park rule. It is completed in T039.
- [ ] T006 [US2] Build the unchanged origin in its scratch folder (`.local/origin.md`). Done when its production server starts.
- [ ] T007 [US2] `tests/baseline/record.spec.ts`. It records the strips of research R8 against `ORIGIN_URL`, with the origin's own per-frame sampling approach and its `tests/evidence.ts`. That file is carried, renamed, redacted and rerouted to `specs/001-deck-template/references/strips/`, with rows in `docs/carried/tests.md`.
- [ ] T008 [US2] Record 3 runs at 390 and 1440, and write the strips with their tolerances (R8, resampled on the 16.7 ms grid). Done when they contain numbers and generic names only and `scan:public` passes.
- [ ] T009 [US2] `tests/motion/strips.spec.ts`. It replays the strips against `TARGET_URL`, diffs them against the baseline (FR-015), and covers reduced motion (no intermediate frames). Done when it passes against the origin build (the regression exception to rule 8).
- [ ] T010 Run `npm run gate`.
  - The strip diff runs against the origin build as a self-check.
  - Smoke is reported "not run — T012 and T016"; drift "not run — T022".
- [ ] T011 Create the GitHub repo `averlo-deck-template`, public and marked as a template (approved in spec.md). Push `main` with the setup commits listed in plan.md, once `scan:public` passes over `git log --all -p`; this is the single approved agent push to `main`. Then push `p0-baseline` and open its PR.
- **Gate P0:** T010's report.

## Phase P1: Carry and strip (branch `p1-carry`, base `p0-baseline`)

- [ ] T012 [US1] Tests first. Adapt the origin's tests marked "Adapt" in `.local/origin-inventory.md` to the template's routes, ids and placeholder titles, and add the "Harvest" tests. Also add tests that:
  - an over-long placeholder triggers the dev overflow report;
  - reduced motion skips the intro;
  - the menu's PDF download returns a file;
  - every placeholder slide fits its stage at 390 and 1440 (SC-005).

  Record them failing.
- [ ] T013 [US1] Carry the files marked "Carry" in `.local/origin-inventory.md` into the same paths (the boot loader into `src/boot/`):
  - with exactly the listed removals, and FR-001 intact;
  - rename every product identifier, CSS variables included (`--deck-*`), and redact comments (rule 2);
  - detach the product orb from the intro and the hard-load screen, and compose a template-owned placeholder mark (`src/brand/placeholder/`) in its box and role (research R9). Copy no orb image or video;
  - carry `scripts/render-pdf.mjs`, wired into `npm run build` and `npm run pdf` (FR-003).

  Every change is a row in `docs/carried/<area>.md`.
- [ ] T014 [US2] Carry the files listed under "Motion" in `.local/origin-inventory.md`, plus the motion helpers named in its disposition table, into `src/motion/`. Changes are rename and redact only; detaching waits for T018. Rows go in `docs/carried/motion.md`.
- [ ] T015 [US1] Copy the files listed under "Temporary design files" into `src/_origin-temp/`, renamed and redacted, with imports pointing there, so P1 builds. Add licence rows for the Inter files they use. P3 replaces and deletes them (T025, T026).
- [ ] T016 [US1] Template-owned `src/deck/slides.ts`. It imports the carried types and sets `languages: ["en"]`, with one slide per kind and layout, using only the generic blocks, with "Placeholder title" and "Placeholder text" (FR-002).
- **Gate P1:** `npm run gate` (drift "not run — T022"); the strip diff against the template build is within tolerance.

## Phase P2: Motion module (branch `p2-motion`, base `p1-carry`)

- [ ] T017 [US2] Tests first: `tests/motion/constants.spec.ts` asserts the motion module's exported values equal the list under "Motion" in `.local/origin-inventory.md`, and that no motion file imports the product's screen-switch, registry or config code. It fails before T018.
- [ ] T018 [US2] Detach the product's screen-switch, registry and config imports and calls from the motion files (owner: "Detach them"). Include the selection indicator only if a file kept after T013 imports it. Rows go in `docs/carried/motion.md`.
- [ ] T019 [US2] Fix any import that the detach changes in the carried deck, gate and boot files (compose rows).
- **Gate P2:** `npm run gate`; the strip diff and constants are unchanged.

## Phase P3: Averlo ports and brand config (branch `p3-averlo`, base `p2-motion`)

- [ ] T020 [US2] Tests first:
  - `scripts/check-ports.mjs` (the drift test, FR-009; research R3a step 9);
  - a test that fails while `src/_origin-temp/` exists;
  - a 4.5:1 contrast assertion and a visible-focus assertion in the a11y spec.
- [ ] T021 [US2] `scripts/ports.manifest.json` (the entries of research R3 for averlo-web-transition @ `cfa3d61` and averlo-next-template @ `dc3b01d`) and `scripts/port-averlo.mjs`, which implements R3a and writes `docs/design-source.md`.
- [ ] T022 [US2] Run the port script, and add every recorded package by the precedence in research R2.
  - Licence rows for the ports: MIT under this repository (owner); the Averlo `Logo` mark: brand asset, excluded.
  - Done when `check:ports` passes at 100% (SC-002).
- [ ] T023 [US2] Template-owned styles:
  - `src/app/globals.css` imports `library.css`, then `src/styles/fonts.css`, then `src/styles/tokens.css` (research R6, R7). Tailwind is not imported a second time.
  - The postcss config as in averlo-web-transition.
  - Apply the ported font's variable on `<html>`.
  - The token mapping table goes in `docs/design-source.md`.
- [ ] T024 [US3] `src/brand/config.ts` (data-model: brand, deckTitle, accent), defaulting to Averlo.
- [ ] T025 [US2] Apply the disposition table in `.local/origin-inventory.md` to every temporary file. Compose the Averlo ports in its place, wrap the app in the ported MotionProvider, and set `class="dark"` on `<html>`. All changes are compose rows, and the icon mapping table goes in `docs/carried/deck.md`.
- [ ] T026 Delete `src/_origin-temp/`. Remove the origin's `@radix-ui/react-dropdown-menu`, `@radix-ui/react-radio-group` and `@material-symbols/svg-400` if nothing imports them, and keep `@radix-ui/react-slot` if the closure recorded it. Update `docs/licences.md`.
- **Gate P3:** `npm run gate`, every check run.

## Phase P4: Top bar (branch `p4-topbar`, base `p3-averlo`) [parallel with P5]

- [ ] T027 Upstream rename (research R4). In the questionnaire's clone under `PORT_SOURCES_DIR`, on branch `rename-client-names`:
  - rename every blocked term across the whole repository (file names, identifiers, comments, every importer) to neutral names, with no other change;
  - its own build and tests must pass;
  - open a PR there whose text passes rule 3.

  Raise it with the owner (rule 4) and wait for the merge. Then pin the manifest to the merged commit.
- [ ] T028 [US2] Tests first:
  - the bar spans the full width on every slide;
  - pressing or dragging the navigator jumps slides;
  - the footer shows its progress indicator and no divider (FR-012, FR-013);
  - the brand slot and the footer wordmark follow the brand config (FR-005);
  - a DOM and screenshot parity test of the bar against the questionnaire's own top at 390 and 1440.
- [ ] T029 [US2] Add the questionnaire's header, progress navigator, progress model, wording modules, Logo and shell CSS (with the utility and foundation CSS of their closure) to the manifest. List its font files that may not be redistributed as exclusions (owner: "Exclude the font files only"). Run the port script, and list the shell CSS's unscoped rules in `docs/design-source.md`.
- [ ] T030 [US2] `src/deck/TopBar.tsx`:
  - wrap in `.aq` and set the `--aq-*` variables from `src/brand/config.ts`, the way the questionnaire does;
  - reproduce only the composition lines of the questionnaire's `react.tsx`, recorded by line range in `docs/design-source.md`, without the save chip and the Review button;
  - the brand slot shows the brand's logo, or the placeholder mark plus the name as text;
  - pass the deck's copy through the wording context, and make `onNavigate` jump to a slide.
- [ ] T031 [US1] Put the stage below the bar, remove the footer divider, and make the footer wordmark follow the brand config (carried deck CSS and Footer; compose rows in `docs/carried/deck.md`).
- **Gate P4:** `npm run gate`; every placeholder slide fits at 390 and 1440 (SC-005).

## Phase P5: Intro and hard-load screen (branch `p5-brand`, base `p3-averlo`) [parallel with P4]

- [ ] T032 [US3] Tests first:
  - the Averlo mark shows by default in the intro and on the hard-load screen;
  - brand `owner` without a mark shows the "your logo" placeholder;
  - reduced motion skips the intro (FR-004, FR-004a, FR-005).
- [ ] T033 [US3] The intro and the hard-load screen compose the brand mark in the placeholder's box: the ported Averlo `Logo` variant `mark`, or the owner's mark. Every timing value is kept (R9). Rows go in `docs/carried/{gate,boot}.md`.
- **Gate P5:** `npm run gate`, including the intro strips.

## Phase P6: Slides and languages (branch `p6-slides`, as in plan.md)

- [ ] T034 [US4] Tests first: one language means no language switcher; with two, the switcher appears and `?lang=` holds on the same slide (FR-007).
- [ ] T035 [US4] The language switcher condition in the menu (compose row).
- [ ] T036 [US1] The final placeholder deck: about 12 slides covering every kind, layout and generic block. The PDF file name is `<slug>-<lang>.pdf`, where the slug is `deckTitle` lowercased, with every run of non-alphanumerics replaced by `-` and the ends trimmed.
- **Gate P6:** `npm run gate`.

## Phase P7: Docs and fresh copy (branch `p7-public`, base `p6-slides`)

- [ ] T037 Tests first:
  - `tests/docs/workflow-trace.spec.ts` checks that every slide of a deck drafted from `tests/fixtures/sample-source.md` traces to the fixture or to recorded answers;
  - `tests/docs/readme.spec.ts` checks the README for the quickstart, keys, config, drift-test and gate sections;
  - `scripts/fresh-copy.mjs` clones, installs, runs and times a fresh copy.

  Record them failing.
- [ ] T038 [P] Finish `docs/licences.md`: every ported notice kept, and the Averlo name and mark marked as brand assets excluded from MIT.
- [ ] T039 [P] [US3] Documentation:
  - "Draft a deck from any source" in `process/workflows.md` (FR-016), including asking for brand assets when the brand isn't Averlo;
  - `WORKFLOWS.md`;
  - the complete `docs/orchestration.md`;
  - `tests/fixtures/sample-source.md` (generic sample text).
- [ ] T040 README: quickstart (SC-001), the presenting keys, brand and language config, how a deck re-pins, re-targets or turns off the drift test (FR-009), and the gate.
- [ ] T041 [US3] Dry-run the workflow on the sample source twice: once with the Averlo brand, and once with a named other brand, where the agent must ask for the logo and assets. Check every slide's text (SC-006), and record the result in the PR.
- [ ] T042 Fresh-copy check: `scripts/fresh-copy.mjs` clones the pushed repo into a new folder, copies `.local/` into it (it stays ignored there), runs `npm ci`, and starts and steps through the deck, timed against SC-001.
- **Gate P7:** `npm run gate` on the fresh clone; all PRs open; nothing merged by an agent.
