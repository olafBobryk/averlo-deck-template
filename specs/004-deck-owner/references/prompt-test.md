# Real run of the README prompt (T417)

On 23 November 2026, at the owner's request ("Yes, test it"), a fresh agent was given only the README's prompt, in an empty folder on the template's own machine (Linux under WSL, Node 24.22.3, `gh` signed in). The test rules stood in for the owner: the deck's name, and stopping at the first question about material. No slide was written, nothing was pushed to the copy, and nothing was deployed on Vercel.

## What it did

| Step | From | Result |
| --- | --- | --- |
| 1. Own copy | "Set up a deck", step 0 (found by reading the template's docs on GitHub) | `gh repo create … --template olafBobryk/averlo-deck-template --private`, then `gh repo clone … .`: a private copy, full on the first clone. |
| 2. AGENTS.md | the copy's "Making a deck" | Followed "Set up a deck" steps 1 to 6. |
| 3. Setup | steps 1 to 3 | Node 24 present; `npm ci` in 19 s; `npx playwright install chromium`; `install-deps` stopped at `sudo`, as the docs say. |
| Checks | step 4 | Without Chromium's system libraries, `check:deck`'s build failed (the PDFs render in Chromium) and fit did not run. With them, every check passed in 181 s. |
| 4. Start | step 5 | `npm run dev` served http://127.0.0.1:3000 (200); stopped by its process group. |
| Saving | step 6 | `git push --dry-run`: up to date, no sign-in asked. |

First question at step 5: "Could you share the material you'd like the deck made from, such as notes, documents or an old deck? You can drag the files into this chat, or tell me which folder they're in on this computer."

## Fixed from it

- The prompt didn't point to step 0's procedure: it now names "Set up a deck".
- The prompt promised no typed commands, while Linux may need one `sudo` line: it now says how such a line is asked for.
- Without the libraries the build fails, not only the checks: the step says so.
- The deck's name was asked at step 0 and its title again when drafting: the answer is now recorded as the title. A name already taken is asked again.
- "Stop it by its process id" left `next` running under `npm`: it now says the process group.

## Left as they are

- The copy's AGENTS.md opens with "A public template…", and the Claude Code hook loads the template's constitution into a deck's sessions, headed by the note that a deck follows "Making a deck".
