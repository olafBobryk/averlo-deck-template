# Implementation Plan: Deck visuals

**Branch**: `feat/002-deck-visuals` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-deck-visuals/spec.md`

## Summary

Add a library of preset visuals and a skill that picks them:

- **Presets:** template-owned components in `src/presets/`, composed from the Averlo ports, each with a content schema and an example. Charts use recharts.
- **Blocks:** the presets plug into feature 001's content model as new block types, so a deck uses them the way it uses `points` or `steps`.
- **Gallery:** a separate `/gallery` deck shows every preset. Its own PDF leaves the default deck, and so its motion strips, unchanged.
- **Skill:** `deck-visuals`, for Claude Code and Codex. It reads source material, proposes a preset per slide from the content's structure, drafts it with the owner's words and figures, and keeps only what the owner confirms. It composes a deck-local visual when nothing fits, and offers image generation without assuming a generator.

## Technical Context

**Language/Version**: TypeScript 5.9.3 on Node 24, as in feature 001.

**Primary Dependencies**:

- Feature 001's stack.
- recharts 3.10.1, a direct dependency at averlo-next-template's lockfile version (research D1).
- No other new package.

**Storage**: none. Presets, examples and slides are source files; images live under `public/`.

**Testing**: @playwright/test, as in feature 001. The gallery is checked for fit, contrast and the PDF. `node --test` tool tests cover the preset registry, the skill's sync check and the trace rule. The gate is unchanged.

**Target Platform**: the same browsers as feature 001.

**Project Type**: the same single Next.js app.

**Performance Goals**: a preset slide renders and enters within the deck's existing motion timing. Charts draw without blocking the slide step.

**Constraints**:

- Ports stay unchanged.
- The default deck and its motion strips stay unchanged.
- Every text and figure traces to the owner.
- No blocked terms.
- Every image has a licence row.

**Scale/Scope**: 18 presets in 4 families, about 40 gallery slides (an example and an alternate each), 1 skill in two copies, about 8 test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| I Decisions recorded | The owner's answers are in the spec's grilling session. Open questions go to `docs/decisions/open-questions.md` through the owner thread. | Pass |
| II Public by design | recharts and every image get licence rows. Generated images are recorded with their generator's terms. The gallery uses placeholders only. | Pass |
| III Content never invented | The skill only arranges the owner's words and figures, and asks for anything missing. The trace check covers chart data and labels (FR-016). | Pass |
| IV Spec first | The spec is written and the owner was grilled. This plan and its tasks wait for the owner's approval. | Pass (pending approval) |
| V Regression evidence | Every phase ends with `npm run gate`. The gallery adds fit, contrast and PDF checks. Visual phases attach screenshots. | Pass |
| VI Orchestration | Phases V1–V3 own disjoint folders, with at most 2 implementers at once. | Pass |
| VII Commits and merge | Stacked branches. The owner merges, unless they grant merging again. | Pass |
| VIII Averlo is the source | Presets compose the ported components and tokens, and no port is edited. averlo-next-template's chart code is a page, not a reusable component, so recharts comes in as a dependency, not a port (research D1). | Pass |
| IX Motion | Presets enter with the deck's existing block motion. The default deck is unchanged, so the strips are untouched. | Pass |
| X Justify complexity | The one new dependency is recharts, which the owner chose. The ponytail pass is below. | Pass |
| XI Tests first | Each phase writes its gallery and registry tests first and sees them fail. | Pass |

## Ponytail pass — removed or deferred

The `ponytail` skill is not installed in this environment. Its minimalism was applied by hand, and this gap is reported.

- **Removed:**
  - A separate visual DSL or config language: presets are ordinary blocks in `slides.ts`.
  - Automatic image fetching or stock search: only the owner's images or an owner-approved generator.
  - Chart interactivity, such as tooltips and legends that toggle: slides are presented, not explored.
  - A per-preset theming API: presets take content only (FR-002).
- **Not built:**
  - A wrapper around image generators: the skill asks the owner which one they have and uses it as a tool at that point.
- **Deferred:**
  - More chart kinds (area, scatter, stacked) until a deck needs them; the promotion procedure covers them.
  - Animating chart data in, beyond the block's existing entrance.

## Project Structure

### Documentation (this feature)

```text
specs/002-deck-visuals/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/presets.md, contracts/skill.md
├── checklists/requirements.md
├── references/screens/       # gallery screenshots per phase
└── tasks.md
```

### Source Code (repository root)

```text
src/presets/                  # template-owned presets, composing Averlo ports
├── registry.ts               # every preset: name, family, schema, example
├── charts/  (Bar, Line, Donut, Stat)
├── diagrams/ (Flow, Timeline, Cycle, OrgChart, CompareTable, Matrix)
├── text/    (Quote, Statement, Agenda, TwoColumn, ImageText)
├── images/  (FullBleed, Grid, Captioned, ImagePlaceholder)
└── gallery.ts                # the gallery deck's slides (placeholders only)
src/deck/visuals/             # a deck's own composed visuals (empty in the template)
src/app/gallery/              # the /gallery route (template-owned)
.claude/skills/deck-visuals/  # the skill (SKILL.md + references/)
.agents/skills/deck-visuals/  # the same skill for Codex
scripts/presets-doc.mjs       # writes the skill's preset reference from the registry
tests/presets/*.spec.ts, tests/tools/presets_test.mjs
```

**Structure Decision**:

- **Presets:** in `src/presets/`, template-owned, so a deck may change them.
- **Blocks:** they plug in through new block types in the carried `src/deck/content.ts` and through `SlideBody.tsx`'s block switch. These are compose rows, as in feature 001.
- **Gallery:** its own route, reusing the engine through `DeckContext`, so the default deck stays as it is.

## Phases (stacked branches; the owner merges)

| Phase | Branch (base) | Owns |
|---|---|---|
| V0 Model, registry, gallery | `v0-model` (main) | block types and the `custom` block (compose in `content.ts`, `SlideBody.tsx`), `src/presets/registry.ts`, `src/presets/gallery.ts`, `src/app/gallery/`, `/print` gallery compose, preset test harness |
| V1 Charts and stats | `v1-charts` (v0) | recharts and its licence row, `src/presets/charts/*`, their gallery slides |
| V2 Diagrams | `v2-diagrams` (v0) [parallel with V1] | `src/presets/diagrams/*`, their gallery slides |
| V3 Text and image slides | `v3-text-images` (v0) | `src/presets/text/*`, `src/presets/images/*`, the image placeholder, their gallery slides, image licence checks |
| V4 The skill | `v4-skill`: from `v1-charts`, with V2 and V3 merged in | both skill copies, `scripts/presets-doc.mjs`, the sync test, compose-per-deck and promotion procedures, the trace check extended to visuals (FR-016), a dry run on the sample source |
| V5 Docs | `v5-docs` (v4) | README, `process/workflows.md` (Draft a deck uses the skill), `WORKFLOWS.md` |

Every phase ends with `npm run gate`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| A new dependency (recharts) | Chart presets (FR-001, FR-005), chosen by the owner | Hand-drawn SVG was offered; the owner chose recharts |
| A second deck route (`/gallery`) | Every preset shown and tested (FR-004) without changing the default deck or its motion strips | Adding about 21 preset slides to the default deck would change what every new deck starts with |
