# Agent instructions

A public template for full-screen web slide decks (Next.js) built on the Averlo design system: a deck engine, intro, menu and overview, and a print view with PDFs, with placeholder slides.

Follow the [constitution](.specify/memory/constitution.md). Claude Code loads it into every session through the `SessionStart` hook in `.claude/settings.json`; other agents read it now, before any change. Read the [orchestration guide](docs/orchestration.md) before delegating.

- **Public by design:** no client material or secrets; fonts, images and third-party files only when their licence allows redistribution, listed in `docs/licences.md`. Run the public scan before any push.
- **Never invent content.** A deck's words come from its owner, talked through from any source; the template ships placeholders.
- **Spec or light path is your call, and it is recorded:** features run the full Spec Kit cycle with the owner's approval before implementing; defects and small tweaks take the light path. When unsure, spec.
- **Averlo design-system code is ported unchanged** at a pinned commit; a port that differs is a defect.
- **The deck's motion keeps close parity** with its polished values, proven by the frame diff.
- **Regression evidence before offering to land;** report anything not run as not run.
- **Push and open PRs freely once the gate passes; the owner merges.** Merge commits, never squash.
- Use [`WORKFLOWS.md`](WORKFLOWS.md) as a names-only menu; procedures live in [`process/workflows.md`](process/workflows.md).
