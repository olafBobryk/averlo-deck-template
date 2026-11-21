# Open questions

Questions waiting on the owner. Written only by the owner thread (constitution I); a parked phase's question is copied here from its draft PR.

## Q1 (2026-11-21, P1) The development overflow report

- **Context:** the spec's edge case says an over-long slide "shows what fits and reports the overflow in development, as the origin deck does", and T012 asks for a test of that report. The origin deck has no slide-level overflow report. Its only development warning is the carried heading-text one-line-fit warning, which never fires for slide titles.
- **Options:**
  - A. Add a small template-owned, development-only reporter, composed into the engine: a console warning naming the slide's position when its content overflows the stage.
  - B. Drop the report from the spec and keep only "shows what fits".
- **Recommendation:** A. It is small, dev-only and invisible to viewers, and it gives deck owners the feedback the spec describes.
- **Meanwhile:** the development check in `tests/overflow.spec.ts` is marked fixme; the production check ("reports nothing") runs.
