# Feature Specification: Slides as JSX

**Feature Branch**: `feat/003-jsx-slides`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Looking at the presets structure it's too harsh. I was thinking these are just JSX that an agent can copy and change freely; we're forcing too much structure that isn't versatile enough. Slides are JSX with metadata for the deck."

## Clarifications

### Session 2026-11-22 (grilling with the owner)

- Q: How do slides and presets work today? → A: "too harsh … we're forcing too much structure that isnt versitile enough. slides are jsx with meta data for the deck."
- Q: Is the model one `.tsx` file per slide that composes components freely and exports metadata for the deck, with presets as example slide files? → A: "Yes, JSX slides".
- Q: Where do slides live, and how is their order set? → A: "src/slides/nr names and then a seperate presets": numbered file names in `src/slides/` (e.g. `01-intro.tsx`) set the order; presets live in their own folder.
- Q: With 2+ languages, how does a slide carry its text? → A: "each slide has a json in that json that passes into the code. not per component defeinitions but defeinitions at the top of that file or soemthing like that": each slide file declares its words at the top, as data keyed by language, and the JSX reads them from there.
- Q: What happens to today's data blocks and the placeholder deck? → A: "Blocks become components": each block becomes an importable component with the same look; the placeholder deck and every preset are rewritten as slide files; the data model goes.
- Q: How do presets ship? → A: "Example slide files": one complete example slide per preset, which an agent copies into `src/slides/` and changes freely.
- Q: How much process? → A: "Full Spec Kit cycle".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write a slide as a file (Priority: P1)

A deck owner, or an agent for them, adds a slide by creating a numbered file in `src/slides/`. At the top of the file sit the slide's metadata (its kind, section and title) and its words, keyed by language. Below, the slide's layout is free JSX composed from the deck's components. The deck picks the file up in number order, and the menu, overview, PDF, URL and motion all work as before.

**Why this priority**: This is the feature: slides become free to shape, while the deck keeps working.

**Independent Test**: Add a new numbered slide file with metadata, words and free JSX. Check that it appears in its numbered place, steps, swipes, prints, shows in the menu and overview, and keeps its `?s=` link.

**Acceptance Scenarios**:

1. **Given** a new file `src/slides/05-results.tsx`, **When** the deck runs, **Then** it shows as slide 5, with its metadata's title in the menu and overview.
2. **Given** a slide's words at the top of its file, **When** the deck runs in a second configured language, **Then** the slide shows that language's words, and a missing language fails the type check.
3. **Given** any slide file, **When** the PDF is built, **Then** the slide prints on its own page.

---

### User Story 2 - Copy a preset and change it freely (Priority: P1)

An agent copies a preset's example slide file from the presets folder into `src/slides/`, renames it with its number, changes its words, and rearranges or extends its JSX freely: adds a text column, swaps a chart for a table, mixes components. Nothing outside the file needs to change.

**Why this priority**: The owner wants the presets versatile: copied and edited, not filled in.

**Independent Test**: Copy every preset example into a scratch deck, edit each one's words and layout, and check that each still renders, fits, prints and passes the gate.

**Acceptance Scenarios**:

1. **Given** a preset example file, **When** it is copied into `src/slides/` with a number, **Then** it renders as a slide with no other change.
2. **Given** a copied preset, **When** its JSX is changed (components added, removed or rearranged), **Then** it still renders in the Averlo look.

---

### User Story 3 - The look stays the same (Priority: P1)

Everything feature 001 and 002 built still looks and moves the same after the change: the placeholder deck, every block's look (now components), the presets, the gallery, the motion strips and the PDF.

**Why this priority**: The change is to how slides are written, not to what viewers see.

**Independent Test**: The gate passes unchanged: smoke, the motion strips within tolerance, the drift test, and the fit and contrast tests over every slide and preset.

**Acceptance Scenarios**:

1. **Given** the placeholder deck rewritten as slide files, **When** the strips run, **Then** they stay within tolerance.
2. **Given** each former block, **When** it is used as a component, **Then** it renders like it did as a block.

---

### User Story 4 - The skill and the trace check follow (Priority: P2)

The deck-visuals skill and the "Draft a deck" workflow write slide files instead of data. They copy the fitting preset file and put the owner's words in the slide's word definitions. The trace check reads every slide file's words and figures.

**Why this priority**: Content must still come only from the owner (constitution III).

**Independent Test**: Run the skill's dry run again on the sample source. The drafted slides are files, and every word and figure in their definitions traces to the source or the owner's answers.

**Acceptance Scenarios**:

1. **Given** the sample source, **When** the skill drafts a slide, **Then** it copies a preset file and fills its word definitions with the owner's words.
2. **Given** a slide file with a word that traces nowhere, **When** the trace check runs, **Then** it fails and names the slide.

### Edge Cases

- Two slide files share a number: the build fails and names both.
- A slide file without metadata, or with an unknown kind: the build fails and names the file.
- Words written directly in the JSX instead of in the word definitions: a check warns, because the trace check and the second language can't see them.
- A slide's JSX overflows its stage: the development overflow report names it, as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Slides MUST be files in `src/slides/`, one per slide, ordered by a number at the start of the file name.
- **FR-002**: Each slide file MUST declare, at its top, its metadata (kind, section, title, and an optional parent) and its words keyed by language. Its JSX MUST read its words from there.
- **FR-003**: Every configured language MUST have every word, checked when the deck builds.
- **FR-004**: The deck engine (stepping, swipe, menu, overview, URL, intro, print, PDF and motion) MUST work with slide files exactly as it does today.
- **FR-005**: Each of today's blocks and presets MUST become an importable component with the same look, composed from the Averlo ports.
- **FR-006**: The placeholder deck MUST be rewritten as slide files covering every kind, layout and component, with placeholder text only.
- **FR-007**: Each preset MUST ship as a complete example slide file in its own folder, renderable when copied into `src/slides/` with a number. `/gallery` and the demo's showcase MUST render these files.
- **FR-008**: The data block model (`content.ts` blocks and `slides.ts` data) MUST be removed once nothing uses it.
- **FR-009**: The deck-visuals skill, the "Draft a deck" workflow and the trace check MUST work with slide files and their word definitions.
- **FR-010**: Words written outside a slide's word definitions MUST be flagged by a check.

### Key Entities

- **Slide file**: a numbered `.tsx` in `src/slides/`, holding metadata, words by language, and a default-exported component.
- **Component**: a building block (chart, steps, flow, stat, …) imported by slide files.
- **Preset example**: a complete slide file in the presets folder, made to be copied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adding a slide takes one new file and no change elsewhere.
- **SC-002**: 100% of preset examples render when copied into `src/slides/` unchanged, and still render after their JSX is rearranged.
- **SC-003**: The gate passes with the motion strips within tolerance after the migration.
- **SC-004**: Every word and figure of a drafted deck traces to the source or the owner's answers.

## Assumptions

- Numbers in file names are zero-padded (`01-`, `02-`) so they sort.
- The menu and overview keep showing titles from each slide's metadata.
- The gallery and the showcase read the preset folder, not the registry's data.
