# Feature Specification: Averlo deck template

**Feature Branch**: `feat/001-deck-template`

**Created**: 2026-11-21

**Status**: Approved by the owner on 2026-11-21 ("Approve spec"). Revised the same day after `/speckit-analyze`, with the owner's answers recorded below.

**Input**: User description: "Turn an existing polished client deck into a product-neutral, public, reusable deck template that uses the Averlo design system for real (not a re-theme), keeps the deck's polished motion at close parity, and starts any new deck by talking its source material through with an agent."

## Terms

- **Origin deck**: the private client deck this template is built from. It is never named in this repository.
- **Port**: a whole copy of files from a pinned source commit, made by the port script.
- **Carried file**: a file from the origin deck, kept as it is except for listed rename, detach, compose and redact changes.
- **Hard-load screen**: the screen shown while the deck loads again later in a session.
- **Language switcher**: the menu control for choosing a language.
- **Strip diff**: the comparison of recorded per-frame motion values against the baseline.
- **Gate machine**: the machine that runs the gate and records the baselines.

## Clarifications

### Session 2026-11-21 (grilling with the owner)

- Q: What is the template for? → A: A reusable deck template, with languages optional, built on the Averlo design system itself rather than a re-theme.
- Q: How does the design system come in? → A: A pinned, unchanged copy with a drift test.
- Q: Motion the design system has no token for? → A: Keep the origin deck's motion, gathered into the template's own motion components, at close parity: its details are carefully polished.
- Q: How is parity proven? → A: A per-frame baseline recorded before any change, diffed after each phase.
- Q: Which features stay? → A: The intro, the print view with PDFs, and the menu and overview. The origin's product-specific features are removed. The intro gets a "your logo" placeholder and an Averlo placeholder: Averlo by default, otherwise the deck owner's brand, with the agent asking for the assets.
- Q: How does a deck's content get in? → A: From any source, talked through with the agent.
- Q: Where is it built? → A: "New GitHub repo now": a new public GitHub repository, `averlo-deck-template`, marked as a template ("push pr and public template"). It starts with fresh history and contains nothing from the origin deck's client.
- Q: Design-system source? → A: averlo-web-transition and the Averlo questionnaire for components; averlo-next-template for fonts.
- Q: The top bar? → A: The questionnaire's bar, ported full-bleed across the top. The footer loses its divider and keeps its progress indicator.
- Q: Languages? → A: One language by default, more by configuration.
- Q: Gate failures in an unattended run? → A: After 3 attempts the phase is parked as a draft PR and the run moves on.
- Q: Is the bar the questionnaire's header band, its progress navigator, or both? → A: Both, as they are in the questionnaire.
- Q: The template's licence? → A: MIT.

- After approval, the owner added:
  - The Averlo look binds the template's build only. A deck made from the template may change its look and its ports.
  - Porting fidelity: port everything as it is, never a lesser partial copy. Ports are whole, unchanged files with all their dependencies, never re-implementations.

- Q: The deck's motion lives in the origin product's design-source files, whose identifiers carry the product's name. How does it come in? → A: "Copy files, rename only". The owner confirms the code is theirs to publish.
- Q: How much of the Averlo design system? → A: "What the deck uses, complete".
- Q: The intro's product orb and the hard-load screen? → A: "Averlo mark in both", with the same timing.

- Q: The questionnaire's bar files carry a client's name in their file names and comments. → A: "Rename upstream first". The names are changed inside averlo-questionnaire-template itself, and the port is re-pinned to that commit, so the port stays byte-identical.
- Q: Can the motion files also drop their imports of the product's screen-switch, registry and config code? → A: "Detach them". Only those imports and calls go, every motion value stays, and the strip diff proves it.
- Q: How do the setup commits reach `main`? → A: "Agent pushes setup once": once, at creation, after the public scan passes. Everything after that arrives through PRs the owner merges.
- Q: The private list of terms the public scan blocks? → A: The owner approved the list, which is kept in an ignored local file.
- Q: Carried code comments that quote people, give dates or cite the origin's own specs? → A: "Allow redact, listed". Such comments are reworded neutrally or removed, each listed; code is never changed by a redact.
- Q: The questionnaire's shell CSS declares fonts that may not be redistributed? → A: "Exclude the font files only". The CSS is ported unchanged, its font files are not copied, and the deck's fonts come from averlo-next-template.
- Q: The licence of the ported code and of the Averlo mark? → A: "MIT; mark excluded". The ported code is published under this repository's MIT licence. The Averlo name and mark are brand assets, shown as the default placeholder but not licensed for reuse, and the LICENSE says so.
- Q: How do the approved spec, plan and tasks reach `main`? → A: "In the setup push". They are part of the one-time setup push, and P0 branches from `main`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a new deck from the template (Priority: P1)

A deck owner creates a new repository from the template, runs it, and sees a complete, working deck of placeholder slides in the Averlo look: the intro plays, slides step and swipe, the menu and overview open, and the PDF downloads.

**Why this priority**: This is the template's whole purpose.

**Independent Test**: Create a fresh copy of the template, install and run it, then step through every placeholder slide with keys, clicks and swipes, and open the menu, the overview and the PDF.

**Acceptance Scenarios**:

1. **Given** a fresh copy, **When** the owner runs it for the first time, **Then** the intro plays once and the first placeholder slide enters.
2. **Given** the deck is open, **When** the owner uses the keys, clicks and swipes in the [contract](contracts/deck-config.md), **Then** each behaves as listed there.
3. **Given** any slide, **When** the page is refreshed or the link shared, **Then** it opens on the same slide.
4. **Given** the deck builds, **When** the owner opens the menu, **Then** a PDF of every slide downloads.
5. **Given** 390 px and 1440 px viewports, **When** the deck is shown, **Then** each slide fits its stage on both.

---

### User Story 2 - It looks and moves like Averlo, with the deck's polish intact (Priority: P1)

The deck uses the Averlo design system's real components and tokens. The questionnaire's bar runs full-bleed across the top, and the footer has no divider but keeps its progress indicator. Slide steps, swipes, the menu and the intro move exactly as polished in the origin deck.

**Why this priority**: Using the Averlo design system for real, and close parity, are the two quality bars of this feature.

**Independent Test**: The drift test shows every port is identical to its source commit, and the strip diff stays within tolerance for every recorded motion.

**Acceptance Scenarios**:

1. **Given** the ports, **When** the drift test runs, **Then** every file matches its pinned source byte for byte.
2. **Given** the baseline recorded from the origin deck on the gate machine, **When** the slide step, swipe, menu open and close, overview and intro are recorded again, **Then** every value stays within tolerance and every timing constant is unchanged.
3. **Given** any slide, **When** it is shown, **Then** the questionnaire's bar spans the full width at the top, and the footer shows its progress indicator without a divider line.
4. **Given** a viewer who prefers reduced motion, **When** the deck opens, **Then** the intro is skipped and transitions follow the reduced-motion rules.

---

### User Story 3 - Build a real deck by talking it through (Priority: P2)

A deck owner hands an agent any source material. The agent follows the template's documented workflow to talk the content through with the owner and turn it into slides, using only the owner's words. For a brand other than Averlo, it asks for the logo and assets.

**Why this priority**: This is how every real deck will be made, but the template is useful before the workflow is perfected.

**Independent Test**: Give an agent a short sample source file and the workflow. Check that the slides contain only words from the source or the owner's answers, and that the agent asked for brand assets when told the deck isn't Averlo-branded.

**Acceptance Scenarios**:

1. **Given** a source file and the workflow, **When** the agent drafts the deck, **Then** every slide's text traces to the source or the owner's answers.
2. **Given** no brand is named, **When** the deck is drafted, **Then** the intro and the hard-load screen show the Averlo mark.
3. **Given** the owner names another brand, **When** the deck is drafted, **Then** the agent asks for the logo and assets, and until they arrive the "your logo" placeholder shows.

---

### User Story 4 - Add a second language (Priority: P3)

A deck owner adds a second language through configuration and translated strings. The menu then shows the language switcher, and the language is kept in the shared link.

**Why this priority**: It's optional, and most decks need one language.

**Independent Test**: Add a second language with its strings. The language switcher appears, and the link carries the language. Remove it again and the switcher disappears.

**Acceptance Scenarios**:

1. **Given** one configured language, **When** the menu opens, **Then** there is no language switcher.
2. **Given** two configured languages, **When** the owner switches language, **Then** the slide stays the same and the link carries the language.

---

### Edge Cases

- A slide whose content is too long for its stage: it shows what fits and reports the overflow in development, as the origin deck does.
- The intro under `?intro=off`, under reduced motion, or after it has already played in this browser session: it is skipped.
- A port is edited by mistake: the drift test fails and names the file.
- A font, image or package with an unknown licence is added: the public scan flags it before push.
- A blocked term appears anywhere in the repository or its history: the public scan fails.
- The gate machine renders text slightly differently from another machine: baselines and tolerances are recorded on the gate machine.

## Requirements *(mandatory)*

### Functional Requirements

**Deck**

- **FR-001**: The template MUST keep the origin deck's engine: slide stepping by keys, click and swipe, Home/End, fullscreen, the menu with controls and slide list, the overview, and slide and language state in the URL.
- **FR-002**: The template MUST ship placeholder slides only: at least one of each slide kind and layout the engine supports, with "Placeholder title" and "Placeholder text" and no real content.
- **FR-003**: The template MUST keep the print view and render a PDF of every slide on every build.
- **FR-004**: The template MUST keep the intro, which plays once per browser session and is skipped under reduced motion and with `?intro=off`.
- **FR-004a**: The template MUST keep the hard-load screen, with the brand mark in place of the origin product's orb.
- **FR-005**: The intro, the hard-load screen, the top bar's brand slot and the footer wordmark MUST show the Averlo brand by default. For another brand they show its assets and name; without assets, the marks show the "your logo" placeholder and the wordmark shows the brand's name as text.
- **FR-006**: The template MUST remove every product-specific feature, block, screen, image and alternate deck of the origin. The exact list is kept outside this repository.
- **FR-007**: The template MUST default to one language. A second language MUST be addable by configuration plus strings, and the language switcher MUST appear only with two or more languages.

**Design system and look**

- **FR-008**: The template MUST use the Averlo design system's components, tokens and helpers from averlo-web-transition and the averlo-questionnaire-template top bar, and fonts from averlo-next-template. All of them come in as ports listed with their source commits.
- **FR-009**: A drift test MUST fail when any port differs from its pinned source. It guards the template's own build. A deck made from the template may change its look and its ports, and the README MUST say how to re-pin, re-target or turn off the drift test for such a deck.
- **FR-009a**: Every port MUST be a whole, unchanged copy of its source files together with every file they import, so it renders and behaves exactly as in its source. Re-implementing, simplifying, stubbing or partially copying a port, or editing it to make it compile, is a defect. When a port needs something the template doesn't have, that is ported too. A gap that truly cannot be ported is raised with the owner.
- **FR-009b**: Carried files (engine, intro, print, hard-load screen and motion module) MUST stay as they are, except for four kinds of change:
  - renaming the origin product's identifiers;
  - detaching removed features and the product's screen-switch, registry and config code;
  - composing ports or template-owned parts in place of removed components;
  - redacting comments that name people, give dates, cite the origin's own specs or describe its client. A redact never changes code.

  Each change MUST be listed with its reason.
- **FR-010**: No design-source code of the origin product may remain, other than the carried motion module.
- **FR-011**: Fonts MUST come from averlo-next-template.
- **FR-012**: The questionnaire's whole top MUST be ported as it is in the questionnaire and shown full-bleed across the top of the deck: the header band (brand on the left, controls on the right) together with its progress navigator, where pressing or dragging the step track jumps between slides. The footer's own progress indicator stays as well (FR-013).
- **FR-013**: The footer MUST lose its divider line and keep its progress indicator, wordmark, section name, slide number and menu button.

**Motion**

- **FR-014**: The deck's motion (slide step, swipe, menu open and close, overview, intro) MUST be gathered into the template's motion module, with every value kept as in the origin deck.
- **FR-015**: Before any change, a baseline of per-frame strips and timing constants MUST be recorded from the unchanged origin deck on the gate machine. After each phase the strips MUST be recorded again and diffed, and drift beyond the tolerance MUST fail the gate.

**Content workflow**

- **FR-016**: The template MUST include a documented workflow for turning any source material into a deck by talking it through with the owner, using only the owner's words and asking for brand assets when the brand is not Averlo.

**Public repository**

- **FR-017**: The repository MUST start with fresh history, and no file or commit may contain a blocked term.
- **FR-018**: A public scan MUST fail when the blocked-term list is missing or empty, when any blocked term appears in files or history, and when any font, image, package or port is missing from the licence list.
- **FR-019**: Every font, image, package and port MUST be listed with its source and licence, and committed only when its licence allows redistribution.
- **FR-020**: The repository MUST carry the MIT licence, covering the template's code and the ported code. The Averlo name and mark MUST be excluded from it as brand assets, and the LICENSE says so. Ports keep any licence notice they carry from their source. Font files that may not be redistributed are never copied, even when a ported stylesheet declares them.

**Gate**

- **FR-021**: A single gate command MUST run lint, formatting and type checks, the smoke tests at 390 px and 1440 px against a production build, the drift test, the strip diff and the public scan, and report each as passed, failed or not run.

### Key Entities

- **Slide**: one stage of the deck: kind, layout, title, section, and content in each configured language.
- **Deck configuration**: brand (Averlo or the owner's, with its assets), deck title and top-bar accent colour. Languages are configured with the slides.
- **Port record**: a port's source repository, commit, source path and target path.
- **Motion baseline**: per-frame values for each recorded motion, with the machine, runs and tolerance.
- **Licence entry**: a font, image, package or port, with its source, licence and whether it may be redistributed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new deck owner goes from "use this template" to a running placeholder deck in under 10 minutes by following the README.
- **SC-002**: 100% of ports match their pinned source.
- **SC-003**: Every recorded motion matches the baseline within tolerance, and no timing constant changes.
- **SC-004**: The public scan finds zero blocked terms and zero unlicensed files.
- **SC-005**: Every placeholder slide fits its stage at 390 px and 1440 px.
- **SC-006**: A sample deck drafted through the workflow contains no text that cannot be traced to its source or the owner's answers.

## Assumptions

- The origin deck's location and commit are recorded outside this repository, on the gate machine.
- Its motion values live partly in its product's design-source files. They are carried into the template's motion module with the same values (FR-009b, FR-014).
- Where averlo-web-transition and the questionnaire both have a component, averlo-web-transition is the source; the questionnaire supplies its top bar.
- The deck stays dark-only, like the origin deck, unless the Averlo design system requires otherwise. Any conflict is recorded as an open question.
- Fonts come only from averlo-next-template. Fonts whose licence forbids redistribution are not used.
- The template is not deployed anywhere as part of this feature.
