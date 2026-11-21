# Tasks: Averlo deck template

**Input**: [spec.md](spec.md) (approved), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/deck-config.md](contracts/deck-config.md), [quickstart.md](quickstart.md). Local only (ignored, on the gate machine): `.local/origin.md`, `.local/origin-inventory.md`, `.local/public-scan-terms.txt`. If any of them is missing, stop.

**Status**: Draft, awaiting the owner's approval. Nothing below may be implemented before it is approved (constitution IV, VI).

Format: `- [ ] T### [P] [Story] What — files — done when`. `[P]` = may run in parallel with the other `[P]` task in the same phase (never more than 2 at once).

## Rules for every task

1. **Ports** come only through `scripts/port-averlo.mjs` and its manifest, as whole, unchanged copies with their closure (research R3a). Never edit a port, not even to make it compile.
2. **Carried files** change only by rename (product identifier → `deck`), detach, or compose (FR-009b). Each change is a row in `docs/carried.md` with its reason.
3. **Blocked terms** (`.local/public-scan-terms.txt`) never appear in files, commit messages, branch names or PR text.
4. **Raising with the owner** means: add an entry to `docs/decisions/open-questions.md`, park the phase as a draft PR, notify the owner, and move on to phases that don't depend on it. Do the same after 3 failed attempts at a phase's gate.
5. **Licences:** every task that adds a font, image, package or port adds its row to `docs/licences.md` in the same commit.
6. **Screenshots:** every PR from P1 to P6 attaches before/after screenshots at 390 and 1440, saved under `specs/001-deck-template/references/screens/<phase>/`.
7. **Gate:** every phase ends with `npm run gate`, which runs check, smoke at 390 and 1440, the strip diff, the drift test and the public scan, and reports each as passed, failed or not run. "Not run" is allowed only for a check whose tool a later task creates, and the report names that task.
8. **Tests first:** each phase's first task writes or adapts its tests and records them failing. The exception is T008, the strip diff, which must pass on the unchanged code.
9. **Branches** are stacked. The owner merges into `main` in phase order. Agents never merge into `main` and never change repository settings, except T010.

## Phase P0: Baseline, tooling and public safety (branch `p0-baseline`, base `main`)

- [ ] T001 Tooling — `package.json` (the origin's exact pins and scripts `dev`, `build`, `pdf`, `check`, `test:smoke`, `test:strips`, `check:ports`, `scan:public`, `gate`), `.nvmrc`, tsconfig (with the `@/*` → `./src/*` alias), eslint, prettier, the playwright config carried from the origin, and the Chromium library path from `.local/origin.md` in the test environment. Done when `npm ci` and `npm run check` run.
- [ ] T002 `docs/decisions/decisions.md` and `docs/decisions/open-questions.md`, in the shape of the origin's. Copy the project-wide decisions from spec.md's Sessions as links.
- [ ] T003 `docs/licences.md` with the tooling packages already in `package.json`, and `scripts/scan-public.mjs` (research R5). It checks terms in files, `git log -p`, commit messages and branch names, case-insensitively; it fails on a missing or empty term list; and it checks licence coverage. Prove `.local/` is ignored with `git check-ignore`.
- [ ] T004 `scripts/gate.mjs`, run by `npm run gate`: it runs every check, and reports each as passed, failed or not run (FR-021).
- [ ] T005 [US2] Build the unchanged origin in its scratch folder (`.local/origin.md`). Done when its production server starts.
- [ ] T006 [US2] `tests/baseline/record.spec.ts`. It records the strips defined in research R8 against `ORIGIN_URL`, using the origin's own per-frame sampling approach and its `tests/evidence.ts`, renamed and rerouted to `specs/001-deck-template/references/strips/`.
- [ ] T007 [US2] Record 3 runs at 390 and 1440, and write the strips with their tolerances (R8). Done when the files contain numbers and generic names only and `scan:public` passes on them.
- [ ] T008 [US2] `tests/motion/strips.spec.ts`: it replays the same strips against a target URL and diffs them against the baseline (FR-015), and compares the timing constants exactly. Done when it passes against the origin build itself (the regression exception to rule 8). Reduced-motion cases are included: no intermediate frames.
- [ ] T009 Run the full gate (smoke and drift not run yet; named T013 and T020).
- [ ] T010 Create the GitHub repo `averlo-deck-template`, public and marked as a template (approved in spec.md). Push `main` with the setup commits only once `scan:public` passes on them; this is the single agent push to `main` the owner approved. Then push `p0-baseline` and open its PR.
- **Gate P0:** `npm run gate`, with smoke and drift reported as not run until T013 and T020.

## Phase P1: Carry and strip (branch `p1-carry`, base `p0-baseline`)

- [ ] T011 [US1] Tests first: adapt the origin's tests marked "Adapt" in `.local/origin-inventory.md` to the template's routes, ids and placeholder titles, and add the "Harvest" tests. Include: the dev overflow report on an over-long placeholder; reduced motion skipping the intro; the PDF download returning a file. Record them failing.
- [ ] T012 [US1] Carry the files marked "Carry" in `.local/origin-inventory.md` into the same paths (the boot loader into `src/boot/`), with exactly the listed removals and FR-001 intact. Rename every product identifier in them, CSS variables included (`--deck-*`). Carry `scripts/render-pdf.mjs` and wire it into `npm run build` and `npm run pdf` (FR-003). Every change is a row in `docs/carried.md`.
- [ ] T013 [US1] Copy the files marked "Temporary design files" into `src/_origin-temp/`, renamed, with imports pointing there, so P1 builds. They are deleted in T024.
- [ ] T014 [US1] A minimal `src/deck/slides.ts` with `languages: ["en"]` and one slide per kind and layout, using only the generic blocks, with "Placeholder title" and "Placeholder text" (FR-002).
- **Gate P1:** `npm run gate` (drift not run until T020); the strip diff against the template build is within tolerance.

## Phase P2: Motion module (branch `p2-motion`, base `p1-carry`)

- [ ] T015 [US2] Tests first: `tests/motion/constants.spec.ts` asserts the motion module's exported values equal those listed in `.local/origin-inventory.md` ("Motion"). It fails before T016.
- [ ] T016 [US2] Move the files listed under "Motion" in `.local/origin-inventory.md` into `src/motion/`: path moves, the rename, and the detach of the product's screen-switch, registry and config imports and calls (owner: "Detach them"). The selection indicator is included only if a file kept after T012 imports it. Each change is a row in `docs/carried.md`.
- [ ] T017 [US2] Point the carried deck, gate and boot imports at `src/motion/` (compose rows).
- **Gate P2:** `npm run gate`; the strip diff and constants are unchanged.

## Phase P3: Averlo ports and brand config (branch `p3-averlo`, base `p2-motion`)

- [ ] T018 [US2] Tests first: `scripts/check-ports.mjs` (the drift test, FR-009), a test that fails while `src/_origin-temp/` exists, and a contrast assertion (4.5:1) in the a11y spec.
- [ ] T019 [US2] `scripts/ports.manifest.json` (the entries of research R3 for averlo-web-transition @ `cfa3d61` and averlo-next-template @ `dc3b01d`) and `scripts/port-averlo.mjs` implementing R3a. It writes `docs/design-source.md`.
- [ ] T020 [US2] Run the port script. Add every recorded package at its lockfile version to `package.json` and `docs/licences.md`. Done when `check:ports` passes at 100% (SC-002).
- [ ] T021 [US2] Template-owned `src/app/globals.css`: imports Tailwind, then the ported `library.css`, then `src/styles/fonts.css` (R6) and `src/styles/tokens.css` (R7, mapping table in `docs/design-source.md`). Postcss config as in averlo-web-transition. Apply the ported font's variable on `<html>`.
- [ ] T022 [US3] `src/brand/config.ts` (data-model: brand, deckTitle, accent) and the "your logo" placeholder mark, with a licence row.
- [ ] T023 [US2] Compose the Averlo ports in the carried deck files in place of the temporary components: Button, Icon, IconSwap, Text, Panel, Dropdown with Listbox (downloads, and the language switcher when there are 2+ languages), Portal, focus, and wrap with the ported MotionProvider. Compose rows only.
- [ ] T024 Delete `src/_origin-temp/`. Remove the origin's `@radix-ui/react-dropdown-menu`, `@radix-ui/react-radio-group` and `@material-symbols/svg-400` if no file imports them; keep `@radix-ui/react-slot` if the closure recorded it. Update `docs/licences.md`.
- **Gate P3:** `npm run gate`, with every check run.

## Phase P4: Top bar (branch `p4-topbar`, base `p3-averlo`) [parallel with P5]

- [ ] T025 Upstream rename. In `averlo-questionnaire-template` (its own clone in the sources folder), on branch `rename-client-names`, rename every blocked term in the top bar's files and in the files they import (file names, identifiers, comments), with no other change, and open a PR there. Raise it with the owner (rule 4) and wait for the merge. Then add the merged commit to the port manifest.
- [ ] T026 [US2] Tests first: the bar spans the full width on every slide; pressing or dragging the navigator jumps slides; the footer shows its progress indicator and no divider (FR-012, FR-013); a DOM and screenshot parity test of the bar against the questionnaire's own top at 390 and 1440.
- [ ] T027 [US2] Add the questionnaire's header, progress navigator, progress model, wording modules, Logo and shell CSS (with the utility and foundation CSS their closure needs) to the manifest's entries, and run the port script. List the shell CSS's unscoped rules in `docs/design-source.md` (R4).
- [ ] T028 [US2] `src/deck/TopBar.tsx`: wrap in `.aq`, set the `--aq-*` variables from `src/brand/config.ts` the way the questionnaire does, and reproduce only the composition lines of the questionnaire's `react.tsx` (recorded by line range in `docs/design-source.md`), without the save chip and Review button. Pass the deck's copy through the wording context, and make `onNavigate` jump to a slide.
- [ ] T029 [US1] Put the deck stage below the bar and remove the footer divider (carried deck CSS, compose rows).
- **Gate P4:** `npm run gate`; every placeholder slide fits at 390 and 1440 (SC-005).

## Phase P5: Intro and hard-load screen (branch `p5-brand`, base `p3-averlo`) [parallel with P4]

- [ ] T030 [US3] Tests first: the Averlo mark shows by default in the intro and on the hard-load screen; brand `owner` without a mark shows the "your logo" placeholder; reduced motion skips the intro (FR-004, FR-004a, FR-005).
- [ ] T031 [US3] Intro and hard-load screen compose the brand mark (the ported Averlo `Logo` variant `mark`, or the owner's mark) in the orb's place, with every timing value kept (R9). Compose rows.
- **Gate P5:** `npm run gate`, including the intro strips.

## Phase P6: Slides and languages (branch `p6-slides`: branched from `p4-topbar`, with `p5-brand` merged in by a merge commit; conflicts are resolved only in files P6 owns)

- [ ] T032 [US4] Tests first: one language → no language switcher; two → the switcher appears and `?lang=` holds on the same slide (FR-007).
- [ ] T033 [US4] The language switcher condition in the menu (compose row).
- [ ] T034 [US1] The final placeholder deck (about 12 slides covering every kind, layout and generic block). The PDF is named from `deckTitle`.
- **Gate P6:** `npm run gate`.

## Phase P7: Docs and fresh copy (branch `p7-public`, base `p6-slides`)

- [ ] T035 [P] `LICENSE` (MIT, FR-020). Finish `docs/licences.md`, including the Averlo mark (the owner's brand asset, redistributable here only as a placeholder) and every ported notice.
- [ ] T036 [P] [US3] "Draft a deck from any source" in `process/workflows.md` (FR-016), plus `WORKFLOWS.md`, `docs/orchestration.md` and `tests/fixtures/sample-source.md` (generic sample text).
- [ ] T037 README: quickstart (SC-001), the presenting keys, the brand and language config, how a deck re-pins, re-targets or turns off the drift test (FR-009), and the gate.
- [ ] T038 [US3] Dry-run the content workflow on the sample source, and check every slide's text against it (SC-006). Record the result in the PR.
- [ ] T039 Fresh-copy check: clone the pushed repo into a new folder, `npm ci`, run it, step through, and time it against SC-001.
- **Gate P7:** `npm run gate` on the fresh clone; all PRs open; nothing merged by an agent.
