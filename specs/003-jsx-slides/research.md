# Research: Slides as JSX

## R1 Ordering and discovery

- **Decision:** `scripts/slides-index.mjs` reads `src/slides/*.tsx`, sorts them by their numeric prefix, fails on a duplicate or missing number, and writes `src/slides/index.ts`. That file imports each slide's `meta`, `copy` and component, and builds the `Slide[]` the engine uses today. It runs before `dev`, `build` and `check`.
- **Rationale:** the engine and motion stay unchanged, and there's no runtime file system access.
- **Alternatives:**
  - webpack's `require.context` (rejected: Turbopack support varies);
  - a hand-kept list (rejected: the owner chose number names for order).

## R2 Words

- **Decision:**
  - `copy` is `satisfies Copy<Keys>`, a record with one entry per language in `langs`, each with the same keys. A missing language or key fails `tsc`.
  - The component receives `t` (the current language's words) and `lang`.
  - The title lives in `copy`; the menu and overview read it.

## R3 Inline text check

- **Decision:**
  - A check parses each slide file with the TypeScript compiler API (already installed) and fails on JSX text, or a string-literal JSX attribute that renders text (`label`, `title`, `alt`, `children`), outside `copy`.
  - Numbers fed to a chart's data from `copy` are allowed.
  - It's a node test in `tests/tools/`, run by the gate's tools step.

## R4 Components

- **Decision:** each block's renderer moves from `SlideBody.tsx` and `src/presets/*` into a named component. Each takes typed props, reuses today's markup and CSS modules, and adds nothing new. The carried `SlideBody.tsx` is detached once no slide uses the block switch.
