# Carried files: tests

Files carried from the origin deck into the test setup, and every change made to them (FR-009b). Rename rows say "product identifier → deck"; redact rows give the line and never the original text.

| File                   | Kind   | What                                                                                 | Why                                                                                           |
| ---------------------- | ------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `playwright.config.ts` | redact | Lines 3–4: comment reworded                                                          | It cited the origin's own decisions and features                                              |
| `tests/evidence.ts`    | rename | Line 9: the output folder re-pointed to `specs/001-deck-template/references/strips/` | The strips are this template's feature evidence (T007); no product identifier needed renaming |
| `tests/evidence.ts`    | redact | Line 5: comment reworded                                                             | It cited the origin's constitution                                                            |
