# Dry run of START.md (T413)

An agent followed the START.md prompt in a fresh clone of `d1-docs` (commit `0ece0ad`), with no `.local/`, on the template's own machine (Linux under WSL, Node 24.22.3), on 22 November 2026. There was no real owner, so the questions the agent would have asked are listed instead of answered, and no slide was written: the placeholder deck stayed as it was. Nothing was logged in to or deployed on Vercel, and nothing was pushed.

## What the agent did

| Step of the prompt | Procedure followed | What happened |
| --- | --- | --- |
| Read AGENTS.md | AGENTS.md | The request is the owner's own deck, so the "Making a deck" section applies, and its light rules replace the template's. |
| 1. Set up | [Set up a deck](../../../process/workflows.md#set-up-a-deck), steps 1 to 3 | `node --version` gave 24.22.3, so no install. `npm ci` took 21 s. `npx playwright install chromium` found the browser already there. `install-deps` was not run (see below). |
| 1. Prove it | Set up a deck, step 4 | `npm run check:deck` passed: check, build, fit, inline-text and trace, each passed (fit: 9 passed, 3 skipped by design in the phone project; trace: 7 passed). |
| 2. Start the deck | Set up a deck, step 5 | `npm run dev` printed `http://127.0.0.1:3000`; `/` and `/print` answered 200. The link would go to the owner. The server was then stopped by its process group id. |
| 2. Check saving | Set up a deck, step 6 | Not run: the clone's remote is a local folder, not the owner's GitHub repository, and nothing may be pushed from this run. |
| 3. Talk it through | [Draft a deck from any source](../../../process/workflows.md#draft-a-deck-from-any-source) | The questions below, one at a time. No answer, so no slide. |
| 4. Build the slides | Draft a deck from any source, steps 4 and 5 | Not run: there are no owner's words. |
| 5. Checks | AGENTS.md, Making a deck | `npm run check:deck`, as above. |
| 6. Save | [Save and share](../../../process/workflows.md#save-and-share) | Nothing to save: no change was kept. |
| 7. Online | Save and share, "Share it online" | Not run (no sign-in, no deploy). The commands were checked against Vercel CLI 66.6.0's help: `vercel login` signs in; `vercel deploy` has `--prod` and `--yes` ("Use default options to skip all prompts"), and links the folder on its first run; `vercel link` links a folder to an existing project. |

## The questions the agent would have asked

One at a time, in this order, writing each with its answer in `docs/context/answers.md`:

1. Could you share the material for the deck: your notes, documents or an old deck?
2. What is the deck for, and who will see it?
3. What should the deck be called?
4. Should it be in one language, or more?
5. Should it use the Averlo look, or your own brand? (For their own brand: could you send your logo and mark, and may they be published?)
6. Will your repository be public, and are there names of people, clients or products in the material that must never be online? (On a yes, [Turn on the public scan](../../../process/workflows.md#turn-on-the-public-scan).)

Then the outline proposed from the material's own headings, for the owner to confirm, and each slide's preset, from the `deck-visuals` skill.

## Steps that would have made the owner type a command, and the fixes

- **Permission prompts.** Codex and Claude Code may ask before a command runs or uses the network (`npm ci`, the browser download, `npx vercel`). The docs did not say so, so the owner would have met an unexplained prompt. Fixed: Set up a deck now says to tell the owner in one plain sentence what each one does before they click to allow it. It is a click, not a command.
- **Chromium's system libraries on Linux.** `npx playwright install-deps chromium` needs `sudo`, and an agent cannot type the password at its prompt. Research R2 decided that the agent then says what to ask for, so whoever looks after the computer would run that one command. Fixed: the step now says that the agent cannot type the password and stops there. This remains the one place where someone may type a command; it is raised with the owner below.
- **This machine's browser.** Under WSL, Chromium here needs `LD_LIBRARY_PATH`, which was set in the shell, not in the clone. An owner's macOS, Windows or Linux desktop is not expected to need it, and the docs do not cover WSL.

## Not verified here

- Opening the owner's repository in Codex or Claude Code without typing `git clone`: START.md leaves this to the app. Raised with the owner below.
- The GitHub sign-in a first push may ask for, and the push itself.
- The Vercel sign-in flow and a real deploy, including that the production address (`Aliased`) is public and the PDFs download from it.
- Whether Codex keeps `npm run dev` running in the background between turns.
- macOS and Windows: only Linux was run.

## Raised with the owner

1. How does the owner get the repository onto their computer, opened in Codex or Claude Code, without typing `git clone`? The docs say only "open it in Codex or Claude Code".
2. On Linux without the browser's system libraries, someone must run one `sudo` command (research R2). Is that exception acceptable, or should the docs say something else?
