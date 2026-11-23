# Agent instructions

A public template for full-screen web slide decks (Next.js) built on the Averlo design system: a deck engine, intro, menu and overview, and a print view with PDFs, with placeholder slides.

Two kinds of work happen here, each with its own rules. Pick the section by the request:

- **[Making a deck](#making-a-deck):** the owner wants their own deck: their slides, words, brand, or a link to share. This is the usual work in a repository made from the template, and the prompt at the top of the [README](README.md) asks for it.
- **[Working on the template](#working-on-the-template):** a change to the template itself: its engine, motion, ports, checks, docs or placeholder deck.

If the request could be either, ask the owner which one, in one plain question.

## Making a deck

Applies when the work is the owner's own deck. These light rules replace the template's rules below; the constitution says so in its Scope.

- **Only the owner's words and figures.** Never write slide text, figures or claims of your own; ask for them.
- **One plain question at a time,** in everyday words.
- **Never ask the owner to type a command.** Run every command yourself, and tell the owner only what to click or open. The one exception: on Linux, Chromium's system libraries need one `sudo` command; [Set up a deck](process/workflows.md#set-up-a-deck) says how to explain it.
- **Run `npm run check:deck` before showing anything.** If a check fails, fix it first; never show a broken slide as done.
- **No specs or approvals for slides.** The Spec Kit cycle, the port rules (ports unchanged, the drift test) and the motion parity rules don't apply to a deck: a deck may change its look.
- **Save each change the owner keeps:** a commit with a plain message, pushed to the owner's repository. No branches or pull requests for the owner.

The procedures, in [`process/workflows.md`](process/workflows.md):

1. [Set up a deck](process/workflows.md#set-up-a-deck): Node, the packages and the check browser on macOS, Linux or Windows, then the running deck and its link.
2. [Draft a deck from any source](process/workflows.md#draft-a-deck-from-any-source): the owner's material into slides, with the `deck-visuals` skill and the preset visuals.
3. [Save and share](process/workflows.md#save-and-share): commit and push each kept change; publish to Vercel after a one-time sign-in, and redeploy to the same link.
4. [Turn on the public scan](process/workflows.md#turn-on-the-public-scan): off for a deck until the owner turns it on with their own list, for a public repository.

## Working on the template

Applies when the work changes the template itself.

Follow the [constitution](.specify/memory/constitution.md). Claude Code loads it into every session through the `SessionStart` hook in `.claude/settings.json`; other agents read it now, before any change. Read the [orchestration guide](docs/orchestration.md) before delegating.

- **Public by design:** no client material or secrets; fonts, images and third-party files only when their licence allows redistribution, listed in `docs/licences.md`. Run the public scan before any push.
- **Never invent content.** A deck's words come from its owner, talked through from any source; the template ships placeholders.
- **Spec or light path is your call, and it is recorded:** features run the full Spec Kit cycle with the owner's approval before implementing; defects and small tweaks take the light path. When unsure, spec.
- **Averlo design-system code is ported unchanged** at a pinned commit; a port that differs is a defect.
- **The deck's motion keeps close parity** with its polished values, proven by the frame diff.
- **Regression evidence before offering to land;** report anything not run as not run.
- **Push and open PRs freely once the gate passes; the owner merges.** Merge commits, never squash.
- Use [`WORKFLOWS.md`](WORKFLOWS.md) as a names-only menu; procedures live in [`process/workflows.md`](process/workflows.md).
