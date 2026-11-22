# Contract: the deck-visuals skill

The skill is at `.claude/skills/deck-visuals/` and `.agents/skills/deck-visuals/`; the two copies are identical. Use it while drafting a deck ("Draft a deck from any source", `process/workflows.md`).

1. **Read** the source, and list its structures: series, figures, steps, events, loops, reporting lines, options, quotations, topics and images.
2. **Propose** one preset per slide, by the rules in `SKILL.md`. Say why it fits, and name the alternatives.
3. **Draft** the slide with the source's and the owner's words and figures only. Ask for any missing value, unit or period.
4. **Confirm:** the owner confirms, changes or rejects each visual. Only confirmed visuals stay.
5. **Compose when nothing fits:** say that no preset fits, compose from Averlo parts in `src/deck/visuals/`, and keep the visual after the owner confirms it.
6. **Images:** use the owner's image first. Otherwise offer to generate one, ask which generator the owner has, generate only on a yes, and add the licence row. The placeholder shows until then.
7. **Check:** run the trace check (labels and data included), and check fit at 390 and 1440.
