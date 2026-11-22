# Averlo deck template

A template for full-screen web slide decks, built with Next.js on the Averlo design system. It has the deck engine (keys, clicks, swipes and shareable links), an intro, a menu with an overview, and a print view that renders a PDF of every slide on each build. It ships placeholder slides only.

Agents working in this repository start with [`AGENTS.md`](AGENTS.md).

## Quickstart

In under 10 minutes, from the template to a running placeholder deck (SC-001). You need Node 24 and npm.

1. On GitHub, choose **Use this template** and create your repository.
2. Clone it and install:

   ```sh
   git clone <your repository URL>
   cd <your repository>
   npm ci
   ```

3. Run it:

   ```sh
   npm run dev
   ```

4. Open the URL it prints (http://127.0.0.1:3000). The intro plays once, then the first slide enters.

For a production build, `npm run build` builds the site and renders the PDFs into `public/pdf/`, and `npm run start` serves it.

## Presenting

| Action         | Keys and gestures                                                     |
| -------------- | --------------------------------------------------------------------- |
| Next slide     | → ↓ Space PageDown, a click, or a swipe left                          |
| Previous slide | ← ↑ Shift+Space PageUp, a click on the left quarter, or a swipe right |
| First, last    | Home, End                                                             |
| Fullscreen     | F                                                                     |
| Menu           | M                                                                     |
| Overview       | O                                                                     |
| Close          | Esc                                                                   |

The top bar's step track jumps to a slide when pressed or dragged. On phones (under about 480 px wide or 500 px tall) the bar is hidden, the slides take the whole stage, and the footer keeps its progress bar. In the menu's slide list, a section's row opens and closes its slides; on phones, its Previous, Next and Fullscreen buttons show only their icons.

The PDF downloads from the menu, one per language, named `<slug>-<lang>.pdf` after the deck title (`deck-en.pdf` for the placeholder deck). Links keep their place:

- `?s=<position>` opens a slide; a refresh or a shared link opens on the same one.
- `?lang=<code>` picks a language, with two or more languages. The first language is left out of the link.
- `?intro=off` skips the intro. It is also skipped under reduced motion and after it has played once in a browser session.

## Brand and languages

A deck changes only these files ([the contract](specs/001-deck-template/contracts/deck-config.md)). Everything else is the engine, the motion or the ports.

| What                  | Where                                | Notes                                                                                                                                                                           |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slides and their text | `src/deck/slides.ts`                 | Each `Text` has a string for every language.                                                                                                                                    |
| Languages             | `langs` in `src/deck/langs.ts`       | The first is the default. Each needs its name in `langNames`. Two or more show the language switcher in the menu.                                                               |
| Brand                 | `src/brand/config.ts`                | `averlo` (the default) or `owner`, with its `name`, `logo` and `mark`. Assets go in `public/brand/`, each listed in `docs/licences.md`.                                         |
| Deck title            | `deckTitle` in `src/brand/config.ts` | Shown in the top bar, the browser tab and the home-screen app's name, and used in the PDF file name: lowercased, each run of characters other than a–z and 0–9 replaced by `-`. |
| Top-bar accent        | `accent` in `src/brand/config.ts`    | Default `#ff3200`. It sets the bar's `--aq-*` accent variables; the bar picks black or white text on it, which must keep 4.5:1 contrast.                                        |

Where the brand shows:

- **The top bar's brand slot:** the Averlo mark, or the owner's `logo`. Without a `logo`, the "your logo" placeholder and the brand's name as text. The deck title follows it.
- **The intro and the hard-load screen:** the Averlo mark, or the owner's `mark`. Without a `mark`, the "your logo" placeholder.
- **The app icons** (the browser tab and the home screen): the Averlo mark, or the owner's `mark`. Without a `mark`, the "your logo" placeholder.
- **The footer wordmark:** the brand's name as text.

The procedures are [Change the brand](process/workflows.md#change-the-brand) and [Add a language](process/workflows.md#add-a-language).

## Write your deck

Hand your material (notes, documents, transcripts) to an agent and follow [Draft a deck from any source](process/workflows.md#draft-a-deck-from-any-source). The agent talks it through with you and uses only your words. Every procedure is listed in [`WORKFLOWS.md`](WORKFLOWS.md).

## The drift test

The template is built on Averlo design-system files ported unchanged at a pinned commit: averlo-web-transition at `cfa3d61`, averlo-next-template at `dc3b01d`, and the top bar from averlo-questionnaire-template at `756be64`. Font files whose licence forbids redistribution are listed under `exclude` and never copied. `npm run check:ports` checks every port, byte for byte, against its source. It needs clones of the sources in the folder named by `PORT_SOURCES_DIR`; without them it reports "not run".

A deck made from the template may change its look and its ports. In `scripts/ports.manifest.json`:

- **Re-pin:** set a source's `commit` to a newer one, and run the port.
- **Re-target:** port from your own fork or another design system. Change the source's `repo`, `commit` and `entries`, run the port, and update the licence rows.
- **Turn it off:** once you edit ported files on purpose, set `"driftTest": false`. The drift test then reports "not run" instead of failing.

The steps are in the [port procedure](process/workflows.md#port-the-design-system).

## The public scan

`npm run scan:public` fails when a blocked term appears in the repository's files, history, commit messages or branch names, or when a font, image, package or port has no row in [`docs/licences.md`](docs/licences.md). Its output never prints a term. Run it before every push.

- **Your own blocked-term list:** put one term per line (names of people, clients or products that must not be published) in `.local/public-scan-terms.txt`. `.local/` is ignored, so the list is never committed. To keep it elsewhere, set `SCAN_TERMS_FILE` to its path, in the environment (the gate also reads it from `.local/env`). Without a list, the scan fails and scans nothing.
- **Check a text before posting it:** `npm run scan:public -- --text <file>`.
- **Turn it off:** there is no switch. For a deck that will never be public, edit `scripts/gate.mjs`: remove the `scan` check from `buildChecks`, and the scan of the report from `main()`. The port script (`scripts/port-averlo.mjs`) still needs a list with at least one term, because it checks every pulled file against it.

## The gate

`npm run gate` is the evidence before a change lands. It runs, in order:

| Check    | Script                | What it proves                                                     |
| -------- | --------------------- | ------------------------------------------------------------------ |
| `check`  | `npm run check`       | Lint, format and types.                                            |
| `tools`  | `npm run test:tools`  | The scripts' own tests.                                            |
| `smoke`  | `npm run test:smoke`  | A production build with its PDFs, tested at 390 and 1440 px.       |
| `strips` | `npm run test:strips` | The deck's motion stays within tolerance of its recorded baseline. |
| `ports`  | `npm run check:ports` | The drift test.                                                    |
| `scan`   | `npm run scan:public` | The public scan.                                                   |

Each check is reported as:

- **passed**: it ran and passed;
- **failed**: it ran and failed, or could not start, so the gate fails;
- **not run**: it could not run, with the reason (for example, the drift test without its source clones).

A check that did not run is never reported as passed. A failing motion strip is re-run once; a pass on the retry counts as passed and is listed as flaky. The report is printed and written to `gate-results/gate-report.md`, and each check's output to `gate-results/logs/<check>.log`.

The gate reads machine settings from the ignored `.local/env` (`KEY=value` lines): `TARGET_URL`, where it serves the build for the strip diff; `LD_LIBRARY_PATH`, if Chromium needs it; `PORT_SOURCES_DIR` and `SCAN_TERMS_FILE`, as above. The tests need Chromium (`npx playwright install chromium`). The motion baselines were recorded on the template's own machine, so on another machine a strip may drift. Details: [Run the gate](process/workflows.md#run-the-gate).

## Licence

[MIT](LICENSE), for the template's code and the ported code. The Averlo name and mark are brand assets, excluded from the MIT licence: they are the default placeholder brand, not licensed for reuse. Every font, image, package and port is listed with its source and licence in [`docs/licences.md`](docs/licences.md).
