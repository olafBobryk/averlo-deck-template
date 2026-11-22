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
| `--deck-surface-subtle`                                         | `--color-foreground` at 5% (Averlo's `foreground/5` hover fill)                                                 | menu, content                                           |
| `--deck-surface-highlight`                                      | `--color-background-hover`                                                                                      | menu                                                    |
| `--deck-border-subtle`, `--deck-border-glass-top`               | `--color-border`                                                                                                | menu, content                                           |
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

## The top bar and the navigator: the questionnaire's top (T029–T031, T045–T046)

The questionnaire's whole top, its header band and its progress navigator (FR-012; research R4), is ported unchanged from averlo-questionnaire-template @ `756be64` into `src/questionnaire/` (the entries and their closure are in the generated section below). The SF Pro font files the shell stylesheet declares are excluded (owner: "Exclude the font files only"); no package was added, as the questionnaire's four (`clsx`, `motion`, `react`, `tailwindcss`) are already present (R2, rule 3).

After reviewing the merged build, the owner split it in two (spec, "After reviewing the merged build"): the header band stays at the top as an overlay over the slides, with no white band ("keep the top bar as overlay"), and the navigator replaces the footer's progress line at the bottom edge, its mound pointing up ("the bottom track becomes this track. We simply just invert the direction in which the mound goes"). The step label left the top: the top keeps only the brand and the title. Its typed jump came back in the footer (owner: "Yes, in the footer"): the footer's slide number (template-owned `src/deck/slide-number.tsx`) behaves as the questionnaire's `StepProgressLabel`, but keeps the footer's padded count, as the port's markup and styles live in its `.aq` scope and print the number unpadded.

### Composition

Template-owned `src/deck/TopBar.tsx` and `src/deck/navigator.tsx` reproduce the composition lines of the questionnaire's `src/react.tsx` at `756be64`, using only the ports' public props and children:

| `react.tsx` lines | What                                                                                               | In the deck                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 246–257           | `foreground(accent)`: the text colour on the accent                                                | as is, in `TopBar.tsx`                                                                                                            |
| 823–827           | the `--aq-*` theme from the accent                                                                 | as is, from `config.accent` (`#ff3200`: hover `255 105 0`, active `230 45 0`); `theme()` in `TopBar.tsx`, shared by the navigator |
| 1119–1120         | the wording context's provider; the `.aq` wrapper with `lang` and the theme inline                 | in both: the deck's copy (`ui` in `src/deck/model.ts`) over `englishCopy`; `inert` (the questionnaire's startup) left out         |
| 1123              | `.application`                                                                                     | the top bar's, without `data-questionnaire-surface`, `inert` and `aria-hidden`, which follow the questionnaire's cover            |
| 1124–1126, 1130   | `SharedHeader` with the brand: `Logo` as `.brand-logo`, `.brand-divider`, `.brand-sub` (the title) | the top bar: the brand slot below; the sub-label is `config.deckTitle`; a press on the logo goes to slide 1                       |
| 1141–1142         | `.inline-progress` with `ProgressNavigator`                                                        | the navigator, in its own `.aq` wrapper in the footer's `[data-progress]`; `onNavigate(step)` goes to slide `step`                |

Left out: line 1121 (the test banner), 1122 (`ToastHost`), 1127 (the save chip), 1128–1129 (the language switcher; the deck's is in its menu), 1131–1140 (`main.shell` and its `.topline`: the step label, and the Review caption and button; the owner removed the step track from the top and Review earlier: "Remove it, adjust parity"), and everything from 1144 on (the questionnaire's own page). `includesSections` is set, so the navigator's labels speak of slides. In print (`still`), the navigator is `disabled`: it shows the progress and takes no pointer.

- **Brand slot** (FR-005): brand `averlo` shows the ported `Logo` (`src/questionnaire/primitives/Logo.tsx`), whose mark is drawn in `currentColor`: the wrapper's CSS sets it to the Averlo foreground, so it is light on the dark page. Brand `owner` with a `logo` (a path under `public/brand/`) shows it as an `<img>` in the `.brand-logo` box; without one, the "your logo" placeholder (drawn white, as on the intro) and the brand's name as text in the shell's own `.brand-mark` style. The footer has no wordmark (owner: "no branding in the footer").
- **Wrappers, inline**: the `--aq-*` theme, and `--font-sf-pro: var(--font-inter)` (R4), so the bar and the navigator are set in Inter without editing a port. The P4 `--muted: #767676` override (for 4.5:1 on the white page) is gone with the white page.
- **The brand's place** (T048; owner: "align to slide text and create padding / margins"): the band's `.top-inner` drops the shell's centred 1120 px column, its 40 px padding and its 100 px (76 px) height, which `SharedHeader` sets inline and the wrapper's CSS overrides. The brand starts where a slide's text starts (6 slide units in, 24 px on a narrow portrait screen), with the footer's gutter, max(16 px, 3 units), above it. The parity test keeps the reference's DOM and the brand's part sizes, not their positions.
- **The top bar's CSS** (`src/deck/topbar.module.css`): the `.aq` wrapper is an overlay across the top of the stage, over the slides and under the footer and its menu card. It takes no room (height 0), so the slides take the whole stage, as before P4. The wrapper, the header band (`.top`) and its scrolled surface draw nothing; the shell's `--ink`, `--muted` and `--line` take the Averlo foreground, muted and border tokens, the mark is the foreground and the deck title (`.brand-sub`) the Averlo muted text, 4.5:1 or more on the dark background. Only the brand's link takes presses; the band's other boxes lie over the slides, whose presses step the deck. While the overview is expanded, the bar fades out on the deck's `exit` token and takes no presses, as the slide layer does (owner: "Fade it after all"). On phones, under about 480 px wide or about 500 px tall, it is hidden (`display: none`; owner: "on small screens its not neccesary can be removed").
- **The navigator's CSS** (`src/deck/navigator.module.css`): its `.aq` wrapper draws nothing; the shell's `--paper`, `--bg`, `--ink`, `--muted` and `--line` take the Averlo background, foreground, muted and border tokens, so the shell's own track colour (`--progress-muted`, the muted grey at 22% over the page) and the step number over it are the dark deck's. `.inline-progress` keeps its 3 px track with none of the shell's room under it (the footer row sits just above), and is turned upside down (`scaleY(-1)`), so the mound rises from the bottom edge; the mound's step number is turned back (`translateX(-50%) scaleY(-1)`, the shell's own transform plus the turn), so it reads upright. The shell hides `.inline-progress` in print; the deck's PDF pages keep it. It shows on phones too.
- **The navigator's pointer** (`src/deck/navigator.tsx`): the ported navigator raises its mound for a pointer within reach of its track on the side the mound grows toward, which it reads as the pointer's distance below its own top edge. Turned upside down, that side is above the track, so each mouse or pen move it hears is also handed to it mirrored about its own box (`clientY' = top + bottom - clientY`): a pointer d pixels above the track reaches it as d pixels below, as the turned drawing shows it. The mirror's `window` listener is added after the navigator's own (a parent's effect runs after its child's), so the mirrored move is the last the navigator hears; that move then stops at the mirror's listener, so no listener added later (a press held on a control, `src/motion/press-hold.ts`) sees it. Over the menu button, or with the menu open, the mirrored move lies out of reach, so the mound stays down there. Touch needs no mirror: the navigator's touch zone reads only the finger's x. The footer's menu slot sits above the navigator (`z-index: 1`), so the touch zone and the mound never take a press meant for the menu button.
- **Stylesheets**: `src/app/globals.css` imports the ported `shell.css` after `library.css`. The ported `utilities.css` (which imports `foundations.css` and Tailwind's theme and utilities) is not imported: `foundations.css` sets the questionnaire's light tokens on `:root` (`--color-background-rgb: 255 255 255`, `--color-foreground-rgb: 25 27 37`, and more) after `library.css`'s `.dark`, which turns the whole deck light. The questionnaire's own build scopes those rules to `.aq` before it ships them (its `scripts/copy-styles.mjs`), a transform the template would have to reproduce. The owner chose "Port, don't import" (spec, "During P4"): both files stay ported and drift-tested, as the closure of the bar's stylesheet, and are not imported. The header band and the navigator keep the reference's structure, and the brand its sizes, without them (`tests/topbar.spec.ts`): their layout comes from `shell.css`, and the Tailwind utilities of the ported `Logo` from the deck's own Tailwind build.
- **Build settings** (`next.config.ts`, template-owned, R3a step 6): Turbopack resolves each `./<name>.js` specifier a questionnaire port names to the ported `.ts`/`.tsx` file (the list is read from `scripts/ports.lock.json`), and leaves the excluded SF Pro `url()`s unresolved (`"../questionnaire/fonts/*": false`): the built CSS keeps them as written, and the browser never fetches them, as no text uses that face.

### Shell rules not under `@scope (.aq)`

`src/questionnaire/shell.css` keeps most of its rules inside `@scope (.aq)`. These are outside it (line numbers in the ported file). None conflicts with the deck: no class or attribute they select is used outside the bar and the navigator.

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
