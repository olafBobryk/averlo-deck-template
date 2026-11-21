# Design source

The template is built on the Averlo design system itself (constitution, Principle VIII). Its components, tokens, helpers and font come in as ports: whole, unchanged copies of the source files with every file they import, at a pinned commit (FR-008, FR-009a). How they are made, pinned, excluded and checked is the [port procedure](../process/workflows.md#port-the-design-system).

- **Manifest:** [`scripts/ports.manifest.json`](../scripts/ports.manifest.json) names each source repository, its commit, the entry files, the exclusions and the template-owned paths a port may never write.
- **Closure:** [`scripts/port-averlo.mjs`](../scripts/port-averlo.mjs) follows the entries' imports and writes the section between the markers below, plus [`scripts/ports.lock.json`](../scripts/ports.lock.json), which the drift test reads. Everything outside the markers is written by hand and kept.
- **Drift test:** `npm run check:ports` compares every port in the lock with its source, byte for byte.

## Packages added outside the closure

- `@tailwindcss/postcss` 4.3.0, averlo-web-transition's lockfile version: the PostCSS plugin that builds the ported `library.css`, which imports `tailwindcss`. The postcss config that uses it, `postcss.config.mjs`, is template-owned and copies averlo-web-transition's (T023).

## Styles: font and token bridge

`src/app/globals.css` (template-owned, T023) imports, in order, the ported `library.css` (which imports Tailwind, so Tailwind is not imported again), `src/styles/fonts.css`, `src/styles/tokens.css`, then the carried motion stylesheets `src/motion/motion.css` and `src/motion/route-transition.css`. `postcss.config.mjs` is averlo-web-transition's (`@tailwindcss/postcss`). `<html>` carries `class="dark"`, under which `library.css` defines its dark tokens, and the ported font's variable class (`--font-inter`).

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

<!-- ports:begin -->

<!-- Written by scripts/port-averlo.mjs from scripts/ports.manifest.json; do not edit between these markers. -->

## Ported files

31 files from 2 sources, each a byte-identical copy of its source at the pinned commit. `npm run check:ports` compares them with the source (scripts/ports.lock.json).

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

## npm packages

Where the closure stops. Versions follow research R2: the origin's pins win for next, react, react-dom, motion, typescript, @playwright/test and eslint; otherwise averlo-web-transition's lockfile, then the other sources' for packages not yet present. Every override is named.

| Package                    | Imported by | Source lockfile                                           | Version used | Rule                                                                                                       |
| -------------------------- | ----------- | --------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| `@phosphor-icons/react`    | 1 port      | averlo-web-transition 2.1.10                              | 2.1.10       | averlo-web-transition's lockfile (R2 rule 2)                                                               |
| `class-variance-authority` | 3 ports     | averlo-web-transition 0.7.1                               | 0.7.1        | averlo-web-transition's lockfile (R2 rule 2)                                                               |
| `clsx`                     | 8 ports     | averlo-web-transition 2.1.1                               | 2.1.1        | averlo-web-transition's lockfile (R2 rule 2)                                                               |
| `lucide-react`             | 2 ports     | averlo-web-transition 1.18.0                              | 1.18.0       | averlo-web-transition's lockfile (R2 rule 2)                                                               |
| `motion`                   | 4 ports     | averlo-web-transition 12.38.0                             | 14.7.1       | override: the origin's pin wins over averlo-web-transition 12.38.0 (R2 rule 1)                             |
| `next`                     | 4 ports     | averlo-web-transition 16.2.6; averlo-next-template 16.4.3 | 16.4.5       | override: the origin's pin wins over averlo-web-transition 16.2.6, averlo-next-template 16.4.3 (R2 rule 1) |
| `react`                    | 18 ports    | averlo-web-transition 19.2.6                              | 19.3.1       | override: the origin's pin wins over averlo-web-transition 19.2.6 (R2 rule 1)                              |
| `react-dom`                | 1 port      | averlo-web-transition 19.2.6                              | 19.3.1       | override: the origin's pin wins over averlo-web-transition 19.2.6 (R2 rule 1)                              |
| `tailwindcss`              | 1 port      | averlo-web-transition 4.3.0                               | 4.3.0        | averlo-web-transition's lockfile (R2 rule 2)                                                               |

<!-- ports:end -->
