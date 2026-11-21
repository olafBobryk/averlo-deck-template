# Averlo Deck Template Constitution

These principles govern agents working in this repository, a public template for full-screen web slide decks built on the Averlo design system. "The owner" is whoever owns the repository or deck being worked on. [AGENTS.md](../../AGENTS.md) is the short entry point, the [workflow menu](../../WORKFLOWS.md) lists the procedures, and the [orchestration guide](../../docs/orchestration.md) says how work is delegated. The whole constitution is loaded into every Claude Code session by the `SessionStart` hook in [`.claude/settings.json`](../../.claude/settings.json), so every rule here is in context at all times.

## Core Principles

### I. Decisions are recorded, not assumed

Each decision is written in one place. A decision about one feature lives in that feature's spec (its grilling `Session` block). Project-wide decisions go in [docs/decisions/decisions.md](../../docs/decisions/decisions.md) with date and source, linking to specs rather than copying them. Open questions are resolved by grilling the owner, and [open-questions.md](../../docs/decisions/open-questions.md) holds them until then. A recommendation, an agent proposal, a passing review, silence or a timeout is not the owner's selection. Materially different scope, design, architecture or git choices need the owner's explicit answer, and an answer approves only the decision it covers.

### II. Public by design

This repository is public and is a GitHub template. Nothing private goes in it: no client or product material, no secrets, and no names or facts from the projects a deck was derived from. Every font, image and third-party file is listed with its source and licence in [docs/licences.md](../../docs/licences.md), and is committed only when its licence allows redistribution. Before any push, the public scan (`npm run scan:public`) passes; a file whose licence is unknown is raised with the owner before it is pushed.

### III. Content is never invented

A deck's words come from its owner. The agent takes any source material (notes, documents, transcripts) and builds the deck by talking it through with the owner, and it never writes slide content, figures or claims of its own. The template itself ships placeholder slides only. A new deck's brand defaults to Averlo; for any other brand, the agent asks the owner for the assets and never makes them up.

### IV. Spec first for anything a viewer sees

The agent decides which path a change takes, and records the choice. A feature, meaning anything that changes what a viewer sees or does, or how the template is used, runs the Spec Kit cycle: `grilling` with the owner on the material decisions → `/speckit-specify` → `/speckit-clarify` when gaps remain → `ponytail` pass → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → the owner approves the spec and tasks → `/speckit-implement`. The spec records the grilling session as `### Session YYYY-MM-DD (grilling with the owner)` Q→A bullets, and the plan has a `## Ponytail pass — removed or deferred` section. A defect against an agreed spec, a copy or setting tweak, or a single small change takes the light path: one task line in the active feature's `tasks.md`, the change, and the regression checks. When it is unclear which path applies, take the spec path.

### V. No change lands without its regression evidence

Before work is offered to land, the gate passes: `npm run check` (lint, format, types), `npm run test:smoke` against a local production build at 390 px and 1440 px, the ports drift test (Principle VIII), the motion frame diff (Principle IX), and the public scan (Principle II). Visual changes attach before/after screenshots. A check that could not run is reported as not run, never as passed. Baselines are recorded on the machine that runs the gate.

### VI. The owner thread orchestrates; subagents do the work

The owner thread (the session the owner talks to) holds the plan, the decisions, the conversation with the owner and the disposition of everything returned. It delegates implementation, research and review to subagents with explicit file ownership, and runs independent work in parallel; two writers never own the same file at once; reviewers are read-only and do not see the implementer's conclusion. A subagent's report is a claim: the owner thread verifies it against the diff and the checks before reporting it done. An unattended run implements only tasks from an approved `tasks.md`. After three failed attempts at a phase, it parks that phase as a draft pull request saying what failed and why, continues with phases that do not depend on it, and notifies the owner.

### VII. Granular commits; the owner merges

Work happens on a branch with small plain-English commits (no Conventional Commit prefixes). Agents may push branches and open pull requests on their own once the gate passes. Merging into `main` is the owner's approval, always with a merge commit, never squash. Changing the repository's visibility or template setting, publishing a release, or deploying is a separate, explicit go.

### VIII. The Averlo design system is the source

The template is built on the Averlo design system's real components, tokens and helpers, not a re-theme. A port is a whole, unchanged copy of its source files and of everything they import, made at a pinned commit by a port script and listed with its source commit in [docs/design-source.md](../../docs/design-source.md). Re-implementing, simplifying or partially copying a ported component is a defect. The ports drift test fails if a ported file differs from its source. Within the template, changing a ported file needs the owner's explicit answer, and template-owned code composes ports without editing them. This binds the template's build only: a deck made from the template may change its look and its ports. Keyboard access, visible focus, labelled icon buttons and 4.5:1 text contrast are required.

### IX. The deck's motion is its own, and polished

The deck's motion (slide step, swipe, menu and overview, intro) lives in the template's own motion module, with its values kept as polished. Averlo's motion may inspire, but it does not replace a polished value without the owner's answer. Parity is proven, not claimed: per-frame strips and timing values are recorded as a baseline before a motion change and diffed after it, and drift over the recorded tolerance fails the gate. Reduced motion is respected everywhere.

### X. Justify complexity

A new dependency needs a stated requirement. Order: reuse a port, then the framework, then an installed dependency, then custom code. The plan records what the `ponytail` pass removed or deferred.

### XI. Tests first from the spec

A feature's tests are derived from its spec's acceptance scenarios and seen failing before the implementation that makes them pass. The spec stays the living behaviour contract.

## Documentation and delivery

**Layout.** `src/app` routes (deck, print); `src/deck` the deck engine; `src/gate` the intro; `src/boot` the hard-load screen; `src/motion` the deck's motion module; ported code at its source-relative paths (`src/components`, `src/hooks`, `src/lib`, `src/config`, `src/font`, and `src/questionnaire` for the questionnaire's top bar; see [design-source.md](../../docs/design-source.md)); template-owned `src/brand` and `src/styles`; `content/` a deck's source material and slides; `docs/decisions` the decision log; `specs/NNN-*` features; `scripts` build and port helpers; `tests` the gate. Rendered PDFs are build output, not committed.

**Spec Kit.** Official github/spec-kit v1.4.1, pinned in [`scripts/specify.sh`](../../scripts/specify.sh), integrations `claude` (`.claude/skills/speckit-*`) and `codex` (`.agents/skills/speckit-*`). Keep upstream skills, templates and scripts unchanged; refresh them only through `scripts/specify.sh integration upgrade`. Each feature lives in `specs/NNN-kebab-name/` with `spec.md`, `plan.md`, `tasks.md`, and `references/` for screenshots and evidence.

**Workflows.** [`WORKFLOWS.md`](../../WORKFLOWS.md) is a names-only menu; each entry links its procedure in [`process/workflows.md`](../../process/workflows.md).

**Skills.** These skills apply when installed:

| Skill | Use |
| --- | --- |
| `grilling` | Interviewing the owner before a material decision (Principles I and IV). |
| `ponytail` | Keeping every plan and change minimal (Principle X). |
| `speckit-*` | The spec → plan → tasks → implement cycle (Principle IV). |
| `workflows` | Maintaining the workflow menu and its procedures. |
| `independent-review` | A read-only second opinion on a risky change before it is offered to land. |

Resolve each skill at use time; if one is unavailable, follow the linked procedure, report the gap and do not claim the skill ran.

## Governance

These principles record the owner's standing instructions. The owner's corrections take precedence: record each with its date, and in the same change reconcile every rule that conflicts with it. Record substantive changes here and increment the version: major for incompatible rule changes, minor for additions, patch for clarifications. 1.0.0 adopted 21 November 2026. 1.0.1 (21 November 2026): Principle VIII says ports are whole, unchanged copies, and that the Averlo look binds the template's build, not decks made from it. 1.0.2 (21 November 2026): the Layout paragraph lists every folder ports and template-owned code live in.

**Version**: 1.0.2 | **Ratified**: 2026-11-21 | **Last Amended**: 2026-11-21
