# Implementation Plan: The deck owner's side

**Branch**: `feat/004-deck-owner` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

## Summary

The work is docs and one check command, with no engine change:

- AGENTS.md gains a "Making a deck" section with the light rules.
- START.md holds the one paste.
- `npm run check:deck` runs only the deck's checks and passes on a fresh copy with no `.local/`.
- The constitution is amended (1.1.0) so its rules bind template work and decks follow AGENTS.md.
- The deck section covers setup, saving (commit and push), publishing to Vercel and the opt-in public scan.

## Technical Context

- **Language:** TypeScript and Node 24, as before. No new dependency.
- **Testing:**
  - a node test that `check:deck` runs the right checks and passes in a fresh clone without `.local/`;
  - docs tests that START.md and AGENTS.md's deck section cover FR-002 to FR-010;
  - the fresh-copy script extended to run `check:deck`.
- **Constraints:** depends on feature 003, for the words-in-copy and trace checks. The template's `npm run gate` is unchanged.

## Constitution Check

| Principle | How this plan complies | Status |
|---|---|---|
| I Decisions recorded | Grilling and clarify are in the spec. The amendment's changelog cites the owner. | Pass |
| II Public by design | No content. The public scan stays on for the template; it is opt-in for decks. | Pass |
| III Content never invented | The deck rules keep "only the owner's words". | Pass |
| IV Spec first | The full cycle; the amendment states where its rules apply. | Pass (pending approval) |
| V Regression evidence | `npm run gate` for this change. `check:deck` is proven on a fresh clone. | Pass |
| VI–XI | Unchanged; there is one implementer. | Pass |

## Ponytail pass — removed or deferred

The ponytail skill is not installed; this pass was done by hand.

- **Removed:** a setup script (owner: "agent prompt"); a deck-mode flag file (owner: "Two sections in AGENTS.md").
- **Deferred:** other hosts besides Vercel; a GUI for non-agent owners.

## Phases

| Phase | Branch (base) | Owns |
|---|---|---|
| D0 `check:deck` | `d0-check` (main, after 003) | `scripts/check-deck.mjs`, the `package.json` script, tests |
| D1 Docs and amendment | `d1-docs` (d0) | AGENTS.md deck section, START.md, the README pointer, the constitution 1.1.0, `process/workflows.md` (setup, save, publish, the opt-in scan), docs tests, the fresh-copy run |
