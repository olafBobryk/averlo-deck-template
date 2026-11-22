// The deck's own composed visuals (feature 002, research D3; FR-010),
// template-owned: a visual no preset fits, built for this deck only from
// Averlo parts (the ported `Panel`, `Text` through `@/deck/text`, `Icon`
// through `@/deck/icon`, and the deck's tokens). Each is a component in its
// own file in this folder, with typed props; a slide file (src/slides/,
// feature 003) imports it from `@/deck/visuals/<Name>` and draws it in a
// `<Block type="custom">`, its words and figures from the slide's `copy`,
// like any component. The composed visual example
// (src/presets/slides/composed/composed-visual.tsx, drawing
// src/presets/examples/ComposedExample.tsx) shows how. The template ships
// none. To make one a shared preset, follow "Promote a visual to a preset"
// in process/workflows.md.
export {};
