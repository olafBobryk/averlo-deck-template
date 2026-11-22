# Feature Specification: Deck visuals

**Feature Branch**: `feat/002-deck-visuals`

**Created**: 2026-11-22

**Status**: Approved by the owner on 2026-11-22 ("Approve, start run").

**Input**: User description: "Automatic, versatile slide visuals with a preset library. A deck owner hands the agent any source material; a template-shipped skill reads it, picks a preset visual per slide from the content's structure, drafts it, and the owner confirms each. Preset families: charts and stats, diagrams, text layouts, image slides. When no preset fits, the skill composes a new visual from Averlo parts for that deck only. Images owner-supplied by default, generated on offer. The skill ships for Claude Code and Codex. Builds on feature 001."

## Clarifications

### Session 2026-11-22 (grilling with the owner)

- Q: What should the deck generate from source material without the owner describing each slide? → A: Diagrams, charts and numbers, layouts and images (all four).
- Q: How should the agent create visuals? → A: "Skill picks presets": a skill reads the source, picks a preset per slide from its structure, drafts it, and the owner confirms; it composes a new visual from Averlo parts only when no preset fits.
- Q: Which presets ship with the template? → A: Charts and stats, diagrams, text layouts and image slides (all four families).
- Q: Where do images come from? → A: "owner supplied default, offer generated".
- Q: Which image generator? → A: "whatever is avaible to the user at that point. open ended user decides".
- Q: Charts: recharts, the library averlo-next-template already uses, styled with Averlo tokens? → A: "recharts".
- Q: Where does the skill live? → A: "Both, in the repo": for Claude Code and for Codex, shipped with the template.
- Q: Can the skill invent new visual types? → A: "Compose, keep per deck": when no preset fits, it composes a new visual from Averlo parts in that deck only; the owner confirms it, and it can be promoted to a preset later.

### Session 2026-11-22 (owner review of the diagram presets)

- Q: The diagram connectors read faint. Make them stronger? → A: "as is but round corner and splitting zones": the connector colour stays; branching lines get rounded corners.
- Q: What is "splitting zones"? → A: "take the three branching for example. should curved left and right and one goes down center aswell": where one node branches to several, the lines split from the parent downward, the outer branches curving left and right and the middle one going straight down.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Draft a deck's visuals from source material (Priority: P1)

A deck owner hands the agent their source material (notes, a document, a transcript). The agent uses the template's visuals skill: it reads the source, proposes a visual for each slide (a chart where the source has figures over time, a process flow where it has ordered steps, a stat card for a headline number, a quote for a quotation, and so on), drafts each slide with that preset using only the source's words and figures, and asks the owner to confirm or change each choice.

**Why this priority**: This is the feature's purpose: the owner gets a finished-looking deck without describing every visual.

**Independent Test**: Give the agent the template's sample source and the skill. Check that each proposed slide names a preset, that each choice follows from the source's structure, that every text and figure traces to the source or the owner's answers, and that nothing is kept without the owner's confirmation.

**Acceptance Scenarios**:

1. **Given** a source with a series of figures, **When** the skill drafts the deck, **Then** it proposes a chart preset for them, and every plotted value appears in the source.
2. **Given** a source with ordered steps, **When** the skill drafts the deck, **Then** it proposes a process flow or timeline preset, with the steps in the source's order.
3. **Given** a proposed visual, **When** the owner rejects it, **Then** the skill offers the other presets that fit and keeps only what the owner confirms.
4. **Given** any drafted slide, **When** its text and figures are checked, **Then** each traces to the source or the owner's answers.

---

### User Story 2 - Use preset visuals that need no polishing (Priority: P1)

A deck owner, or the agent on their behalf, puts a preset visual on a slide by giving its content: data for a chart, steps for a flow, a quotation for a quote, an image for an image slide. The visual renders in the Averlo look at every supported size, moves with the deck's motion, prints in the PDF, and needs no styling work.

**Why this priority**: The presets are what the skill picks from, and what owners reach for most often.

**Independent Test**: Render the template's preset gallery deck, one slide per preset with placeholder content. Check that each fits its stage at 390 px and 1440 px, keeps 4.5:1 text contrast, appears in the PDF, and changes only when its content changes.

**Acceptance Scenarios**:

1. **Given** a chart preset with placeholder data, **When** the deck is shown at 390 px and 1440 px, **Then** the chart fits its stage, its labels are readable, and its colours come from the Averlo tokens.
2. **Given** any preset, **When** the PDF is built, **Then** the preset's slide appears in it.
3. **Given** a viewer who prefers reduced motion, **When** a preset slide enters, **Then** it follows the deck's reduced-motion rules.

---

### User Story 3 - Compose a new visual when no preset fits (Priority: P2)

The source holds a structure no preset covers. The skill composes a new visual for that deck from Averlo design-system parts, shows it to the owner, and keeps it only in that deck once the owner confirms. Later, the owner can ask for it to become a preset.

**Why this priority**: It keeps the feature versatile, but the presets cover most decks.

**Independent Test**: Give the skill a source whose structure no preset fits. Check that it says no preset fits, composes a new visual from Averlo parts only, keeps it in the deck only after confirmation, and doesn't add it to the shared presets.

**Acceptance Scenarios**:

1. **Given** content no preset fits, **When** the skill drafts its slide, **Then** it says so and proposes a composed visual built only from Averlo design-system parts.
2. **Given** a composed visual the owner confirmed, **When** the deck is checked, **Then** the visual lives only in that deck and the shared preset list is unchanged.
3. **Given** a composed visual, **When** the owner asks to promote it, **Then** it is added to the preset list with its own example and tests.

---

### User Story 4 - Images (Priority: P2)

A slide needs an image. The skill uses the owner's images by default. When the owner has none for that slide, it offers to generate one with whatever image generator the owner has available at that point, and the owner decides each time. Until an image is chosen, a placeholder shows.

**Why this priority**: Image slides are a preset family, and the repository is public, so every image needs a known licence.

**Independent Test**: Draft an image slide with no owner image. Check that the placeholder shows, that the skill offers generation and asks which generator, that nothing is generated without the owner's yes, and that a chosen image gets a licence row.

**Acceptance Scenarios**:

1. **Given** an owner image, **When** an image slide is drafted, **Then** it uses that image and adds its licence row.
2. **Given** no owner image, **When** an image slide is drafted, **Then** a placeholder shows and the skill offers generation, asking which generator the owner wants to use.
3. **Given** the owner declines generation, **When** the deck is built, **Then** the placeholder stays, and no image is fetched or generated.

---

### Edge Cases

- A chart whose figures are missing units or periods in the source: the skill asks the owner and never infers them.
- Data too long for its preset (e.g. 40 bars): the skill proposes a summary the owner confirms, or a different preset; it never drops data silently.
- A visual that doesn't fit its stage at 390 px: it reports the overflow in development, as feature 001's dev reporter does.
- A generated or supplied image whose licence is unknown: the public scan stops it before push.
- A deck with two languages: every visual's text has a string for each language; numbers are not translated.
- No image generator available to the owner: the skill says so and keeps the placeholder.

## Requirements *(mandatory)*

### Functional Requirements

**Presets**

- **FR-001**: The template MUST ship preset visuals in four families:
  - charts and stats: bar, line, donut, and big-number stat cards;
  - diagrams: process flow, timeline, cycle, org chart, comparison table, and 2×2 matrix;
  - text layouts: quote, statement, agenda, two-column compare, and image + text;
  - image slides: full-bleed image, image grid, and image with caption.
- **FR-002**: Each preset MUST be filled by content only (data, labels, text, images), with no styling input, and MUST render in the Averlo look from the design system's components and tokens.
- **FR-003**: Each preset MUST fit its stage at 390 px and 1440 px, keep 4.5:1 text contrast, appear in the PDF, and follow the deck's motion and reduced-motion rules.
- **FR-004**: The template MUST ship a preset gallery: placeholder slides showing every preset, with placeholder text and placeholder data only.
- **FR-005**: Charts MUST be drawn with the chart library averlo-next-template uses, styled with Averlo tokens.

**The skill**

- **FR-006**: The template MUST ship a visuals skill for both Claude Code and Codex.
- **FR-007**: Given source material, the skill MUST propose a preset per slide from the source's structure, and draft the slide with that preset.
- **FR-008**: The skill MUST use only the source's or the owner's words and figures, and MUST ask instead of inferring any missing value, unit or period.
- **FR-009**: The skill MUST keep a visual only after the owner confirms it, and MUST offer the other fitting presets when the owner rejects one.
- **FR-010**: When no preset fits, the skill MUST say so and compose a new visual from Averlo design-system parts, kept in that deck only, once the owner confirms it.
- **FR-011**: A composed visual MUST be promotable to a preset on the owner's request, with its own gallery slide and tests.

**Images**

- **FR-012**: Image slides MUST use the owner's images by default.
- **FR-013**: When the owner has no image for a slide, the skill MUST offer to generate one, ask which available generator to use, and generate only on the owner's yes. Until then, a placeholder shows.
- **FR-014**: Every image MUST get a licence row before it is committed; the public scan MUST fail on an image without one.

**Constraints carried from feature 001**

- **FR-015**: Ports MUST stay unchanged; presets compose them.
- **FR-016**: The drafting workflow's trace check (feature 001, SC-006) MUST also cover visuals' labels and chart data.

### Key Entities

- **Preset**: a named visual with a family, the content it takes (its schema), an example, and its gallery slide.
- **Visual on a slide**: a preset (or a composed visual) plus its content, stored in the deck's slide content like feature 001's blocks.
- **Composed visual**: a deck-local visual built from Averlo parts, with the owner's confirmation recorded.
- **Image asset**: a file under the deck's public assets, with its source (owner or generator) and licence row.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the template's sample source, the skill drafts a complete deck with a visual proposed for every slide in one pass, with the owner only confirming or changing choices.
- **SC-002**: 100% of presets fit their stage at 390 px and 1440 px and keep 4.5:1 text contrast in the gallery.
- **SC-003**: 100% of chart values and labels in a drafted deck trace to the source or the owner's answers.
- **SC-004**: No image is committed without a licence row (the public scan finds zero).
- **SC-005**: A preset used with new content needs no style changes to look finished (checked by its gallery slide rendering with other content in tests).

## Assumptions

- The skill is a procedure plus helpers. It doesn't run unattended: the owner confirms each visual.
- Presets extend feature 001's content model (blocks and layouts); existing decks keep working.
- Which image generator exists varies per owner and over time. The skill discovers or asks, and never assumes one.
- Generated images are treated as the owner's choice, with the generator's terms recorded in the licence row.
- The deck stays dark-only, like feature 001.
