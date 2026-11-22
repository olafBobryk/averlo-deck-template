# Quickstart: validate deck visuals

1. `npm run dev`, then open `/gallery`: every preset shows on its own slide with placeholder content (FR-004).
2. Step through the gallery at 390 px and 1440 px: every slide fits and is readable (SC-002).
3. Download the gallery PDF from its menu: every preset slide is in it.
4. Follow "Draft a deck from any source" with the skill on `tests/fixtures/sample-source.md`. Each slide gets a proposed preset, and the trace check passes, chart data included (SC-001, SC-003).
5. `npm run gate`: everything passes, and the default deck's motion strips are unchanged.
