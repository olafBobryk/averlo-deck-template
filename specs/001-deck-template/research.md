# Research: Averlo deck template

Sources were read at averlo-web-transition `cfa3d61`, averlo-questionnaire-template `60cf74b` (to be re-pinned after the upstream rename, R4) and averlo-next-template `dc3b01d`, plus the origin deck. The origin's location, commit and file-by-file inventory are kept in ignored local files (`.local/origin.md`, `.local/origin-inventory.md`) on the gate machine.

## R1 The origin deck's foundations are its product's design source

- **Finding:** Most of the origin's components, libraries and motion code are copies of its product's design source, and the engine sits on them.
- **Decision:**
  - The motion files are carried whole into `src/motion/`, with a rename of the product's identifiers and a detach of the product's screen-switch, registry and config code. The owner answered both ("Copy files, rename only"; "Detach them").
  - The visible components are replaced by Averlo ports (R3).
  - The rest of the origin's design-source files are used temporarily in P1 from a quarantine folder and deleted in P3.
- **Alternatives:** Re-implementing the motion from its values was declined by the owner. Keeping the product's names fails the public scan.

## R2 One `motion` version

- **Finding:** The origin uses motion 14.7.1. averlo-web-transition locks 12.38.0, and the questionnaire pins 12.34.3.
- **Decision:** Keep 14.7.1, because the carried motion's parity depends on it. Ports stay unchanged; typecheck, smoke and the strip diff prove they work.
- **If a port fails on 14.7.1:** add an entry to `docs/decisions/open-questions.md` and park the phase. Never patch the port.
- **Every other port dependency:** uses the version in its source repository's lockfile at the pinned commit.

## R3 Averlo port manifest (averlo-web-transition @ `cfa3d61`)

Entry files. The port script adds their whole import closure (R3a):

- `src/components/ui/foundations/`: `focus.ts`, `library.css`, `iconAnimations.css`, `motionTiming.ts`, `spring.ts`, `motionDisableOverride.ts`, `settingsContext.tsx`, `appearance.ts`, `MotionProvider.tsx`, `motionDriverContext.tsx`
- `src/components/ui/primitives/`: `Button.tsx`, `Text.tsx`, `Panel.tsx`, `Dropdown.tsx`, `Listbox.tsx`, `dropdownStyles.ts`
- `src/components/ui/overlays/Portal.tsx`, `src/components/ui/icons/Icon.tsx`, `src/components/ui/helpers/IconSwap.tsx`
- `src/components/branding/Logo.tsx`

Not ported:
- gsap: its own non-OSI licence, and unused.
- The reveal, scroll and auto-cycle motion: unused.
- Fonts whose licence forbids redistribution.

From averlo-next-template @ `dc3b01d`: `src/font/index.ts`.

### R3a Closure rule (used by `scripts/port-averlo.mjs` for all three sources)

1. **Follow** every TS/JS import, CSS `@import` and `url()`, and asset import (SVG, JSON, images), starting from the manifest's entry files.
2. **Resolve aliases** with the source repository's own tsconfig (averlo-web-transition: `@/*` → `./src/*`). The template's tsconfig declares the same alias, so ported imports resolve unchanged.
3. **Stop at npm packages.** Record each one with the source lockfile's version.
4. **Copy every file** to the same path relative to `src/`. The questionnaire's files go under `src/questionnaire/`, at their path relative to its `src/`.
5. **Write** the full closure, with source repository, commit and path, to `docs/design-source.md`.
6. **Never edit a port to make it compile.** If a port won't build unchanged, add an entry to `open-questions.md` and park the phase. Build configuration that lets unchanged files resolve (for example `.js` specifiers resolving to `.ts`) is template-owned and allowed.
7. **A pulled file that collides** with a template-owned path, or that contains a blocked term, stops the script.

## R4 The questionnaire's top bar, as is

- **Finding:**
  - The bar is composed in the questionnaire's `src/react.tsx` from its shared header component (brand Logo, divider and title on the left, controls on the right), its progress label, and its progress navigator inside an inline-progress wrapper.
  - Its CSS is mostly scoped under `.aq` and fed by `--aq-*` variables set inline (accent `#ff3200`, hover `255 105 0`, active `230 45 0`).
  - The navigator imports the questionnaire's wording modules.
  - Its files and comments carry a client's name, and the owner chose "Rename upstream first".
  - The header stays at its tall state (100 px; 76 px below 1024 px) because a deck never scrolls.
  - Its source files use `.js` import specifiers for `.ts` files.
- **Decision:**
  - P4 starts by renaming those names inside averlo-questionnaire-template on a branch, with a PR there that the owner merges. The port is then pinned to that merged commit.
  - The bar's files then come in through the port script, unchanged.
  - Template-owned `src/deck/TopBar.tsx` reproduces only the questionnaire's composition markup (the lines in its `react.tsx` that compose header, label and navigator, named by line range in `docs/design-source.md`). It uses only the ports' public props and children. The save chip and Review button are children of the header and the topline in `react.tsx`, so leaving them out needs no change to a port. If that turns out to be false, the phase is parked with an open question.
  - CSS rules of the shell stylesheet that are not under `@scope (.aq)` are listed in `docs/design-source.md`. If one conflicts with the deck, it becomes an open question, never a trim.
  - Wording defaults that carry questionnaire copy stay as they are. The deck's copy comes in only through the wording context.

## R5 Public scan without publishing the names

- **Decision:** `scripts/scan-public.mjs` reads blocked terms from the ignored `.local/public-scan-terms.txt`; the owner approved its contents.
- **It fails when:**
  - the file is missing or empty;
  - any term appears, case-insensitive, in tracked files, in `git log -p`, in commit messages or in branch names;
  - any font, image, package or port is missing from `docs/licences.md`.
- PR titles and bodies are written to pass the same terms.
- Running the scan in CI is deferred, since CI can't see the local list.

## R6 Fonts

- **Decision:** `src/font/index.ts` is ported from averlo-next-template: Inter through `next/font/google`, `--font-inter`. Template-owned `src/styles/fonts.css`, loaded after `library.css`, sets `--font-body` and `--font-heading` to `var(--font-inter), var(--font-sans-fallback)` on `body`. `library.css` stays unchanged.

## R7 Tokens

- **Decision:** In P1, the carried deck CSS's product-named colour, space, radius, type and motion variables are renamed to `--deck-*` along with every other product identifier. Template-owned `src/styles/tokens.css` (P3) defines each non-motion `--deck-*` variable from Averlo tokens, with its mapping table in `docs/design-source.md`. Motion variables keep their carried values.
- **Contrast:** text against its background must reach 4.5:1 with the bridge and with the default top-bar accent, checked by the a11y test.

## R8 Motion parity baselines

Recorded in P0 from the unchanged origin, built in a scratch copy, on the gate machine: 3 runs at 390 and 1440.

| Strip | Element (origin → template) | Values per frame | Normalisation |
|---|---|---|---|
| page-step-forward/back | entering and leaving slide layer (same element in both, by its role) | x, opacity | x / stage width |
| swipe-settle, swipe-springback | slide layer during a scripted drag | x, opacity | x / stage width |
| menu-open, menu-close | menu card clip box and controls row | clip inset (4 sides), opacity | inset / viewport width or height |
| menu-expand, menu-minimize | menu card bounds | width, height, x, y | / viewport width or height |
| overview | thumbnails | opacity, start time per index | none |
| intro | the mark element (origin orb poster → template brand mark), lock, gate | opacity, scale, timeline events (ms) | none |

- **Tolerance:** the per-value spread across the 3 runs, plus 0.005 of the normalised unit, 0.02 opacity, or 1 frame (16.7 ms) for timing.
- **Timing constants** (durations, springs, delays) are compared exactly from the motion module's exports.
- **Menu close:** it is baselined. Its origin timing test failed on the gate machine, so its tolerance comes only from the recorded runs, not from the origin's thresholds.
- The origin's 4 failing tolerance tests on the gate machine are not carried as thresholds.

## R9 Hard-load screen and intro mark

- **Decision:**
  - The carried hard-load screen (renamed, in `src/boot/`) composes the Averlo `Logo` (variant `mark`) where the orb was, with the same timing (200 ms fade, 400 ms minimum, 3 s cap).
  - The intro renders the same mark, or the owner's logo from the brand config, in the orb poster's place inside the fog, with every timing value kept.
  - "Your logo" is a template-owned neutral placeholder mark, shown for brand `owner` when no asset has been given yet.
  - The Averlo mark is the owner's own brand asset. `docs/licences.md` records its source, and that it may be redistributed in this template only as a placeholder. A deck's owner replaces it.
