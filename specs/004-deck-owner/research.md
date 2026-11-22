# Research: The deck owner's side

## R1 check:deck

- **Decision:** `scripts/check-deck.mjs` reuses `scripts/gate.mjs`'s runner. It runs `check`, a production build, the fit and slide specs (a Playwright project filter or a grep tag `@deck`), the words-in-copy check and the trace check, and reports each as passed, failed or not run.
- **Not run:** the strips, ports and scan.
- **Without `.local/`:** it needs no `.local/` files. Chromium's library path is read from `.local/env` only when present.

## R2 Setup by prompt

- **Decision:** the deck section lists per-OS steps: Node 24 (nvm or the installer), `npm ci`, `npx playwright install --with-deps chromium` (on Linux without sudo, the agent says what to ask for), `npm run dev`. The agent runs them and explains only what the owner must click.

## R3 Publishing

- **Decision:**
  - The owner signs in with `npx vercel login` (a browser device code), guided by the agent.
  - `npx vercel deploy --prod` from the repo links a project on the first run.
  - Redeploys go to the same project.
  - The production link is shared.
  - Vercel builds PDFs with `@sparticuz/chromium`, as the origin did.

## R4 Constitution amendment 1.1.0

- **Decision:** a minor version. A new "Scope" paragraph says the principles bind work on this template; a deck made from it follows AGENTS.md's "Making a deck" section, whose rules keep Principle III (content never invented) and run `check:deck`. The changelog entry cites the owner's answer.
