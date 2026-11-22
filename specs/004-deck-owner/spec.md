# Feature Specification: The deck owner's side

**Feature Branch**: `feat/004-deck-owner`

**Created**: 2026-11-22

**Status**: Draft

**Input**: Owner: "grill me on the fixes and spec out an implementer friendly side". The template is to be sent to a friend: "one setup prompt for his codex and the rest codex handles in a non technical way for him".

## Clarifications

### Session 2026-11-22 (grilling with the owner)

- Q: How does an agent know it's working on someone's deck, not on the template itself? → A: "Two sections in AGENTS.md": one for working on the template, one for making a deck; the agent picks by the request.
- Q: Which rules apply when making a deck? → A: "Light rules": only the owner's words; one plain question at a time; run the deck checks before showing; no specs or approvals for slides. The template's rules (ports unchanged, motion parity, the Spec Kit cycle) don't apply to a deck.
- Q: Which checks stay on in a deck? → A: "Build + fit + slide checks": lint and types, every slide fits at phone and desktop sizes, words only in `copy`, and the trace check. The motion baseline, the port drift test and the public scan are off for decks.
- Q: How does the gate know it's a deck? → A: "npm run check:deck": a separate command for decks; the template keeps `npm run gate`.
- Q: How does a non-technical owner's machine get set up? → A: "agent prompt": no setup script; the agent installs and starts everything by following the prompt and AGENTS.md's deck section.
- Q: Where does the one-paste prompt live? → A: "START.md + README top".
- Q: How does a deck get online? → A: "Vercel, agent-guided": the agent walks the owner through a free Vercel sign-in once, then deploys a shareable link when asked.
- Q: Which agents? → A: "Codex and Claude Code".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start with one paste (Priority: P1)

A non-technical owner makes a repository from the template, opens it in Codex or Claude Code, and pastes the prompt from START.md. The agent sets everything up on their computer (dependencies, the browser the checks need), starts the deck, and gives them a link to open. It asks only plain questions, one at a time.

**Why this priority**: This is the friend's whole entry point.

**Independent Test**: In a fresh copy on a clean machine, paste the START.md prompt into an agent. The deck runs and the owner gets a link without typing a command. Every question the agent asks is plain language.

**Acceptance Scenarios**:

1. **Given** a fresh copy and the START.md prompt, **When** the agent follows it, **Then** the deck runs locally and the owner gets the link.
2. **Given** the agent needs something from the owner, **When** it asks, **Then** it asks one plain question at a time and never asks the owner to type a command.

---

### User Story 2 - Make the deck with light rules (Priority: P1)

The owner hands over their material. The agent follows AGENTS.md's deck section:

- it talks the material through;
- it builds slides from the presets with the owner's words only;
- it runs `npm run check:deck` before showing anything;
- it never asks for specs or approvals for slides.

**Why this priority**: The template's own rules would turn every slide into a spec and an approval.

**Independent Test**: Ask an agent in a deck copy to add a slide. It reads the deck section, adds the slide file with no spec, runs `npm run check:deck`, and shows the result.

**Acceptance Scenarios**:

1. **Given** a deck request, **When** the agent reads AGENTS.md, **Then** it follows the deck section and not the template's Spec Kit rules.
2. **Given** a new slide, **When** `npm run check:deck` runs, **Then** it checks build, fit, words-in-copy and trace, and skips the motion, drift and public-scan checks.

---

### User Story 3 - Share it online (Priority: P2)

When the owner says the deck is ready, the agent walks them through a free Vercel sign-in once, deploys, and gives them a link to share. Later changes go out the same way when the owner asks.

**Why this priority**: The friend needs a link to send, and the PDF alone isn't the deck.

**Independent Test**: Follow the deck section's publish procedure in a fresh copy with a new Vercel account. The owner gets a working link, and the PDFs download from it.

**Acceptance Scenarios**:

1. **Given** a finished deck, **When** the owner asks to share it, **Then** the agent guides the sign-in, deploys, and returns the link.
2. **Given** a later change, **When** the owner asks to update it, **Then** the agent deploys again to the same link.

### Edge Cases

- **No Node on the machine:** the agent explains in plain words how to install it, or installs it where it can, then continues.
- **A check fails:** the agent fixes it before showing, and never shows a broken slide as done.
- **A public deck repo with private names:** the agent offers to turn the public scan on with the owner's list (it's opt-in for decks).
- **The owner asks for a new kind of visual:** the agent composes it in the deck, as the deck-visuals skill describes, with no spec.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: AGENTS.md MUST have two sections: working on the template (today's rules), and making a deck (light rules). Each says when it applies.
- **FR-002**: The deck section MUST state the light rules: only the owner's words and figures; one plain question at a time; never ask the owner to type commands; run `npm run check:deck` before showing; no specs or approvals for slides; the template's port, motion and Spec Kit rules don't apply.
- **FR-003**: `npm run check:deck` MUST run lint and types, the build, the fit check at phone and desktop sizes, the words-in-copy check and the trace check. It MUST NOT run the motion strips, the drift test or the public scan, and MUST report each check as passed, failed or not run.
- **FR-004**: `npm run check:deck` MUST pass on a fresh copy of the template with no `.local/` files.
- **FR-005**: START.md MUST hold one prompt to paste into Codex or Claude Code. It covers setting up (dependencies, the check browser), starting the deck, talking the material through, building slides with the presets, the checks, and publishing. The README MUST open with a pointer to it.
- **FR-006**: The deck section MUST describe setup steps an agent can follow on macOS, Linux and Windows, including installing the check browser.
- **FR-007**: The deck section MUST describe publishing to Vercel: a one-time sign-in guided by the agent, deploying, and redeploying to the same link.
- **FR-008**: The deck section MUST say how to turn on the public scan with the owner's own list, for a public deck repo.
- **FR-009**: Everything MUST work the same in Codex and Claude Code: the skills exist in both `.agents/skills/` and `.claude/skills/`.

### Key Entities

- **START.md**: the one prompt.
- **AGENTS.md deck section**: the light rules, setup, checks and publishing.
- **`check:deck`**: the deck's check command.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A non-technical owner goes from "Use this template" to a running deck by pasting one prompt, typing no commands.
- **SC-002**: `npm run check:deck` passes on a fresh copy with no local files.
- **SC-003**: An agent asked to add a slide in a deck copy writes no spec and asks for no approval.
- **SC-004**: The owner gets a shareable link from one request, after a single sign-in.

## Assumptions

- Feature 003 (slides as JSX) lands first: the deck checks use its words-in-copy and trace checks.
- The template keeps `npm run gate` and its rules for work on the template itself.
- Vercel's free tier is enough for a deck.
