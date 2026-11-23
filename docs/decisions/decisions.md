# Decisions

Project-wide decisions, one line each, linking to where the owner gave the answer. Written only by the owner thread (constitution I).

- 2026-11-21 — The template is a reusable deck template built on the Averlo design system itself, not a re-theme — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — A new public GitHub repository, marked as a template, with fresh history — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — Averlo design-system code comes in as pinned, unchanged ports with a drift test — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — The Averlo look binds the template's build only; a deck made from it may change its look and its ports — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — Fonts come from averlo-next-template; font files that may not be redistributed are excluded — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — The deck's motion is kept at close parity, proven by a per-frame baseline — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — One language by default, more by configuration — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — An unattended phase that fails its gate 3 times is parked as a draft PR — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — MIT licence; the Averlo name and mark are excluded as brand assets — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — The agent pushes the setup commits to `main` once; everything after arrives through PRs the owner merges — [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)
- 2026-11-21 — The template is deployed on Vercel (team averloco) and its production link, averlo-deck-template.vercel.app, stays public; later deploys are previews unless the owner says otherwise — owner in session ("Yes, Vercel preview", then "Keep it public")
- 2026-11-21 — The agent merged the questionnaire rename PR (#79, merge commit `756be64`) with a merge commit, on the owner's explicit permission for that one merge; the port pins to it — owner in session ("You merge it")
- 2026-11-22 — For this run, the agent may merge into `main` every phase PR whose gate passed, in phase order, with merge commits (owner: "you can merge what green btw or whats ready to merge aswell"); the owner merging stays the rule otherwise — owner in session
- 2026-11-22 — For the feature 002 run, the agent may merge each phase PR into `main` once its gate passes, in order, with merge commits (owner: "Yes, merge green") — owner in session
- 2026-11-22 — The final build was promoted to the public production address (owner: "Promote final build") — owner in session
- 2026-11-22 — For the feature 003 run, the agent may merge each phase PR into `main` once its gate passes, in order, with merge commits (owner: "Yes, merge green") — owner in session
- 2026-11-23 — Main with features 003 and 004 was promoted to the public production address (owner: "Promote main") — owner in session
