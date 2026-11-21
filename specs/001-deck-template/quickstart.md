# Quickstart: validate the deck template

Prerequisites: Node 24, `npm ci`, and Chromium for Playwright (`npx playwright install chromium`, plus the system libraries it needs). The ignored blocked-term list `.local/public-scan-terms.txt` must exist for the public scan.

1. **Run it:** `npm run dev`, then open the printed local URL. The intro plays once, and placeholder slide 1 enters below the top bar (US1).
2. **Present:** step with the keys in [contracts/deck-config.md](contracts/deck-config.md), swipe on a phone viewport, open M and O, and download the PDF from the menu (US1).
3. **Gate:** `npm run gate` runs and reports each of these (FR-021):
   - `check`: lint, format and types
   - `test:smoke`: production build plus Playwright at 390 and 1440
   - `test:strips`: the strip diff against `references/strips` (US2)
   - `check:ports`: every port matches its pinned source (US2)
   - `scan:public`: blocked terms and licence coverage (FR-017 to FR-019)
4. **Second language:** add a code to `languages` with its strings. The language switcher appears, and `?lang=` holds (US4).
5. **Brand:** set the brand to `owner` without assets. The intro and hard-load screen show the "your logo" placeholder (US3, FR-005).
6. **Content workflow:** follow "Draft a deck from any source" in `process/workflows.md` with `tests/fixtures/sample-source.md`. Every slide's text traces to the file or the owner's answers (US3, SC-006).
