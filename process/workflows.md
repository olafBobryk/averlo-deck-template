# Workflows

The procedures behind the names in the workflow menu, [`WORKFLOWS.md`](../WORKFLOWS.md).

## Draft a deck from any source

How an agent turns a deck owner's material into slides (FR-016, User Story 3). The deck's words come from its owner (constitution, Principle III): the agent arranges them, and never writes slide text, figures or claims of its own.

### What you need

- The source material, in any form: notes, documents, transcripts, an old deck, a recording's text. Keep the owner's files in `docs/context/`, which is ignored, so they are never committed.
- An answers file next to it, `docs/context/answers.md`. Write each question you ask and the owner's answer word for word. The answers are the only words besides the source that may appear on a slide.
- If the deck's repository is public, the source's private names (people, clients, products) in the blocked-term list, so the public scan stops them (`SCAN_TERMS_FILE`, by default `.local/public-scan-terms.txt`).

### The rules

1. **Only the owner's words.** Every phrase on a slide stands in the source or in the answers. To shorten, cut to a phrase that stands there, or ask the owner for the shorter line. Never reword, summarise, translate or fill a gap yourself: ask.
2. **Talk it through.** Propose, then ask. The owner confirms the outline, each slide's point and anything you are unsure of. A proposal the owner has not answered is not their choice.
3. **No made-up brand.** The brand is Averlo unless the owner names another. For another brand, ask for its assets; never draw, trace or find a logo yourself.
4. **Engine, motion and ports stay as they are.** A deck changes only the files in [Where content goes](#where-content-goes).

### Steps

1. **Read the source.** List what it covers, in its own words: its parts, its points, its figures and its names.
2. **Ask about the deck.** Write each question and answer in the answers file:
   - what the deck is for, and who will see it;
   - its title (`deckTitle`);
   - its languages (one, unless the owner asks for more; see [Add a language](#add-a-language));
   - its brand: Averlo, or another brand.
3. **Brand.** With no brand named, keep `brand: { kind: "averlo" }`: the intro and the hard-load screen show the Averlo mark. When the owner names another brand:
   - set `brand: { kind: "owner", name: "<the name the owner gives>" }` in `src/brand/config.ts`;
   - ask for the logo and the mark (SVG or PNG), and whether the owner may publish them;
   - until they arrive, the intro, the hard-load screen and the top bar's brand slot show the "your logo" placeholder, and the footer wordmark shows the name. Say so to the owner;
   - when they arrive, follow [Change the brand](#change-the-brand).
4. **Agree the outline.** Propose sections and slide titles taken from the source's own headings and phrases. The owner confirms, cuts, adds or reorders. Write their answer down.
5. **Draft each slide.** Pick its kind, layout and blocks from the tables below, and fill each text with the owner's words. Keep speaker prompts in `notes`; they are not drawn.
6. **Show the owner** the deck (`npm run dev`), slide by slide, and ask about every slide you were unsure of. Change only what they answer.
7. **Check the draft** (below).

### Where content goes

| What                                    | Where                                                  |
| --------------------------------------- | ------------------------------------------------------ |
| Slides, their order and their text      | `slides` and `content` in `src/deck/slides.ts`         |
| Languages                               | `langs` and `langNames` in `src/deck/langs.ts`         |
| Brand, deck title, top-bar accent       | `config` in `src/brand/config.ts`                      |
| The owner's logo and mark               | `public/brand/`, each with a row in `docs/licences.md` |
| The source and the answers (never sent) | `docs/context/` (ignored)                              |

### Slide kinds, layouts and blocks

The types are in `src/deck/model.ts` and `src/deck/content.ts`; the placeholder deck in `src/deck/slides.ts` uses each of them in 13 slides.

A **slide** has an `id`, a `kind`, a `title`, and on dividers and content slides a `section` (shown in the footer) and an optional `parent`.

| Kind      | Use                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| `title`   | The first slide: the deck's title, with an optional lead.                                                        |
| `divider` | Opens a section. In the menu's slide list, its row opens and closes the slides after it with the same `section`. |
| `slide`   | A content slide: an optional `headline` over its blocks.                                                         |
| `closing` | The last slide.                                                                                                  |

A slide's **content** has an optional `headline` (its point, with an optional `muted` lead-in), its `blocks`, a `layout` and optional `notes`. Without a headline, the title shows large.

| Layout            | Draws                                             |
| ----------------- | ------------------------------------------------- |
| `stack` (default) | The heading over the blocks.                      |
| `split`           | The heading on the left, the blocks on the right. |
| `split-end`       | `split`, mirrored.                                |
| `center`          | A quote or a closing line in the middle.          |
| `statement`       | One large claim at the bottom left.               |
| `module`          | Draws as `stack`: it has no rules of its own.     |

| Block    | Shows                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lead`   | One line of text; `size: "statement"` makes it large.                                                                  |
| `points` | Labelled points in 2 to 5 columns (3 by default), as cards (the default), numbered rows or chips, with optional icons. |
| `steps`  | Steps with a status (done, current, upcoming), as a rail (the default) or nodes.                                       |
| `facts`  | Label and value pairs.                                                                                                 |
| `note`   | A short note; `**bold**` marks emphasis.                                                                               |
| `org`    | One node over the roles that report to it.                                                                             |
| `fork`   | One stage branching into options.                                                                                      |
| `week`   | A working week with its fixed moments.                                                                                 |
| `plan`   | A time axis from `start` to `end` (YYYY-MM), with dated marks and spans.                                               |

### Check the draft

1. **Every text traces.** Each sentence or phrase of slide text appears, ignoring case and spacing, in the source or the answers file (SC-006). Read the draft against both; anything that does not trace goes back to the owner as a question. `tests/docs/workflow-trace.spec.ts` applies the same rule to the template's sample (`tests/fixtures/sample-source.md`).
2. **Brand.** With Averlo, the intro, the hard-load screen and the top bar's brand slot show the Averlo mark; with another brand and no assets yet, the "your logo" placeholder.
3. **Fit.** Every slide's visible text and blocks fit inside its stage at 390 px and 1440 px (`tests/deck.spec.ts` checks it). In development, an overflowing slide is named in the browser console.
4. **Public.** If the repository is public, `npm run scan:public` passes.
5. **Gate.** [Run the gate](#run-the-gate) before offering the deck to land.

## Change the brand

The brand is set in `src/brand/config.ts` (FR-005; the contract is `specs/001-deck-template/contracts/deck-config.md`).

1. Ask the owner for the logo and the mark, and whether they may be published. Never make them up.
2. Put the files in `public/brand/`, for example `public/brand/mark.svg`.
3. Add a row for each file to [`docs/licences.md`](../docs/licences.md), with its source and licence. If it may not be redistributed, it may not be committed to a public repository.
4. In `src/brand/config.ts`, set `brand: { kind: "owner", name: "<name>", logo: "logo.svg", mark: "mark.svg" }`. `logo` and `mark` are paths under `public/brand/`. Without `mark`, the "your logo" placeholder shows.
5. Set `deckTitle`, and `accent` if the owner gives a colour. The accent sets the top bar's `--aq-*` variables, and the bar picks black or white text on it; that text must keep 4.5:1 contrast.
6. Run `npm run scan:public` and the gate. The brand test (`tests/brand.spec.ts`) checks the mark the config chooses; the top-bar test (`tests/topbar.spec.ts`) checks the brand slot and the footer wordmark.

The brand then shows in these places:

- the top bar's brand slot: `logo`, or without it the "your logo" placeholder and `name` as text, followed by `deckTitle`;
- the intro and the hard-load screen: `mark`, or without it the placeholder;
- the footer wordmark: `name`, as text.

To go back to Averlo, set `brand: { kind: "averlo" }`.

## Add a language

One language is the default (FR-007). A deck adds one by configuration and strings.

1. Add its code to `langs` in `src/deck/langs.ts`, and its name, written in that language, to `langNames` there. The first code is the default. The menu's language switcher and its PDF downloads show the name.
2. Add a string in that language to every `Text`: each slide and its content in `src/deck/slides.ts`, and the interface strings (`ui`) in `src/deck/model.ts`. Add one to the intro's `loading` in `src/gate/Intro.tsx` too. Ask the owner for every translation (Principle III). `npm run check` fails on a string that misses a language.
3. Run the gate. With two or more languages the menu shows the language switcher, and links carry `?lang=` for every language but the first. The build renders one PDF per language, `<slug>-<lang>.pdf` (`src/deck/pdf-name.ts`).

To remove a language, remove its code from `langs`, its name and its strings.

## Run the gate

`npm run gate` ([`scripts/gate.mjs`](../scripts/gate.mjs)) is the regression evidence before work is offered to land (constitution, Principle V; FR-021).

### What you need

- `.local/env`, ignored, with `LD_LIBRARY_PATH`, `PORT_SOURCES_DIR`, `SCAN_TERMS_FILE`, `ORIGIN_URL` and `TARGET_URL`. The gate loads it and names any value that is missing. Values already set in the environment win. `ORIGIN_URL` serves the origin build only while the template has no `src/app`, so once the app exists a missing `ORIGIN_URL` is named but changes no check.
- Chromium for Playwright (`npx playwright install chromium`).
- Nothing else answering at `TARGET_URL`, `SMOKE_PORT` (3198 by default) or `PDF_PORT` (3199 by default): the checks start their own servers there. If something already answers at `TARGET_URL`, the `strips` check fails.

### What it runs

In order, each as its own check:

| Check    | Runs                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| `check`  | `npm run check`: lint, format and types.                                                          |
| `tools`  | `npm run test:tools`: the tests of the scripts themselves.                                        |
| `smoke`  | `npm run test:smoke`: a production build with its PDFs, then Playwright at 390 and 1440 px.       |
| `strips` | `npm run test:strips`: the motion strip diff against the production build served at `TARGET_URL`. |
| `ports`  | `npm run check:ports`: the drift test.                                                            |
| `scan`   | `npm run scan:public`: blocked terms and licence coverage.                                        |

### Read the report

The report is printed and written to `gate-results/gate-report.md` (ignored), then checked with the public scan's text mode. Each check's output is in `gate-results/logs/<check>.log`. Each check is:

- **passed**: it ran and passed. A strip that passed only on its retry is listed as flaky.
- **failed**: it ran and failed, or could not start (a missing setting, a busy port). The gate exits 1.
- **not run**: its tool does not exist yet (the report names the task), or it reported "not run" with a reason, such as the drift test without `PORT_SOURCES_DIR` or turned off.

Report a check that did not run as not run, never as passed. A failed gate is not offered to land.

## Port the design system

The template is built on the Averlo design system by porting its source files, never by re-implementing them (constitution, Principle VIII; FR-008, FR-009, FR-009a). A port is a whole, unchanged copy of a source file at a pinned commit, together with every file it imports. Ports come in only through [`scripts/port-averlo.mjs`](../scripts/port-averlo.mjs) and its manifest, [`scripts/ports.manifest.json`](../scripts/ports.manifest.json).

### What you need

- A clean clone of each source repository named in the manifest, in one folder: `<PORT_SOURCES_DIR>/<repo>`. The clones are read only. The script reads them with `git show <commit>:<path>` and never checks out, edits or commits there.
- `PORT_SOURCES_DIR`, the path of that folder. It is a machine setting, so it lives in the ignored `.local/env`, never in a tracked file. The scripts look for it in the environment, then in `.local/env`, then in the line "Port sources folder (PORT_SOURCES_DIR):" in `.local/origin.md`.
- The blocked-term list that the public scan reads (`SCAN_TERMS_FILE`, by default `.local/public-scan-terms.txt`).

### The rules

The script applies these rules (research R3a) to each source in the manifest:

1. **Follow every import.** Starting from the manifest's entry files, it follows every TS and JS import (static, dynamic, `export … from`, `require`), every CSS `@import` and `url()`, and every asset import (SVG, JSON, images). Imports named only in comments are not followed.
2. **Resolve aliases with the source's own tsconfig.** For example, averlo-web-transition maps `@/*` to `./src/*`. The template's tsconfig declares the same alias, so the ported imports resolve unchanged. A `.js` specifier that names a `.ts` file resolves to the `.ts` file.
3. **Stop at npm packages.** The script records each package and the version in the source's lockfile. You then add it to `package.json` at the version that R2's precedence gives: the template's own pins win for next, react, react-dom, motion, typescript, @playwright/test and eslint; otherwise averlo-web-transition's lockfile wins; other sources add only packages that are not yet present. The script prints each package that `package.json` is missing or holds at another version. Every override is listed in [`docs/design-source.md`](../docs/design-source.md).
4. **Copy every file to the same path relative to `src/`.** A source's `targetRoot` sets where that is; the questionnaire's files go under `src/questionnaire/`. Files outside `src/` (public files) keep their path.
5. **Write down the closure.** The script writes every file (source repository, commit, source path, target path), every exclusion and every package to the generated section of `docs/design-source.md`, between its markers, and to `scripts/ports.lock.json`. It keeps everything outside the markers.
6. **Never edit a port, not even to make it compile.** A ported file is not reformatted, linted or "fixed": the ported folders are in the ESLint ignores and in `.prettierignore`. Build configuration that lets unchanged files resolve is template-owned and allowed, for example tsconfig paths, `.js` specifiers resolving to `.ts`, or a CSS `url()` of an excluded file left unresolved at build time. If a port does not build unchanged and no such setting fixes it, add an open question and park the phase.
7. **Exclude only files whose licence forbids redistribution.** The manifest's `exclude` list names files that are never copied, even when the closure reaches them, such as font files that may not be shared (owner: "Exclude the font files only"). Their references stay in the ported files unchanged. If the build or the smoke test's console check fails because they are missing, and no template-owned setting fixes it, raise an open question.
8. **The script stops, and copies nothing,** when:
   - an import cannot be resolved;
   - a pulled file would land under a template-owned path (the manifest's `templateOwned`: `src/app`, `src/deck`, `src/gate`, `src/boot`, `src/motion`, `src/brand`, `src/styles`, `src/_origin-temp`) or overwrite a file that the port script did not make;
   - a pulled file's path or content holds a blocked term (it prints the file and the term's number, never the term);
   - an asset (anything other than code, CSS or JSON) has no row in [`docs/licences.md`](../docs/licences.md), or its row is marked not redistributable, and the manifest does not exclude it.
9. **Sources may be absent.** In a deck made from the template without the sources folder, `npm run check:ports` reports "not run" with the reason. It does not fail.

### Run a port

1. Check that each clone has the pinned commit: `git -C <PORT_SOURCES_DIR>/<repo> cat-file -e <commit>^{commit}`.
2. Run `node scripts/port-averlo.mjs`. If it stops, fix the cause it names: add a licence row, add an exclusion, or raise the question with the owner. Never edit the pulled file.
3. Add each package that it prints to `package.json` at the version shown, with exact versions, then run `npm install`.
4. Add a row to `docs/licences.md` for each new package, port and asset, in the same commit.
5. Run `npm run check:ports`, `npm run check` and the gate.

### Re-pin

1. Fetch the new commit in the source's clone.
2. Change the source's `commit` in the manifest, and its entries if they changed.
3. Run the port: steps 2 to 5 above. The script removes ported files that the new closure no longer reaches. Until it runs, `check:ports` fails because the lock no longer matches the manifest.

### How the drift test works

`npm run check:ports` ([`scripts/check-ports.mjs`](../scripts/check-ports.mjs)) reads `scripts/ports.lock.json` and compares every ported file, byte for byte, with `git show <commit>:<source path>` in its clone. It fails when:

- a port differs from its source, or is missing (it names each file);
- the lock no longer matches the manifest's pins or entries.

It reports "not run", with the reason, when `PORT_SOURCES_DIR` is not set, the folder or a clone is missing, or a clone lacks the pinned commit. The gate runs it as its `ports` check.

### In a deck made from the template

The drift test guards the template's own build. A deck made from the template may change its look and its ports (FR-009):

- **Re-pin:** point the manifest at a newer commit of the same source, as above.
- **Re-target:** port from your own fork or another design system. Clone it into your `PORT_SOURCES_DIR`, change the source's `repo` (the clone's folder name), `commit` and `entries`, and run the port. Then change the licence rows to match.
- **Turn it off:** once you edit ported files on purpose, set `"driftTest": false` in the manifest. `check:ports` then reports "not run" with the reason "the drift test is turned off in scripts/ports.manifest.json", and the gate shows that, instead of failing.
