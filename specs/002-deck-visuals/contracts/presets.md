# Contract: presets

A deck uses a preset by adding its block to a slide's content in `src/deck/slides.ts`. The block's fields are in [data-model.md](../data-model.md).

| Family | Presets (block) | Fits |
|---|---|---|
| Charts and stats | `chart` bar, line, donut; `stat` | categories compared; a series over time; parts of a whole; one to four headline figures |
| Diagrams | `flow`, `timeline`, `cycle`, `orgchart`, `table`, `matrix` | ordered steps; dated events; a loop; reporting lines; options against criteria; two axes |
| Text layouts | `quote`, `statement` layout, `agenda`, `compare`, image + text | a quotation; one claim; a list of topics; two options; a picture with its point |
| Image slides | `image` (full-bleed or captioned), `imageGrid` | the owner's images |

Rules:

- **Content only:** a preset takes no style options (FR-002).
- **Fit and print:** every preset fits at 390 and 1440 px, keeps 4.5:1 contrast, and prints.
- **Deck-local visuals:** a deck's own visuals go in `src/deck/visuals/` and appear on a slide as `{ type: "custom", visual, props }`.
