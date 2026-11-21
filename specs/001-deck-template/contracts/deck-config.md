# Contract: what a deck owner edits

A deck made from the template changes only these. Everything else is engine, motion or ports.

| What | Where | Rule |
|---|---|---|
| Slides, their content map and their text | `src/deck/slides.ts` | Each `Text` has every configured language. Words come from the owner (constitution III). |
| Languages | `langs` in `src/deck/langs.ts` | First = default. 2+ shows the language switcher in the menu, and `?lang=` is kept in links. |
| Brand | `src/brand/config.ts` | `averlo` (default) or `owner`. Owner assets go in `public/brand/` and are listed in `docs/licences.md`. |
| Deck title | `src/brand/config.ts` | Shown in the top bar and used in the PDF file name. |
| Accent colour of the top bar | `src/brand/config.ts` | Sets the questionnaire bar's accent variables (default `#ff3200`). Text on it must keep 4.5:1 contrast, which the a11y test checks. |

URL contract (unchanged from the origin): `?s=<position>`, `?lang=<code>` (only with 2+ languages), `?intro=off`.

Keys (unchanged): → ↓ Space PageDown and click for next; ← ↑ Shift+Space PageUp and a click on the left quarter for previous; Home and End; F for fullscreen; M for the menu; O for the overview; Esc to close.
