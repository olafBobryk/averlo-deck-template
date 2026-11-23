# Workflows

The procedures behind the names in the workflow menu, [`WORKFLOWS.md`](../WORKFLOWS.md).

## Set up a deck

How an agent gets a deck owner's computer ready and the deck running, on macOS, Linux or Windows (feature 004, FR-006; research R2). It applies to a deck made from the template ([AGENTS.md, Making a deck](../AGENTS.md#making-a-deck)). The agent runs every command. The owner only clicks what the agent names, such as an installer or a sign-in page, and is asked one plain question at a time.

### What you need

- Codex or Claude Code open on a folder on the owner's computer: an empty one, or one that already holds their copy of the template. The owner pastes the README's prompt there, and nothing else (owner, 2026-11-23: "one setup prompt start to end on the readme").
- A browser the owner can open links in, and a GitHub account (step 0 helps them make one).

Codex and Claude Code may ask the owner before a command runs, or before it uses the network (`npm ci`, the browser download, `npx vercel`). Before each one, tell the owner in one plain sentence what it does, so they know what they are allowing when they click.

### Steps

0. **The owner's own copy.** Skip this if the folder already holds a copy of the template (it has `AGENTS.md` and `src/slides/`). Otherwise:
   - Ask the owner one question: what to call the deck. Its repository is named after it, in lowercase words joined by hyphens.
   - If the owner has no GitHub account, tell them to open github.com/signup and sign up, then continue.
   - Make the repository from the template, **private** unless the owner says otherwise. With the GitHub CLI (`gh`): if `gh auth status` says it isn't signed in, run `gh auth login --web`, and tell the owner to open the page it names and enter the code it shows. Then run `gh repo create <name> --template olafBobryk/averlo-deck-template --private`, and `gh repo clone <name> .` to put it in this folder (GitHub may take a few seconds to fill a new copy: if the clone is empty, wait and clone again).
   - Without `gh`: ask the owner to open https://github.com/new?template_name=averlo-deck-template&template_owner=olafBobryk, type the name, choose **Private** and click **Create repository**, then tell you its address. Clone it into the folder with `git clone <address> .`. If git asks for a GitHub sign-in, tell the owner what to click in the window that opens.
   - Read the copy's `AGENTS.md`, and follow its "Making a deck" section from here on.
1. **Node 24.** Run `node --version`. The deck needs version 24 (`.nvmrc`, and `engines` in `package.json`). If Node is missing or another version:
   - **macOS:** with nvm installed, run `nvm install` and `nvm use` in the repository (they read `.nvmrc`). Without it, ask the owner to download the Node 24 installer for macOS from nodejs.org and click through it.
   - **Linux:** install nvm with the install command in its README (github.com/nvm-sh/nvm), then run `nvm install` and `nvm use`. No password is needed.
   - **Windows:** ask the owner to download the Node 24 installer for Windows (`.msi`) from nodejs.org and click through it, keeping the default options.

   After an installer, the agent's terminal may not see Node until the app is restarted. If `node --version` still fails, tell the owner to close and reopen Codex or Claude Code, then continue.

2. **The packages.** Run `npm ci`.
3. **The check browser.** The checks and the PDFs use Chromium. Run `npx playwright install chromium`.
   - **Linux** may also need Chromium's system libraries. Run `npx playwright install-deps chromium`. It needs administrator rights (`sudo`), and an agent cannot type the password at its prompt. If it stops there, or fails without the rights, this is the one command the owner types (owner, 2026-11-23): tell them in plain words that the computer is missing a few parts the test browser needs, give them `sudo npx playwright install-deps chromium` to paste into a terminal, say that it asks for their computer password, and continue once they say it finished. Until then, the checks that use the browser fail.
4. **Prove it.** Run `npm run check:deck`. On a fresh copy every check passes; if one fails, fix the cause before you go on (the report names it, in `gate-results/deck-report.md`).
5. **Start the deck.** Run `npm run dev` in the background and keep it running. When it prints its address, give the owner the link, http://127.0.0.1:3000, to open in their browser. When you stop it, stop it by its process id.
6. **Check that you can save.** Run `git remote -v` and `git push --dry-run`. If the push asks for a sign-in to GitHub, tell the owner what to click in the window that opens. Then go on with [Draft a deck from any source](#draft-a-deck-from-any-source).

## Draft a deck from any source

How an agent turns a deck owner's material into slides (FR-016, User Story 3). The deck's words come from its owner (constitution, Principle III): the agent arranges them, and never writes slide text, figures or claims of its own.

To pick each slide's visual, use the `deck-visuals` skill (`.claude/skills/deck-visuals/SKILL.md`): it proposes a preset per slide from the material's structure, and the owner confirms each one.

Each slide is a numbered file in `src/slides/`, `NN-name.tsx` (feature 003, `specs/003-jsx-slides/contracts/slide-file.md`). It exports `meta` (its kind, section and layout), `copy` (every word and figure it shows, for each language, its title among them) and a default component, free JSX from `@/components/deck` that reads its words from `t`. A preset is an example slide file in `src/presets/slides/`: copy it into `src/slides/` with a number, put the owner's words and figures in its `copy`, and change its JSX freely.

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
   - until they arrive, the intro, the hard-load screen and the top bar's brand slot show the "your logo" placeholder, and the brand slot shows the name beside it. Say so to the owner;
   - when they arrive, follow [Change the brand](#change-the-brand).
4. **Agree the outline.** Propose sections and slide titles taken from the source's own headings and phrases. The owner confirms, cuts, adds or reorders. Write their answer down.
5. **Draft each slide.** Copy the fitting preset file into `src/slides/` with the slide's number (the skill picks it), or start from the placeholder slide whose kind and layout fit (the tables below). Put the owner's words and figures in its `copy`, replacing every placeholder, and change the JSX freely: drop a part the owner gave no words for, add, rearrange or mix components. Never type a word or a figure into the JSX: the inline-text check fails on it. Remove the placeholder slides the deck does not use, and renumber so the files run in the agreed order.
6. **Show the owner** the deck (`npm run dev`), slide by slide, and ask about every slide you were unsure of. Change only what they answer.
7. **Check the draft** (below).

### Where content goes

| What                                    | Where                                                  |
| --------------------------------------- | ------------------------------------------------------ |
| Slides, their order and their text      | `src/slides/NN-name.tsx`: `meta`, `copy` and the JSX   |
| Languages                               | `langs` and `langNames` in `src/deck/langs.ts`         |
| Brand, deck title, top-bar accent       | `config` in `src/brand/config.ts`                      |
| The owner's logo and mark               | `public/brand/`, each with a row in `docs/licences.md` |
| The source and the answers (never sent) | `docs/context/` (ignored)                              |

### Slide kinds, layouts and components

The types are in `src/deck/slide.ts` (`SlideMeta`, `Copy`, `SlideProps`); the placeholder deck in `src/slides/` uses each kind, layout and component, and its showcase re-exports every preset file.

A slide's **`meta`** has a `kind`, on dividers and content slides a `section` (shown in the footer) and an optional `parent`, each naming a key of `copy`, and a `layout`.

| Kind      | Use                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| `title`   | The first slide: the deck's title, with an optional lead.                                                        |
| `divider` | Opens a section. In the menu's slide list, its row opens and closes the slides after it with the same `section`. |
| `slide`   | A content slide: a headline over its components.                                                                 |
| `closing` | The last slide.                                                                                                  |

A slide with a `layout` draws `Heading` (its title small over its `headline`, the point it makes, with an optional `muted` lead-in) and its components in that composition. Without a `layout`, it draws `Title`, the title large.

| Layout      | Draws                                          |
| ----------- | ---------------------------------------------- |
| `stack`     | The heading over the components.               |
| `split`     | The heading on the left, the components right. |
| `split-end` | `split`, mirrored.                             |
| `center`    | A quote or a closing line in the middle.       |
| `statement` | One large claim at the bottom left.            |
| `module`    | Draws as `stack`: it has no rules of its own.  |

Each component sits in a `Block` (`<Block type="points">`) inside `Body`, which keep the deck's frame and entrance. The preset components (charts, stats, diagrams, text layouts and images) are in the skill's [preset reference](../.claude/skills/deck-visuals/references/presets.md). Feature 001's components:

| Component | Shows                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Lead`    | One line of text; `size="statement"` makes it large.                                                                   |
| `Points`  | Labelled points in 2 to 5 columns (3 by default), as cards (the default), numbered rows or chips, with optional icons. |
| `Steps`   | Steps with a status (done, current, upcoming), as a rail (the default) or across.                                      |
| `Facts`   | Label and value pairs.                                                                                                 |
| `Note`    | A short note; `**bold**` marks emphasis.                                                                               |
| `Org`     | One node over the roles that report to it.                                                                             |
| `Fork`    | One stage branching into options.                                                                                      |
| `Week`    | A working week with its fixed moments.                                                                                 |
| `Plan`    | A time axis from `start` to `end` (YYYY-MM), with dated marks and spans.                                               |

### Check the draft

1. **Every word and figure traces.** Each sentence or phrase in a slide's `copy`, labels included, appears, ignoring case and spacing, in the source or the answers file (SC-006), and each figure is one they write. Read the draft against both; anything that does not trace goes back to the owner as a question. `tests/docs/workflow-trace.spec.ts` applies the same rule to every slide file's `copy`, and to the template's dry run on its sample (`tests/fixtures/drafted-slides/` from `tests/fixtures/sample-source.md`).
2. **No inline text.** `node scripts/check-inline-text.mjs` passes: no word or figure is typed into a slide's JSX (it runs in `npm run test:tools` too).
3. **Brand.** With Averlo, the intro, the hard-load screen and the top bar's brand slot show the Averlo mark; with another brand and no assets yet, the "your logo" placeholder.
4. **Fit.** Every slide's visible text and components fit inside its stage at 390 px and 1440 px (`tests/deck.spec.ts` checks it). In development, an overflowing slide, and a component over its limits (`src/components/deck/limits.ts`), are named in the browser console.
5. **Public.** If the public scan is turned on ([Turn on the public scan](#turn-on-the-public-scan)), `npm run scan:public` passes.
6. **Checks.** In a deck, `npm run check:deck` passes before you show the owner anything; it runs 2 and 4, the trace check and the build. On the template itself, [run the gate](#run-the-gate) before offering the change to land.

## Save and share

How an agent keeps a deck owner's work saved and puts the deck online (feature 004, FR-007, FR-010; research R3). The agent runs every command and tells the owner only what to click.

### Save each change

After each change the owner keeps (they said yes to it):

1. `npm run check:deck` passes. With the public scan turned on, `npm run scan:public` passes too ([Turn on the public scan](#turn-on-the-public-scan)).
2. `git add -A`, then `git commit -m "<what changed, in a plain sentence>"`, such as "Add the timeline slide".
3. `git push`, to the branch the repository is on (`main`). No branches and no pull requests for the owner.

The owner's material and answers stay in `docs/context/`, and machine files in `.local/`: both are ignored, so they are never committed.

### Share it online

The deck goes on Vercel's free plan. The first time, the owner signs in once:

1. **Sign in.** Run `npx vercel login`. It shows a link and a code, or opens the browser. Tell the owner to open the link, sign up or sign in (a free Hobby account; they can sign in with GitHub), and approve the code.
2. **Deploy.** Run `npx vercel deploy --prod --yes`. The first run links the folder to a new Vercel project, named after the folder, and remembers it in `.vercel/` (ignored). Vercel's build runs `npm run build`, which renders the PDFs too (with `@sparticuz/chromium`).
3. **Share the link.** When it finishes, give the owner the project's production address, the one the output lists as `Aliased` (usually `https://<project>.vercel.app`), not the one-off deployment address, which Vercel may keep behind its sign-in. Open it, and download a PDF from the menu, before saying it works.

**Later changes:** when the owner asks to update the online deck, save the change, then run `npx vercel deploy --prod --yes` again from the same folder. It goes to the same project, so the same link shows the new deck. On another computer, run `npx vercel link` first and pick the same project.

## Turn on the public scan

How a deck owner's repository that is public stops private names from being published (feature 004, FR-008). In a deck the scan is off: `npm run check:deck` never runs it. Offer to turn it on when the repository is public and the material names people, clients or products the owner may not want online.

1. **Ask for the list.** Ask the owner, in one plain question, which names must never appear online. Write them one per line in `.local/public-scan-terms.txt`. `.local/` is ignored, so the list is never committed; never copy a name from it into a slide, a commit or a message.
2. **Run it before every push.** From now on, [Save and share](#save-and-share) runs `npm run scan:public` after `npm run check:deck`. It fails when a name on the list appears in the repository's files, history, commit messages or branch names, or when a font, image or package has no row in `docs/licences.md`. It never prints the name: it names the file.
3. **Fix what it finds** before the push: take the name out of the file it names, or add the missing licence row (ask the owner where each of their images came from). If a name is already in the pushed history, stop and tell the owner in plain words; whether to rewrite published history is their call.

The list lives on this computer only. On another computer, ask for it again, or set `SCAN_TERMS_FILE` to where the owner keeps it.

## Change the brand

The brand is set in `src/brand/config.ts` (FR-005; the contract is `specs/001-deck-template/contracts/deck-config.md`).

1. Ask the owner for the logo and the mark, and whether they may be published. Never make them up.
2. Put the files in `public/brand/`, for example `public/brand/mark.svg`.
3. Add a row for each file to [`docs/licences.md`](../docs/licences.md), with its source and licence. If it may not be redistributed, it may not be committed to a public repository.
4. In `src/brand/config.ts`, set `brand: { kind: "owner", name: "<name>", logo: "logo.svg", mark: "mark.svg" }`. `logo` and `mark` are paths under `public/brand/`. Without `mark`, the "your logo" placeholder shows.
5. Set `deckTitle` (it also names the browser tab and the home-screen app), and `accent` if the owner gives a colour. The accent sets the `--aq-*` variables of the top bar and the navigator, which pick black or white text on it; that text must keep 4.5:1 contrast. The logo sits on the deck's dark background, so ask for a version that reads on dark.
6. Run `npm run scan:public` and the gate. The brand test (`tests/brand.spec.ts`) checks the mark the config chooses; the top-bar test (`tests/topbar.spec.ts`) checks the brand slot, and that the footer carries no brand.

The brand then shows in these places:

- the top bar's brand slot: `logo`, or without it the "your logo" placeholder and `name` as text, followed by `deckTitle`, muted;
- the intro and the hard-load screen: `mark`, or without it the placeholder;
- the app icons (the browser tab and the home screen): `mark`, or without it the placeholder.

The footer carries no brand.

To go back to Averlo, set `brand: { kind: "averlo" }`.

## Add a language

One language is the default (FR-007). A deck adds one by configuration and strings.

1. Add its code to `langs` in `src/deck/langs.ts`, and its name, written in that language, to `langNames` there. The first code is the default. The menu's language switcher and its PDF downloads show the name.
2. Add the language to every `copy`: in each slide file in `src/slides/`, an entry for the new code with every key the first language has, its title among them, and in each preset file under `src/presets/slides/` (the gallery draws them). Numbers stay as they are; words come from the owner. Add a string in that language to the interface strings (`ui`) in `src/deck/model.ts` and to the intro's `loading` in `src/gate/Intro.tsx` too. Ask the owner for every translation (Principle III). `npm run check` fails on a `copy` that misses the language or a key its slide reads, and on an interface string that misses the language.
3. Run the gate. With two or more languages the menu shows the language switcher, and links carry `?lang=` for every language but the first. The build renders one PDF per language, `<slug>-<lang>.pdf` (`src/deck/pdf-name.ts`).

To remove a language, remove its code from `langs`, its name, its strings and its entry in every `copy`.

After changing the preset files, run `npm run presets:doc`, which regenerates the deck-visuals skill's preset reference from them.

## Promote a visual to a preset

A deck's composed visual is JSX in one of its slide files, with any component of its own in `src/deck/visuals/` (feature 002, research D3; feature 003). When the owner asks for it to become a shared preset (FR-011), make it one. Promotion is a feature change to the template, so it takes the spec path unless the owner has already approved it (constitution, Principle IV).

1. **Make it a component.** Move its component from `src/deck/visuals/` to `src/components/deck/<family>/`, where `<family>` is `charts`, `diagrams`, `text` or `images`, with its styles in `src/presets/<family>/`, and export it from `src/components/deck/index.ts`. It takes its words and figures as typed props, plain strings and numbers, and stays composed from Averlo parts only, with no colour literal; ports are never edited. Give its block type to `BlockType` in `src/components/deck/Slide.tsx`. A limit its props' types cannot say (how many items it takes) goes in `src/components/deck/limits.ts`, with a `reportLimits` call in the component.
2. **Write its example files.** `src/presets/slides/<file>.tsx` is a complete slide file with placeholder words and placeholder numbers only, all in `copy`; `src/presets/slides/alternates/<file>.tsx` is a second, different one. Change the deck's slide file that drew the visual to import the component from `@/components/deck`.
3. **Add a registry entry** in `src/presets/registry.ts`: its `name`, its `file`, `family`, `block`, one line of what it `fits` and its `layout`. The gallery draws both example files from the entry. Add a showcase slide to the placeholder deck that re-exports the file (`export { copy, default, meta } from "@/presets/slides/<file>";`), numbered in the registry's order before the closing slide, and renumber the files after it.
4. **Name it in the skill's selection rules**: a row in the table of `.claude/skills/deck-visuals/SKILL.md` with its file's path, copied to `.agents/skills/deck-visuals/SKILL.md` so the two stay identical.
5. **Regenerate** the index and the reference: `npm run slides`, then `npm run presets:doc`.
6. **Run the tests.** `npm run test:tools` checks the registry, the components' limits, the inline-text rule and the skill; the gallery spec (`tests/presets/gallery.spec.ts`) checks that the new slides render and fit at 390 and 1440 and pass contrast. Add the component's own tests to `tests/tools/presets_test.mjs` (its limits) and to the gallery spec, then [run the gate](#run-the-gate).

## Run the gate

`npm run gate` ([`scripts/gate.mjs`](../scripts/gate.mjs)) is the regression evidence before work is offered to land (constitution, Principle V; FR-021).

### What you need

- `.local/env`, ignored, with `LD_LIBRARY_PATH`, `PORT_SOURCES_DIR`, `SCAN_TERMS_FILE`, `ORIGIN_URL` and `TARGET_URL`. The gate loads it and names any value that is missing. Values already set in the environment win. `ORIGIN_URL` serves the origin build only while the template has no `src/app`, so once the app exists a missing `ORIGIN_URL` is named but changes no check.
- Chromium for Playwright (`npx playwright install chromium`).
- Nothing else answering at `TARGET_URL`, `SMOKE_PORT` (3198 by default) or `PDF_PORT` (3199 by default): the checks start their own servers there. If something already answers at `TARGET_URL`, the `strips` check fails. If `PDF_PORT` is busy, the PDF render stops with an error naming the port, and the build fails.

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
