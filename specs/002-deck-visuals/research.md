# Research: Deck visuals

## D1 Charts: recharts as a dependency, not a port

- **Finding:** averlo-next-template uses recharts 3.10.1 only inside one page's component (`repository-footprint/RepositoryFootprintCharts.tsx`), which is bound to that page's data. averlo-web-transition has no chart component.
- **Decision:** add recharts 3.10.1 as a direct dependency, at averlo-next-template's lockfile version (feature 001's precedence rule, R2). The chart presets are template-owned components that style recharts with Averlo tokens: colours from the accent and the muted scale, Inter text, the border token for the grid.
- **Alternatives:** porting the page component (rejected: it isn't reusable, and porting it whole brings page code in); hand-drawn SVG (offered; the owner chose recharts).

## D2 Presets as blocks

- **Decision:** each preset is a new block type in the content model (`chart`, `stat`, `flow`, `timeline`, `cycle`, `orgchart`, `table`, `matrix`, `quote`, `agenda`, `compare`, `image`, `imageGrid`). The existing `statement` layout and `lead` block cover "statement". Image + text is the `image` block in a `split` layout.
- **Rationale:** decks already compose slides from blocks and layouts, so the skill and the owner learn one model.
- **Alternatives:** a separate "visual" field per slide (rejected: two ways to do one thing).

## D3 Deck-local composed visuals

- **Decision:** a `custom` block names a component in the deck's own `src/deck/visuals/`, with typed props. The template ships the folder empty, plus one example in the gallery. Promotion means moving the component to `src/presets/`, adding a registry entry, an example and a gallery slide (procedure in `process/workflows.md`).
- **Rationale:** a composed visual stays in that deck (FR-010) and doesn't touch the presets until it is promoted (FR-011).

## D4 The gallery

- **Decision:** a template-owned `/gallery` route renders the same engine with the gallery's slides through `DeckContext`. The carried print page takes `?deck=gallery` (a compose row), so the gallery's PDF is built too.
- **Rationale:** FR-004 without changing the default deck or its baselines.

## D5 The skill

- **Decision:**
  - `SKILL.md`: the selection rules, mapping the source's structure to presets. For example: a series over time gives a line chart; parts of a whole give a donut; categories compared give a bar chart; one headline figure gives a stat; ordered steps give a flow; dated events give a timeline; a repeating loop gives a cycle; reporting lines give an org chart; options against criteria give a table; two axes give a matrix; a quotation gives a quote; a list of topics gives an agenda; two options give a compare; images give image presets.
  - It also covers the confirm loop, the trace rule, the compose-per-deck rule and the image rule (ask which generator; generate only on a yes; licence row).
  - `references/presets.md` is generated from the registry by `scripts/presets-doc.mjs`. A test fails when it is out of date, or when the Claude and Codex copies differ.
- **Rationale:** one source of truth for the presets, and both agents see the same skill.

## D6 Images

- **Decision:**
  - The `image` blocks take a path under `public/images/`, with alt text from the owner.
  - Without a path, the template-owned placeholder shows.
  - The public scan already fails on any image without a licence row (feature 001, FR-018).
  - The skill records a generated image's generator and terms in that row.
- **Alternatives:** a built-in generator integration (rejected: the owner decides each time, open ended).
