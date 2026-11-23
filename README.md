# Averlo deck template

**Make your own deck:** open Codex or Claude Code on an empty folder and paste this one prompt. The agent makes your own copy of the template, sets everything up and builds the deck with you. You never type a command.

```text
I want to make my own slide deck with this template: https://github.com/olafBobryk/averlo-deck-template. I'm not technical, so please do every technical step yourself, and never ask me to type a command: tell me only what to click or open, and ask me one plain question at a time. If something truly can't be done without me typing, give me the exact line to paste, where to paste it, and why.

1. Make my own copy: a private GitHub repository of mine made from that template, on this computer in this folder. The template's process/workflows.md, "Set up a deck", says how. If I need a GitHub account or a sign-in, tell me what to click. If this folder already holds my copy, skip this step.
2. From then on, read AGENTS.md in my copy and follow its "Making a deck" section.
3. Set this computer up for the deck: Node, the project's packages and the browser the checks use.
4. Start the deck and give me the link to open it.
5. Ask me for my material (notes, documents, an old deck) and talk it through with me. Use only my words and figures.
6. Build the slides from the template's preset visuals.
7. Run the deck's checks before you show me anything, and fix anything that fails.
8. Save each change I keep to my repository.
9. When I say the deck is ready, help me put it online with a free Vercel account, and give me the link to share. Later changes go to the same link when I ask.
```

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

The top bar floats over the slides with the brand and the deck title. The progress navigator along the bottom edge jumps to a slide when pressed or dragged: its mound rises under the pointer. The footer's slide number can be pressed to type a slide number; Enter goes there and Esc cancels. On phones (under about 480 px wide or 500 px tall) the top bar is hidden and the navigator stays. In the menu's slide list, a section's row opens and closes its slides; on phones, its Previous, Next and Fullscreen buttons show only their icons.

The PDF downloads from the menu, one per language, named `<slug>-<lang>.pdf` after the deck title (`deck-en.pdf` for the placeholder deck). Links keep their place:

- `?s=<position>` opens a slide; a refresh or a shared link opens on the same one.
- `?lang=<code>` picks a language, with two or more languages. The first language is left out of the link.
- `?intro=off` skips the intro. It is also skipped under reduced motion and after it has played once in a browser session.

## Brand and languages

A deck changes only these files ([the contract](specs/001-deck-template/contracts/deck-config.md)). Everything else is the engine, the motion or the ports.

| What                  | Where                                | Notes                                                                                                                                                                           |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slides and their text | `src/slides/`                        | One numbered file per slide (`NN-name.tsx`), with its words for every language in its `copy`.                                                                                   |
| Languages             | `langs` in `src/deck/langs.ts`       | The first is the default. Each needs its name in `langNames`. Two or more show the language switcher in the menu.                                                               |
| Brand                 | `src/brand/config.ts`                | `averlo` (the default) or `owner`, with its `name`, `logo` and `mark`. Assets go in `public/brand/`, each listed in `docs/licences.md`.                                         |
| Deck title            | `deckTitle` in `src/brand/config.ts` | Shown in the top bar, the browser tab and the home-screen app's name, and used in the PDF file name: lowercased, each run of characters other than a–z and 0–9 replaced by `-`. |
| Accent                | `accent` in `src/brand/config.ts`    | Default `#ff3200`. It sets the `--aq-*` accent variables of the top bar and the navigator, which pick black or white text on it; that text must keep 4.5:1 contrast.            |

Where the brand shows:

- **The top bar's brand slot:** the Averlo mark, or the owner's `logo`, over the deck's dark background. Without a `logo`, the "your logo" placeholder and the brand's name as text. The deck title follows it, muted.
- **The intro and the hard-load screen:** the Averlo mark, or the owner's `mark`. Without a `mark`, the "your logo" placeholder.
- **The app icons** (the browser tab and the home screen): the Averlo mark, or the owner's `mark`. Without a `mark`, the "your logo" placeholder.

The footer carries no brand.

The procedures are [Change the brand](process/workflows.md#change-the-brand) and [Add a language](process/workflows.md#add-a-language).

## Write your deck

Hand your material (notes, documents, transcripts) to an agent and follow [Draft a deck from any source](process/workflows.md#draft-a-deck-from-any-source). The agent talks it through with you and uses only your words. Every procedure is listed in [`WORKFLOWS.md`](WORKFLOWS.md).

Each slide is a numbered file in `src/slides/`, `NN-name.tsx`: `05-results.tsx` is slide 5. The number sets the order, so adding a slide is adding a file. A slide file has three parts ([the contract](specs/003-jsx-slides/contracts/slide-file.md)):

- `meta`: its kind (`title`, `divider`, `slide` or `closing`), its section and its layout;
- `copy`: every word and figure it shows, its title among them, for each language in `src/deck/langs.ts`. `npm run check` fails on a missing word;
- its JSX, free to arrange, composed from the deck's components in `@/components/deck` and reading every word from `copy`.

No word or figure is typed into the JSX: the gate's inline-text check (`scripts/check-inline-text.mjs`) fails on one and names the file and line, because a second language and the trace check cannot see it. The placeholder deck's files show every kind, layout and component.

## Visuals

The deck ships 18 preset visuals. Each is an example slide file in `src/presets/slides/`, with placeholder words: copy it into `src/slides/` with a number, put your words and figures in its `copy`, and change its JSX as you like. Open `/gallery` to see them all, with its own PDF:

- **Charts and stats:** bar, line and donut charts; stat cards.
- **Diagrams:** process flow, timeline, cycle, org chart, comparison table, 2×2 matrix.
- **Text layouts:** quote, statement, agenda, compare, image and text.
- **Image slides:** full-bleed image, captioned image, image grid. Your own images go in `public/images/`, each with a row in `docs/licences.md`; without one, a placeholder shows.

The `deck-visuals` skill (`.claude/skills/deck-visuals/`, with the same skill for Codex in `.agents/skills/deck-visuals/`) reads your material, proposes a preset for each slide, copies its file and keeps only what you confirm. When no preset fits, it composes a visual for your deck in the slide file itself, from the deck's components, with any component of its own in `src/deck/visuals/`. When you have no image, it offers to generate one with whatever generator you have, and only on your yes.

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
- **In a deck:** `npm run check:deck` never runs the scan. A deck in a public repository turns it on with the owner's own list: [Turn on the public scan](process/workflows.md#turn-on-the-public-scan).
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

## The deck's checks

A deck made from the template runs `npm run check:deck` ([`scripts/check-deck.mjs`](scripts/check-deck.mjs)) in place of the gate, before showing a slide. It runs `check` (lint, format and types), `build` (the production build and its PDFs), `fit` (the specs tagged `@deck`: every slide of the deck and the gallery fits at 390 and 1440 px, and each preset file renders when copied into a deck), `inline-text` and `trace`. It never runs the strips, the drift test or the public scan, and it needs no `.local/` file. Each check is reported as passed, failed or not run, in `gate-results/deck-report.md`.

## Licence

[MIT](LICENSE), for the template's code and the ported code. The Averlo name and mark are brand assets, excluded from the MIT licence: they are the default placeholder brand, not licensed for reuse. Every font, image, package and port is listed with its source and licence in [`docs/licences.md`](docs/licences.md).
