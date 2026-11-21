# Design source

The template is built on the Averlo design system itself (constitution, Principle VIII). Its components, tokens, helpers and font come in as ports: whole, unchanged copies of the source files with every file they import, at a pinned commit (FR-008, FR-009a). How they are made, pinned, excluded and checked is the [port procedure](../process/workflows.md#port-the-design-system).

- **Manifest:** [`scripts/ports.manifest.json`](../scripts/ports.manifest.json) names each source repository, its commit, the entry files, the exclusions and the template-owned paths a port may never write.
- **Closure:** [`scripts/port-averlo.mjs`](../scripts/port-averlo.mjs) follows the entries' imports and writes the section between the markers below, plus [`scripts/ports.lock.json`](../scripts/ports.lock.json), which the drift test reads. Everything outside the markers is written by hand and kept.
- **Drift test:** `npm run check:ports` compares every port in the lock with its source, byte for byte.

## Packages added outside the closure

- `@tailwindcss/postcss` 4.3.0, averlo-web-transition's lockfile version: the PostCSS plugin that builds the ported `library.css`, which imports `tailwindcss`. The postcss config that uses it, `postcss.config.mjs`, is template-owned and copies averlo-web-transition's (T023).

## Styles: font and token bridge

`src/app/globals.css` (template-owned, T023) imports, in order, the ported `library.css` (which imports Tailwind, so Tailwind is not imported again), the questionnaire's ported `shell.css` for the top bar (T029, below), `src/styles/fonts.css`, `src/styles/tokens.css`, then the carried motion stylesheets `src/motion/motion.css` and `src/motion/route-transition.css`. `postcss.config.mjs` is averlo-web-transition's (`@tailwindcss/postcss`). `<html>` carries `class="dark"`, under which `library.css` defines its dark tokens, and the ported font's variable class (`--font-inter`).

- **Font** (research R6): `src/styles/fonts.css` sets `--font-body` and `--font-heading` on `body` to `var(--font-inter), var(--font-sans-fallback)`, in place of `library.css`'s `--font-sf-pro`, whose files are excluded.
- **Tokens** (research R7): `src/styles/tokens.css` defines every non-motion `--deck-*` variable the carried CSS reads from an Averlo token (`library.css`) or a Tailwind theme token it builds on. The motion variables (`--deck-motion-*`) are not bridged: they keep their carried values in `src/motion/motion.css`.

| `--deck-*` variable                                             | Averlo or Tailwind token                                                                                        | Read by                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `--deck-text-primary`                                           | `--color-foreground`                                                                                            | deck, menu, content                                     |
| `--deck-text-secondary`                                         | `--color-muted`                                                                                                 | deck, menu, content                                     |
| `--deck-text-tertiary`                                          | `--color-foreground` 60% over `--color-background` (`color-mix`, as `library.css` mixes `--color-muted` at 75%) | menu                                                    |
| `--deck-text-accent`                                            | `--color-accent` (`#ff3200`)                                                                                    | content                                                 |
| `--deck-base-white`                                             | `--color-foreground` (white under `.dark`)                                                                      | menu                                                    |
| `--deck-canvas`, `--deck-bg-canvas-top`, `--deck-bg-canvas-mid` | `--color-background`                                                                                            | intro, hard-load screen, print page, content (dot fill) |
| `--deck-surface-card-top`, `--deck-surface-card-bottom`         | `--color-surface`                                                                                               | menu card                                               |
| `--deck-surface-subtle`                                         | `--color-foreground` at 5% (Averlo's `foreground/5` hover fill)                                                 | deck (progress track), menu, content                    |
| `--deck-surface-highlight`                                      | `--color-background-hover`                                                                                      | menu                                                    |
| `--deck-border-subtle`, `--deck-border-glass-top`               | `--color-border`                                                                                                | deck, menu, content                                     |
| `--deck-border-strong`                                          | `--color-foreground` at 35% (Averlo's `foreground/35` outline hover border)                                     | menu, content                                           |
| `--deck-border-focus`                                           | `--color-primary` at 40% (Averlo's `ring-primary/40` focus ring)                                                | menu, content                                           |
| `--deck-action-secondary-bg`                                    | `transparent` (Averlo's outline button)                                                                         | menu                                                    |
| `--deck-action-secondary-border`                                | `--color-border` (Averlo's outline button)                                                                      | menu                                                    |
| `--deck-glass-card-backdrop`                                    | `blur(var(--blur-lg))`                                                                                          | menu                                                    |
| `--deck-glass-modal-backdrop`                                   | `blur(var(--blur-xl))`                                                                                          | menu card                                               |
| `--deck-glass-modal-shadow`                                     | `--shadow-xl`                                                                                                   | menu card                                               |
| `--deck-space-2` … `--deck-space-32`                            | `--spacing` × n/4 (2, 4, 8, 12, 16, 24, 32 px)                                                                  | deck, menu                                              |
| `--deck-radius-md`, `-lg`, `-xl`                                | `--radius-xl`, `--radius-2xl`, `--radius-3xl`                                                                   | menu, content                                           |
| `--deck-size-icon-button`                                       | `--spacing` × 7 (the Averlo `Button` size `icon-sm`)                                                            | menu                                                    |
| `--deck-type-title-l-weight`                                    | `--font-weight-semibold`                                                                                        | content                                                 |
| `--deck-type-size-label-m`                                      | `--text-sm`                                                                                                     | menu                                                    |

Under `prefers-reduced-motion: reduce`, `globals.css` sets Averlo's `--motion-*-duration` variables to 0 ms (important, over the values `MotionProvider` sets inline on `<html>`), so the ported controls' own transitions respect reduced motion as the deck's motion does.

The blurs are kept so the carried fades (the page step's `fade="glass"`, the menu's `fadeItems`) still find the same elements; the surfaces under them are Averlo's opaque ones.

## The top bar: the questionnaire's top (T029–T031)

The bar is the questionnaire's whole top, its header band and its progress navigator (FR-012; research R4), ported unchanged from averlo-questionnaire-template @ `756be64` into `src/questionnaire/` (the entries and their closure are in the generated section below). The SF Pro font files the shell stylesheet declares are excluded (owner: "Exclude the font files only"); no package was added, as the questionnaire's four (`clsx`, `motion`, `react`, `tailwindcss`) are already present (R2, rule 3).

### Composition

Template-owned `src/deck/TopBar.tsx` reproduces the composition lines of the questionnaire's `src/react.tsx` at `756be64`, using only the ports' public props and children:

| `react.tsx` lines | What                                                                                               | In the deck                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 246–257           | `foreground(accent)`: the text colour on the accent                                                | as is                                                                                                            |
| 823–827           | the `--aq-*` theme from the accent                                                                 | as is, from `config.accent` (`#ff3200`: hover `255 105 0`, active `230 45 0`)                                    |
| 1119–1120         | the wording context's provider; the `.aq` wrapper with `lang` and the theme inline                 | the deck's copy (`ui` in `src/deck/model.ts`) over `englishCopy`; `inert` (the questionnaire's startup) left out |
| 1123              | `.application`                                                                                     | without `data-questionnaire-surface`, `inert` and `aria-hidden`, which follow the questionnaire's cover          |
| 1124–1126, 1130   | `SharedHeader` with the brand: `Logo` as `.brand-logo`, `.brand-divider`, `.brand-sub` (the title) | the brand slot below; the sub-label is `config.deckTitle`; a press on the logo goes to slide 1                   |
| 1131              | `main.shell`                                                                                       | `div.shell`: the live slide is the deck's `main`                                                                 |
| 1133–1136, 1138   | `.topline`, `.progress-caption`, `.progress-caption-step` with `StepProgressLabel`                 | as is, without `data-review` (the deck has no review screen)                                                     |
| 1141–1142         | `.inline-progress` with `ProgressNavigator`                                                        | as is; `onNavigate(step)` goes to slide `step`                                                                   |

Left out: line 1121 (the test banner), 1122 (`ToastHost`), 1127 (the save chip), 1128–1129 (the language switcher; the deck's is in its menu), 1137 (the Review caption), 1139–1140 (the Review button: the deck has no review; owner: "Remove it, adjust parity", so the parity test removes it from the reference too), and everything from 1144 on (the questionnaire's own page). `includesSections` is set, so the navigator's labels speak of slides.

- **Brand slot** (FR-005): brand `averlo` shows the ported `Logo` (`src/questionnaire/primitives/Logo.tsx`). Brand `owner` with a `logo` (a path under `public/brand/`) shows it as an `<img>` in the `.brand-logo` box; without one, the "your logo" placeholder (inverted to read on the white page) and the brand's name as text in the shell's own `.brand-mark` style. The footer wordmark is the same name: "Averlo", or the owner's.
- **Wrapper, inline**: the `--aq-*` theme; `--font-sf-pro: var(--font-inter)` (R4), so the bar is set in Inter without editing a port; and `--muted: #767676`, as the shell's `#777777` muted text (the step label) is 4.47:1 on its white page, under the 4.5:1 the template needs (Principle VIII). It is the nearest grey that reaches it (approved by the owner).
- **Wrapper, template-owned CSS** (`src/deck/topbar.module.css`): the bar sits across the top of the stage (over the slides, under the footer and its menu card) and ends at the bottom of the navigator's track, measured by `TopBar` and set on the stage as `--deck-bar`, where the slides begin. Only the header band and the step label take presses; the shell's other boxes reach over the slides. The deck's Tailwind preflight sets `small` to 80%, which the questionnaire's page does not have, so the step label's `small` gets the browser's `smaller` back inside the bar. The step label's number gets the shell's own focus ring (`2px solid var(--accent)`), as the shell sets its outline to 0 and the template needs a visible focus (Principle VIII; approved by the owner). While the overview is expanded, the bar fades out on the deck's `exit` token and takes no presses, as the slide layer does: the overview card is glass, and the white page would show through it (owner: "Fade it after all"). On phones, under about 480 px wide or about 500 px tall, the whole bar is hidden (`display: none`), its track measures 0 and the slides take the whole stage; the footer's progress bar stays (owner: "on small screens its not neccesary can be removed").
- **Stylesheets**: `src/app/globals.css` imports the ported `shell.css` after `library.css`. The ported `utilities.css` (which imports `foundations.css` and Tailwind's theme and utilities) is not imported: `foundations.css` sets the questionnaire's light tokens on `:root` (`--color-background-rgb: 255 255 255`, `--color-foreground-rgb: 25 27 37`, and more) after `library.css`'s `.dark`, which turns the whole deck light. The questionnaire's own build scopes those rules to `.aq` before it ships them (its `scripts/copy-styles.mjs`), a transform the template would have to reproduce. The owner chose "Port, don't import" (spec, "During P4"): both files stay ported and drift-tested, as the closure of the bar's stylesheet, and are not imported. The bar renders at parity without them (`tests/topbar.spec.ts`): its look comes from `shell.css`, and the Tailwind utilities of the ported `Logo` from the deck's own Tailwind build.
- **Build settings** (`next.config.ts`, template-owned, R3a step 6): Turbopack resolves each `./<name>.js` specifier a questionnaire port names to the ported `.ts`/`.tsx` file (the list is read from `scripts/ports.lock.json`), and leaves the excluded SF Pro `url()`s unresolved (`"../questionnaire/fonts/*": false`): the built CSS keeps them as written, and the browser never fetches them, as no text uses that face.

### Shell rules not under `@scope (.aq)`

`src/questionnaire/shell.css` keeps most of its rules inside `@scope (.aq)`. These are outside it (line numbers in the ported file). None conflicts with the deck: no class or attribute they select is used outside the bar, which uses `.topline` and `.progress-caption` on purpose.

| Lines                          | Rules                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 323–326                        | `@font-face` "Averlo Questionnaire SF Pro", 400 to 700, `url(./fonts/SFPRODISPLAY*.otf)`: the excluded files, never fetched                                                                                                                             |
| 408–436                        | `html:has([data-aq-cover-comparison])` and `body`, `[data-aq-cover-comparison…] .aq …`, with a reduced-motion block: the questionnaire's cover comparison, which the deck never sets                                                                    |
| 439–449                        | `.progress-caption`, `.progress-caption > *`, `.progress-caption-review`, `.topline [data-progress-review-action][aria-hidden="true"]` and the `[data-review]` states, with a reduced-motion block: the bar's step label (used)                         |
| 469–475, 480–521, 524, 528–533 | `.option-text`, `.option-help`, `.choice …`, `.back-button svg`, `.review-a .review-option-help`, `.choice-grid.card-grid`, `.choice.card`, `.card-media*`, `.card-foot*`, `.choice .rank-badge`, with a 690 px block: the questionnaire's option cards |
| 554–578                        | `.key-entry*`, with a 640 px block: its access-key entry                                                                                                                                                                                                |
| 639–643                        | `.aq-info-panel`, `.aq-info-panel p`, `.aq-info-title`, `.aq-info-text`: its info tip's panel, portalled outside `.aq`                                                                                                                                  |
| 664–677                        | `[data-sonner-toaster] .aq-toast*`: its toasts                                                                                                                                                                                                          |

The other rules outside `@scope` all select inside `.aq` (lines 332–404, 451–466, 477–479, 522, 525–526, 537–551, 574, 582–637, 647–661), so they reach only inside the bar.

<!-- ports:begin -->

<!-- Written by scripts/port-averlo.mjs from scripts/ports.manifest.json; do not edit between these markers. -->

## Ported files

42 files from 3 sources, each a byte-identical copy of its source at the pinned commit. `npm run check:ports` compares them with the source (scripts/ports.lock.json).

### averlo-web-transition @ `cfa3d61`

Entries: `src/components/ui/foundations/focus.ts`, `src/components/ui/foundations/library.css`, `src/components/ui/foundations/iconAnimations.css`, `src/components/ui/foundations/motionTiming.ts`, `src/components/ui/foundations/spring.ts`, `src/components/ui/foundations/motionDisableOverride.ts`, `src/components/ui/foundations/settingsContext.tsx`, `src/components/ui/foundations/appearance.ts`, `src/components/ui/foundations/MotionProvider.tsx`, `src/components/ui/foundations/motionDriverContext.tsx`, `src/components/ui/primitives/Button.tsx`, `src/components/ui/primitives/Text.tsx`, `src/components/ui/primitives/Panel.tsx`, `src/components/ui/primitives/Dropdown.tsx`, `src/components/ui/primitives/Listbox.tsx`, `src/components/ui/primitives/dropdownStyles.ts`, `src/components/ui/primitives/Collapse.tsx`, `src/components/ui/overlays/Portal.tsx`, `src/components/ui/icons/Icon.tsx`, `src/components/ui/helpers/IconSwap.tsx`, `src/components/branding/Logo.tsx`.

| Source repository     | Commit    | Source path                                                           | Target path                                                           |
| --------------------- | --------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| averlo-web-transition | `cfa3d61` | `src/components/branding/Logo.tsx`                                    | `src/components/branding/Logo.tsx`                                    |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/MotionProvider.tsx`                    | `src/components/ui/foundations/MotionProvider.tsx`                    |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/appearance.ts`                         | `src/components/ui/foundations/appearance.ts`                         |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/focus.ts`                              | `src/components/ui/foundations/focus.ts`                              |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/iconAnimations.css`                    | `src/components/ui/foundations/iconAnimations.css`                    |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/library.css`                           | `src/components/ui/foundations/library.css`                           |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/motionDisableOverride.ts`              | `src/components/ui/foundations/motionDisableOverride.ts`              |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/motionDriverContext.tsx`               | `src/components/ui/foundations/motionDriverContext.tsx`               |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/motionTiming.ts`                       | `src/components/ui/foundations/motionTiming.ts`                       |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/settingsContext.tsx`                   | `src/components/ui/foundations/settingsContext.tsx`                   |
| averlo-web-transition | `cfa3d61` | `src/components/ui/foundations/spring.ts`                             | `src/components/ui/foundations/spring.ts`                             |
| averlo-web-transition | `cfa3d61` | `src/components/ui/helpers/IconSwap.tsx`                              | `src/components/ui/helpers/IconSwap.tsx`                              |
| averlo-web-transition | `cfa3d61` | `src/components/ui/icons/Icon.tsx`                                    | `src/components/ui/icons/Icon.tsx`                                    |
| averlo-web-transition | `cfa3d61` | `src/components/ui/motion/source/scheduler/GlobalMotionScheduler.tsx` | `src/components/ui/motion/source/scheduler/GlobalMotionScheduler.tsx` |
| averlo-web-transition | `cfa3d61` | `src/components/ui/motion/source/scheduler/context.ts`                | `src/components/ui/motion/source/scheduler/context.ts`                |
| averlo-web-transition | `cfa3d61` | `src/components/ui/overlays/Portal.tsx`                               | `src/components/ui/overlays/Portal.tsx`                               |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/Button.tsx`                             | `src/components/ui/primitives/Button.tsx`                             |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/Collapse.tsx`                           | `src/components/ui/primitives/Collapse.tsx`                           |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/Dropdown.tsx`                           | `src/components/ui/primitives/Dropdown.tsx`                           |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/Listbox.tsx`                            | `src/components/ui/primitives/Listbox.tsx`                            |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/LoadingSpinner.tsx`                     | `src/components/ui/primitives/LoadingSpinner.tsx`                     |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/Panel.tsx`                              | `src/components/ui/primitives/Panel.tsx`                              |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/Text.tsx`                               | `src/components/ui/primitives/Text.tsx`                               |
| averlo-web-transition | `cfa3d61` | `src/components/ui/primitives/dropdownStyles.ts`                      | `src/components/ui/primitives/dropdownStyles.ts`                      |
| averlo-web-transition | `cfa3d61` | `src/config/motionConfig.ts`                                          | `src/config/motionConfig.ts`                                          |
| averlo-web-transition | `cfa3d61` | `src/config/scrollConfig.ts`                                          | `src/config/scrollConfig.ts`                                          |
| averlo-web-transition | `cfa3d61` | `src/hooks/useMotionAllowed.ts`                                       | `src/hooks/useMotionAllowed.ts`                                       |
| averlo-web-transition | `cfa3d61` | `src/lib/i18n/config.ts`                                              | `src/lib/i18n/config.ts`                                              |
| averlo-web-transition | `cfa3d61` | `src/lib/i18n/routing.ts`                                             | `src/lib/i18n/routing.ts`                                             |
| averlo-web-transition | `cfa3d61` | `src/lib/i18n/usePublicPathname.ts`                                   | `src/lib/i18n/usePublicPathname.ts`                                   |

Excluded by the manifest: never copied, even when the closure reaches them; their references stay in the ported files unchanged.

| Excluded path                | Reason                                                                        | Reached by the closure |
| ---------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| `src/font/sf-pro-display/**` | SF Pro Display font files: Apple's font licence does not allow redistribution | no                     |

### averlo-next-template @ `dc3b01d`

Entries: `src/font/index.ts`.

| Source repository    | Commit    | Source path         | Target path         |
| -------------------- | --------- | ------------------- | ------------------- |
| averlo-next-template | `dc3b01d` | `src/font/index.ts` | `src/font/index.ts` |

### averlo-questionnaire-template @ `756be64`

Entries: `src/shared-header.tsx`, `src/progress-navigator.tsx`, `src/progress-model.ts`, `src/wording-context.ts`, `src/wording.ts`, `src/wording-defaults.ts`, `src/primitives/Logo.tsx`, `src/shell.css`, `src/utilities.css`.

| Source repository             | Commit    | Source path                  | Target path                                |
| ----------------------------- | --------- | ---------------------------- | ------------------------------------------ |
| averlo-questionnaire-template | `756be64` | `src/foundations.css`        | `src/questionnaire/foundations.css`        |
| averlo-questionnaire-template | `756be64` | `src/primitives/Logo.tsx`    | `src/questionnaire/primitives/Logo.tsx`    |
| averlo-questionnaire-template | `756be64` | `src/primitives/focus.ts`    | `src/questionnaire/primitives/focus.ts`    |
| averlo-questionnaire-template | `756be64` | `src/progress-model.ts`      | `src/questionnaire/progress-model.ts`      |
| averlo-questionnaire-template | `756be64` | `src/progress-navigator.tsx` | `src/questionnaire/progress-navigator.tsx` |
| averlo-questionnaire-template | `756be64` | `src/shared-header.tsx`      | `src/questionnaire/shared-header.tsx`      |
| averlo-questionnaire-template | `756be64` | `src/shell.css`              | `src/questionnaire/shell.css`              |
| averlo-questionnaire-template | `756be64` | `src/utilities.css`          | `src/questionnaire/utilities.css`          |
| averlo-questionnaire-template | `756be64` | `src/wording-context.ts`     | `src/questionnaire/wording-context.ts`     |
| averlo-questionnaire-template | `756be64` | `src/wording-defaults.ts`    | `src/questionnaire/wording-defaults.ts`    |
| averlo-questionnaire-template | `756be64` | `src/wording.ts`             | `src/questionnaire/wording.ts`             |

Excluded by the manifest: never copied, even when the closure reaches them; their references stay in the ported files unchanged.

| Excluded path  | Reason                                                                                                               | Reached by the closure                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/fonts/**` | SF Pro Display font files: Apple's font licence does not allow redistribution (owner: "Exclude the font files only") | `src/fonts/SFPRODISPLAYREGULAR.otf`, `src/fonts/SFPRODISPLAYMEDIUM.otf`, `src/fonts/SFPRODISPLAYBOLD.otf` |

## npm packages

Where the closure stops. Versions follow research R2: the origin's pins win for next, react, react-dom, motion, typescript, @playwright/test and eslint; otherwise averlo-web-transition's lockfile, then the other sources' for packages not yet present. Every override is named.

| Package                    | Imported by | Source lockfile                                                      | Version used | Rule                                                                                                                  |
| -------------------------- | ----------- | -------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `@phosphor-icons/react`    | 1 port      | averlo-web-transition 2.1.10                                         | 2.1.10       | averlo-web-transition's lockfile (R2 rule 2)                                                                          |
| `class-variance-authority` | 3 ports     | averlo-web-transition 0.7.1                                          | 0.7.1        | averlo-web-transition's lockfile (R2 rule 2)                                                                          |
| `clsx`                     | 9 ports     | averlo-web-transition 2.1.1; averlo-questionnaire-template 2.1.1     | 2.1.1        | averlo-web-transition's lockfile (R2 rule 2)                                                                          |
| `lucide-react`             | 2 ports     | averlo-web-transition 1.18.0                                         | 1.18.0       | averlo-web-transition's lockfile (R2 rule 2)                                                                          |
| `motion`                   | 6 ports     | averlo-web-transition 12.38.0; averlo-questionnaire-template 12.34.3 | 14.7.1       | override: the origin's pin wins over averlo-web-transition 12.38.0, averlo-questionnaire-template 12.34.3 (R2 rule 1) |
| `next`                     | 4 ports     | averlo-web-transition 16.2.6; averlo-next-template 16.4.3            | 16.4.5       | override: the origin's pin wins over averlo-web-transition 16.2.6, averlo-next-template 16.4.3 (R2 rule 1)            |
| `react`                    | 22 ports    | averlo-web-transition 19.2.6; averlo-questionnaire-template 19.3.0   | 19.3.1       | override: the origin's pin wins over averlo-web-transition 19.2.6, averlo-questionnaire-template 19.3.0 (R2 rule 1)   |
| `react-dom`                | 1 port      | averlo-web-transition 19.2.6                                         | 19.3.1       | override: the origin's pin wins over averlo-web-transition 19.2.6 (R2 rule 1)                                         |
| `tailwindcss`              | 2 ports     | averlo-web-transition 4.3.0; averlo-questionnaire-template 4.3.3     | 4.3.0        | averlo-web-transition's lockfile (R2 rule 2); overrides averlo-questionnaire-template 4.3.3                           |

<!-- ports:end -->
