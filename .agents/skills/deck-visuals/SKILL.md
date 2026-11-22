---
name: deck-visuals
description: Use when drafting or redrafting a deck's slides from source material (notes, documents, transcripts, an old deck) in a deck made from this template. Picks a preset visual for each slide from the source's structure, drafts it with the owner's words and figures only, composes a deck-only visual when no preset fits, handles images, and keeps only what the owner confirms.
---

# Deck visuals

Use this skill inside [Draft a deck from any source](../../../process/workflows.md#draft-a-deck-from-any-source). That procedure sets up the source, the answers file and the outline. This skill picks and drafts each slide's visual.

A deck's words come from its owner (the constitution, Principle III). You arrange the owner's words and figures. You never write slide text, figures or claims of your own.

## What you need

- The source material, in `docs/context/` (ignored, never committed).
- The answers file, `docs/context/answers.md`. Write each question you ask and the owner's answer word for word. The answers and the source are the only places a slide's words and figures may come from.
- The presets: [references/presets.md](references/presets.md) gives each preset's block, what it fits and an example. It is generated from `src/presets/registry.ts` by `npm run presets:doc`, so it lists exactly the presets this deck has. To see them drawn, run `npm run dev` and open `/gallery`.

## Steps

1. **Read** the source. List its structures, in its own words: series of figures, headline figures, steps, dated events, loops, reporting lines, options against criteria, two-axis placements, quotations, claims, topics, pairs of options and images.
2. **Propose** one preset for each slide, by the [selection rules](#selection-rules). Say why it fits, and name the alternatives. See [the confirm loop](#the-confirm-loop).
3. **Draft** the slide's block in `src/deck/slides.ts` with the source's and the owner's words and figures only. Ask for any missing value, unit or period. See [the trace rule](#the-trace-rule).
4. **Confirm.** The owner confirms, changes or rejects each visual. Only confirmed visuals stay.
5. **Compose when nothing fits.** Say that no preset fits, and propose a visual composed from Averlo parts for this deck only. See [compose per deck](#compose-per-deck).
6. **Images.** Use the owner's image first. Otherwise offer to generate one. See [images](#images).
7. **Check** the draft. See [checks after drafting](#checks-after-drafting).

## Selection rules

Match the structure the source has, not the look you want. Each row names a preset as the registry does; its block and an example are in [references/presets.md](references/presets.md).

| The source has | Propose | Block | Alternatives |
| --- | --- | --- | --- |
| Categories compared: one or more values for each category | Bar chart | `chart`, `kind: "bar"` | Comparison table; Stat cards, for up to four figures |
| A series over time: values at ordered periods | Line chart | `chart`, `kind: "line"` | Bar chart, for a few periods; Timeline, when the points are events, not values |
| Parts of a whole: one value for each part | Donut chart | `chart`, `kind: "donut"` | Bar chart; Stat cards, for up to four parts |
| One to four headline figures, each with its label | Stat cards | `stat` | Bar chart, when the figures compare one measure; Statement, for one figure said as a claim |
| Ordered steps, each leading to the next | Process flow | `flow` | Timeline, when each step has a date; Agenda, when the order is only a list |
| Dated events, in date order | Timeline | `timeline` | Process flow, when the dates matter less than the order |
| A loop: stages that repeat, the last leading back to the first | Cycle | `cycle` | Process flow, when the loop is run once |
| Reporting lines: a root, the nodes under it, and theirs | Org chart | `orgchart` | Feature 001's `org` block, for one node over its roles |
| Options against criteria: one cell for each option and criterion | Comparison table | `table` | Compare, for two options; 2×2 matrix, for two criteria |
| Two axes: four quadrants, and items placed on them | 2×2 matrix | `matrix` | Comparison table |
| A quotation, word for word, with who said it | Quote | `quote` | Statement, only when the owner wants the line without its speaker |
| One claim, said large | Statement | `lead` with `size: "statement"`, in the `statement` layout | Quote, when someone said it; Stat cards, when the claim is a figure |
| A list of topics, in the order they come | Agenda | `agenda` | Feature 001's `points` block |
| Two options side by side, each with its points | Compare | `compare` | Comparison table, for more options or shared criteria |
| A picture with its point beside it | Image and text | `image`, in the `split` or `split-end` layout | Captioned image |
| One picture that carries the slide, edge to edge | Full-bleed image | `image` with `bleed: true` | Captioned image |
| One picture with a line that says what it shows | Captioned image | `image` with a `caption` | Image and text; Full-bleed image |
| Two to six pictures shown together | Image grid | `imageGrid` | One image slide each |
| A structure no row fits | A composed visual | `custom` | Ask the owner; see [compose per deck](#compose-per-deck) |

When a structure fits two rows, propose the first and name the second as the alternative. Feature 001's blocks (`points`, `steps`, `facts`, `note`, `org`, `fork`, `week`, `plan`) stay available; [Slide kinds, layouts and blocks](../../../process/workflows.md#slide-kinds-layouts-and-blocks) lists them.

Each block has limits, in `src/presets/validate.ts`: for example at most 12 categories in a chart, 1 to 4 stat cards, 2 to 7 steps in a flow, 2 to 8 events, 3 to 6 stages in a cycle, at most 5 columns and 8 rows in a table. When the source has more than a preset takes, never drop or cut data silently. Propose a summary in the owner's words that the owner confirms, a split across slides, or a different preset.

## The confirm loop

For each slide:

1. **Propose.** Name the preset, quote the part of the source it draws, and say in one line why it fits (the structure from the table).
2. **Name the alternatives** from the same row, and any other row the source also fits.
3. **Ask.** Use the agent's question tool when one is available (in Claude Code, `AskUserQuestion`), with your proposal first and the alternatives as the other options. Without one, ask in plain text and wait for the answer.
4. **Keep only what the owner confirms.** On a change, draft what the owner chose. On a rejection, offer the other presets that fit. A proposal the owner has not answered is not their choice, and silence is not a yes.
5. **Write it down.** Add the question and the owner's answer, word for word, to the answers file.

Proposals may go out a few slides at a time, but each visual is confirmed on its own.

## The trace rule

- **Only the owner's words and figures.** Every label, category, series name, unit, source line, caption, alt text and stat value stands in the source or the answers file. To shorten one, cut it to a phrase that stands there, or ask the owner for the shorter line.
- **Figures as written.** Plot each value as the source writes it: `1,200` is `1200`, and `1.2M` is `1.2` with the unit the owner gives. A stat card's `value` is the source's own string, such as `"38%"`. Never round, convert, total, average or work out a figure. A chart of shares is plotted only when the source or the owner gives the shares.
- **Ask for what is missing.** When a value, its unit or its period is missing or unclear, ask the owner. Never infer it, and never carry a unit from one figure to another.
- **Languages.** With two or more languages, every `Text` has a string in each, from the owner. Numbers are not translated.

## Compose per deck

When no preset fits:

1. Say so to the owner, and name the structure no preset covers.
2. Propose a visual composed only from Averlo parts: the ported `Panel` (`@/components/ui/primitives/Panel`), `Text` through `@/deck/text`, `Icon` through `@/deck/icon`, and the deck's tokens (`var(--deck-…)`, sized in `var(--u)`). Never edit a ported file, and add no dependency without the owner's answer. The gallery's "Composed visual (example)" (`src/presets/examples/ComposedExample.tsx`) shows the shape.
3. Put the component in `src/deck/visuals/`, export it from `src/deck/visuals/index.ts` under a name, and draw it with `{ type: "custom", visual: "<that name>", props: { … } }`. It takes `DeckVisualProps`: its `props`, the `lang` and `still`. Every `Text` in `props` follows the trace rule.
4. Show it to the owner, and keep it only once they confirm it. It stays in this deck; the shared presets and the registry do not change.

When the owner asks for it to become a preset, follow [Promote a visual to a preset](../../../process/workflows.md#promote-a-visual-to-a-preset).

## Images

1. **The owner's image first.** Ask for it, its alt text and its source and licence. Put it under `public/images/`, set the block's `src` to `/images/<file>`, and add its row to `docs/licences.md` in the same commit. If the repository is public, ask whether the image may be published; an image that may not be redistributed is not committed.
2. **Otherwise, offer generation.** Say that the slide has no image and ask whether the owner wants one generated. If yes, ask which image generator they have available now, as an open question: do not list, suggest or assume one. Generate only on the owner's yes, with the generator they name, and show the result before it stays.
3. **Record a generated image.** Its row in `docs/licences.md` gives the generator's name and the date as its source, and the generator's terms as the owner states them as its licence.
4. **Until then, the placeholder.** An `image` without `src` shows the template's placeholder. If the owner declines, or has no generator, say so and keep the placeholder. Never fetch, search for or download an image yourself.

`npm run scan:public` fails on any image without a licence row.

## Checks after drafting

1. **Trace.** Read every slide against the source and the answers file: its text, its visuals' labels, and its chart and stat figures. Anything that does not trace goes back to the owner as a question. `tests/docs/workflow-trace.spec.ts` applies the same rule, labels and figures included, to the template's sample.
2. **Fit.** Open each slide at 390 px and 1440 px wide (`npm run dev`). Every visual fits inside its stage; in development, an overflowing slide is named in the browser console. A visual that does not fit goes back to the owner with a shorter line, a split or another preset; never shrink or cut the owner's words.
3. **Gate.** Run `npm run gate` ([Run the gate](../../../process/workflows.md#run-the-gate)). Report any check that did not run as not run.
