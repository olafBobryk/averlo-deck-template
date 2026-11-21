# Open questions

Questions waiting on the owner. Written only by the owner thread (constitution I); a parked phase's question is copied here from its draft PR.

None open. Answered on 2026-11-21 (recorded in [spec 001](../../specs/001-deck-template/spec.md#session-2026-11-21-grilling-with-the-owner)): Q1 add a dev reporter; Q2 ignore start latency; Q3 drop the ledger style; Q4 allow the one-line PDF script fix.

## Answered

### Q1 (2026-11-21, P1) The development overflow report

- **Context:** the spec's edge case says an over-long slide "shows what fits and reports the overflow in development, as the origin deck does", and T012 asks for a test of that report. The origin deck has no slide-level overflow report. Its only development warning is the carried heading-text one-line-fit warning, which never fires for slide titles.
- **Options:**
  - A. Add a small template-owned, development-only reporter, composed into the engine: a console warning naming the slide's position when its content overflows the stage.
  - B. Drop the report from the spec and keep only "shows what fits".
- **Recommendation:** A. It is small, dev-only and invisible to viewers, and it gives deck owners the feedback the spec describes.
- **Meanwhile:** the development check in `tests/overflow.spec.ts` is marked fixme; the production check ("reports nothing") runs.

### Q2 (2026-11-21, P1) Four motion strips start earlier on the placeholder deck

- **Context:** against the template build, 36 of the 40 strips stay within tolerance and every timing constant is exact. The same 4 drift in every run, all in _when the first frame paints_, not in the motion values:
  - menu-expand at 390: the card's start latency is about 20 ms, against a baseline of 56.5 ± 18.2 ms;
  - overview at 390 and at 1440: every thumbnail starts about 37 ms earlier (thumb 0 at about 15 ms, against 52.7 ± 17.6 and 51.2 ± 35.3 ms), with the stagger between indices unchanged;
  - menu-minimize at 1440: the first frame lands later in the spring (width −28 against −36.3 ± 5.8 ‰; x likewise).

  The cause is likely the content: 12 light placeholder slides render their thumbnails faster than the origin's heavier deck. Research R8 says never to re-baseline without you.

- **Options:**
  - A. Keep the baseline's motion values, but record the start latencies of these strips again from the template's own build (a latency-only re-baseline), because a deck's content sets them.
  - B. Exclude render-bound start latencies from the diff, and keep only each motion's own shape and the per-index stagger.
  - C. Keep the strips as they are, and accept that these 4 fail until a deck's content is about as heavy as the origin's.
- **Recommendation:** A. The springs and fades stay compared, value by value, against the origin; only the time to first paint, which follows the content, is taken from the template.
- **Meanwhile:** the strips check fails on these 4 only. The phases that follow are built on top, and their gates show the same 4.

### Q3 (2026-11-21, P1) The org block's ledger style

- **Context:** `data-model.md` lists the org block as "tree or ledger", but the carry list removes the Ledger component. The carry kept the `style?: "tree" | "ledger"` type and removed the component and its CSS, so a ledger now draws as a tree.
- **Options:** A. Leave it as is, and drop "ledger" from the data model in a later spec change. B. Carry the Ledger component back.
- **Recommendation:** A. The carry list is the more specific decision.

### Q4 (2026-11-21, P1) The carried PDF script leaves its server running

- **Context:** `scripts/render-pdf.mjs` stops `npx`, not the `next start` server under it, so after each build a server stays up on `PDF_PORT`. A second build then renders the PDFs from the old server. The gate now stops each check's whole process group when the check ends, but a plain `npm run build` still leaves the server. Fixing the script is a code change to a carried file, which FR-009b doesn't allow without you.
- **Options:** A. Allow a one-line fix (start the server in its own process group and stop the group), listed as a row. B. Leave it as carried, with the gate's cleanup.
- **Recommendation:** A.
