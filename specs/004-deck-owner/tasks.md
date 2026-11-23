# Tasks: The deck owner's side

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md).

**Status**: Approved by the owner on 2026-11-22 ("Approve, build after 003"). Starts after feature 003 lands; merge-green permission as for 003.

## Rules for every task

These are the same as features 002 and 003: no blocked terms; ports unchanged; rows for carried files; tests first; `npm run gate` per phase; stacked branches; owner questions through the question tool.

## Phase D0: check:deck (branch `d0-check`, base `main` after 003)

- [x] T400 Tests first. `tests/tools/check-deck_test.mjs`:
  - `check:deck` runs check, build, fit, words-in-copy and trace;
  - it never runs strips, ports or scan;
  - it reports each check.
  
  The fresh-copy script runs `check:deck` in a clone without `.local/`, and it passes.
- [x] T401 `scripts/check-deck.mjs` and `npm run check:deck` (research R1). Tag the deck-relevant Playwright specs so they run alone.
- [x] T402 Light path (a defect in the gate's tests): the two specs that start a scratch dev server (`tests/slides/files.spec.ts`, `tests/slides/presets.spec.ts`) take turns through a lock in `tests/slides/scratch.ts`. Next runs one dev server per folder, and the D0 gate's first run failed when the two ran at once.
- **Gate D0:** `npm run gate`; then `check:deck` passes in a fresh clone.

## Phase D1: Docs and the amendment (branch `d1-docs`, base `d0-check`)

- [x] T410 Tests first. Docs tests check that:
  - AGENTS.md has both sections;
  - the deck section states every rule of FR-002, setup (FR-006), saving (FR-010), publishing (FR-007) and the opt-in scan (FR-008);
  - START.md holds one prompt;
  - the README opens with the pointer.
- [x] T411 AGENTS.md "Making a deck" section, START.md, the README pointer, and in `process/workflows.md`: "Set up a deck", "Save and share", "Turn on the public scan".
- [x] T412 Constitution amendment 1.1.0 (research R4), with the changelog citing the owner.
- [x] T413 Dry run: in a fresh clone, an agent follows START.md. Record what it did and asked, and fix any step that needed the owner to type a command.
- **Gate D1:** `npm run gate`; `check:deck` in the fresh clone.

## After the dry run (light path)

- [x] T414 The owner's answers of 2026-11-23 (spec, Session 2026-11-23): START.md and "Set up a deck" say the Codex or Claude desktop app clones the repository; on Linux the agent gives the owner the one `sudo` command and says why; AGENTS.md names that one exception; the SessionStart hook in `.claude/settings.json` says the constitution binds work on the template and a deck follows AGENTS.md.
