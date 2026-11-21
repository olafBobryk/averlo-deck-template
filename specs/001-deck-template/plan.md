# Implementation Plan: Averlo deck template

**Branch**: `feat/001-deck-template` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-deck-template/spec.md`

## Summary

Build a public deck template from a private client deck (the origin deck):

- **Carried:** the engine, intro, menu, overview, print view and hard-load screen, changed only by listed renames, detaches and compositions.
- **Motion module:** the origin's motion files come over whole, renamed and detached.
- **Averlo ports:** every visible component becomes a whole, unchanged port of the Averlo design system. The questionnaire's top bar is ported as is, after its client names are renamed upstream. Fonts are ported from averlo-next-template.
- **Parity:** proven by numeric motion strips recorded from the unchanged origin on the gate machine before any change.

## Technical Context

**Language/Version**: TypeScript 5.9.3 on Node 24 (`.nvmrc` = 24)

**Primary Dependencies**:
- Kept exact from the origin: next 16.4.5, react and react-dom 19.3.1, motion 14.7.1 (R2).
- Added by the ports, at the version in each source's lockfile: tailwindcss and @tailwindcss/postcss, clsx, class-variance-authority, lucide-react, @phosphor-icons/react, @radix-ui/react-slot, and any other package the closure records.
- Removed in P3 if no file imports them: the origin's @radix-ui/react-dropdown-menu and @radix-ui/react-radio-group, and @material-symbols/svg-400.

**Storage**: none. Slides and configuration are source files.

**Testing**: @playwright/test 1.64.1 and @axe-core/playwright 4.14.0, plus node scripts for the drift test and the public scan. `npm run gate` runs everything and reports each check as passed, failed or not run.

**Target Platform**: modern desktop and phone browsers. The gate runs on the gate machine with headless Chromium.

**Project Type**: web application (a single Next.js app, with print and PDF output)

**Performance Goals**: motion at display rate; the intro's timing (about 4.6 s) unchanged.

**Constraints**:
- Ports are byte-identical to their pinned sources (FR-009, FR-009a), and carried files change only as listed (FR-009b).
- No blocked term appears in files or history (FR-017).
- At most 2 implementers run in parallel (memory on the gate machine).

**Scale/Scope**: about 40 carried files, 30 to 60 ported files, about 12 placeholder slides, about 10 test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| I Decisions recorded | Owner answers are in spec.md's Session blocks. P0 creates `docs/decisions/decisions.md` and `open-questions.md`. Every "raise with the owner" means: add to open-questions.md and park the phase. | Pass |
| II Public by design | Fresh history. Blocked terms live in an owner-approved, ignored list (R5). `docs/licences.md` and the licence-coverage scan exist from P0, and each task that adds a file or package lists it. The origin's inventory stays local. | Pass |
| III Content never invented | Placeholder text only. The content workflow is a procedure. | Pass |
| IV Spec first | The spec is approved. This plan and tasks.md wait for the owner's approval. | Pass (pending approval) |
| V Regression evidence | Every phase ends with `npm run gate` (FR-021). A check whose tool doesn't exist yet is reported as not run, naming the task that creates it. Visual phases attach before/after screenshots. | Pass |
| VI Orchestration | Phases own disjoint files. At most 2 parallel implementers; 3 tries, then park. | Pass |
| VII Commits and merge | The owner approved creating the repo public and as a template ("New GitHub repo now"; "push pr and public template"), and one agent push of the setup commits to `main` ("Agent pushes setup once"). Everything after that arrives through stacked PRs the owner merges. | Pass |
| VIII Averlo is the source | One port script and manifest for all three sources. Drift test. No port is edited. Template-owned CSS loads after the ports. | Pass |
| IX Motion parity | Strips defined per element and value (R8), with tolerance from 3 runs. Timing constants are compared exactly. Reduced motion is tested. | Pass |
| X Justify complexity | See the ponytail pass. Dependencies come only from the port closure. | Pass |
| XI Tests first | Each phase writes or adapts its tests first and sees them fail. The exception is the strip diff, which must pass on the unchanged code as a regression baseline. | Pass |

Re-check after design: passing. Watch items: motion 14.7.1 against the ports (R2); the questionnaire's unscoped CSS rules (R4); the questionnaire's `.js` import specifiers (R4).

## Ponytail pass — removed or deferred

- **Removed:**
  - Every product-specific feature, block, screen and alternate deck of the origin (listed locally).
  - The second language of the origin.
  - The origin's language toggle control. The ported Averlo Dropdown is the language switcher, and it shows only with 2+ languages.
  - The origin's icon set; Averlo's icons replace it.
  - The questionnaire's save chip and Review button.
  - The product's screen-switch, registry and config code (detached).
- **Not ported:**
  - Averlo's reveal, scroll and auto-cycle motion and its gsap runtime.
  - Fonts that may not be redistributed.
  - Storybook.
- **Deferred:**
  - CI on GitHub (the scan needs the local term list).
  - Any deploy.
  - Automation of the content workflow beyond its procedure.
  - Light theme.

## Project Structure

### Documentation (this feature)

```text
specs/001-deck-template/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/deck-config.md
├── checklists/requirements.md
├── references/strips/        # motion baselines (numbers only)
├── references/screens/       # before/after screenshots per phase
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/                 # carried routes; template-owned globals.css
├── deck/                # carried engine; template-owned slides.ts and TopBar.tsx
├── gate/                # carried intro
├── boot/                # carried hard-load screen
├── motion/              # carried motion module (renamed, detached)
├── components/ hooks/ lib/ config/ font/   # Averlo ports, unchanged, at source-relative paths
├── questionnaire/       # questionnaire top-bar ports, unchanged
├── brand/               # template-owned brand config and "your logo" placeholder
└── styles/              # template-owned fonts.css and tokens.css
scripts/  port-averlo.mjs (+ ports.manifest.json), check-ports.mjs, scan-public.mjs, render-pdf.mjs (carried), gate.mjs, specify.sh
tests/    carried and adapted specs, baseline recorder, strip diff
docs/     design-source.md, licences.md, carried/<area>.md, decisions/ (decisions.md, open-questions/), orchestration.md
process/workflows.md, WORKFLOWS.md, README.md, LICENSE
```

**Structure Decision**: a single Next.js app. Ports keep source-relative paths so the drift test compares them one to one. Template-owned code sits only in `src/app/globals.css`, `src/deck/slides.ts`, `src/deck/TopBar.tsx`, `src/brand`, `src/styles`, the listed compose points in carried files, `scripts` and `tests`.

## Phases (stacked branches; the owner merges each PR into `main` in order)

**Setup on `main`** (the one approved agent push): the commits "Ignore secrets, local documents and tool output", "Install Spec Kit v1.4.1 …", "Adopt the template's constitution …", "Specify, plan and break down the deck template (feature 001)", and the follow-up commits on `feat/001-deck-template` up to the owner's approval of tasks.md. `p0-baseline` branches from `main`. The scan for that push runs from P0's working tree over `git log --all -p`.

| Phase | Branch (base) | Owns |
|---|---|---|
| P0 Baseline, tooling, public | `p0-baseline` (main) | tooling, `scripts/gate.mjs`, `scan-public.mjs`, `LICENSE`, `docs/licences.md`, `docs/decisions/*`, `docs/carried/tests.md`, `docs/orchestration.md` (minimal), `tests/baseline/*`, `tests/motion/strips.spec.ts`, `references/strips/*` |
| P1 Carry and strip | `p1-carry` (p0) | `src/app`, `src/deck`, `src/gate`, `src/boot`, `src/motion` (rename only), `src/_origin-temp`, `src/brand/placeholder`, `docs/carried/{app,deck,gate,boot,motion,tests}.md`, `scripts/render-pdf.mjs`, `tests/*` adapted |
| P2 Motion module | `p2-motion` (p1) | `src/motion/*` (detach), `docs/carried/motion.md`, `tests/motion/constants.spec.ts` |
| P3 Averlo ports and brand | `p3-averlo` (p2) | port script and manifest, `check-ports.mjs`, ported folders, `src/styles`, `src/app/globals.css`, `src/brand/config.ts`, `docs/design-source.md`, compose rows in `docs/carried/{app,deck}.md` |
| P4 Top bar | `p4-topbar` (p3) | the upstream rename (in averlo-questionnaire-template), `src/questionnaire/*`, `src/deck/TopBar.tsx`, deck layout and footer CSS, `docs/carried/deck.md` |
| P5 Intro and hard-load screen | `p5-brand` (p3) | `src/gate`, `src/boot`, `docs/carried/{gate,boot}.md` |
| P6 Slides and languages | `p6-slides`: from `p4-topbar`, with `p5-brand` merged in by a merge commit. Its PR targets `p4-topbar` and is retargeted to `main` once P4 and P5 are merged | `src/deck/slides.ts` (template-owned; imports the carried types), the language switcher condition, the PDF name |
| P7 Docs and fresh copy | `p7-public` (p6) | README, `process/workflows.md`, `WORKFLOWS.md`, `docs/orchestration.md` (complete), `tests/fixtures/*`, `tests/docs/*` |

Open questions are one file each under `docs/decisions/open-questions/`, so parallel phases never write the same file; `decisions.md` is written only by the owner thread. Every phase ends with `npm run gate`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Two styling systems (Tailwind v4 for the ports, CSS modules for the carried deck) | Ports stay unchanged, and the carried motion CSS stays as is | Rewriting either side breaks FR-009a or FR-009b |
| A carried, renamed copy of the origin's motion files | Motion parity (FR-014), chosen by the owner | Re-implementation was offered and declined |
| A change in another repository (questionnaire rename) | The ports must be byte-identical and free of client names | The owner chose "Rename upstream first" |
