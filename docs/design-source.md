# Design source

The template is built on the Averlo design system itself (constitution, Principle VIII). Its components, tokens, helpers and font come in as ports: whole, unchanged copies of the source files with every file they import, at a pinned commit (FR-008, FR-009a). How they are made, pinned, excluded and checked is the [port procedure](../process/workflows.md#port-the-design-system).

- **Manifest:** [`scripts/ports.manifest.json`](../scripts/ports.manifest.json) names each source repository, its commit, the entry files, the exclusions and the template-owned paths a port may never write.
- **Closure:** [`scripts/port-averlo.mjs`](../scripts/port-averlo.mjs) follows the entries' imports and writes the section between the markers below, plus [`scripts/ports.lock.json`](../scripts/ports.lock.json), which the drift test reads. Everything outside the markers is written by hand and kept.
- **Drift test:** `npm run check:ports` compares every port in the lock with its source, byte for byte.

## Packages added outside the closure

- `@tailwindcss/postcss` 4.3.0, averlo-web-transition's lockfile version: the PostCSS plugin that builds the ported `library.css`, which imports `tailwindcss`. The postcss config that uses it is template-owned and copies averlo-web-transition's (T023).

<!-- ports:begin -->

<!-- Written by scripts/port-averlo.mjs from scripts/ports.manifest.json; do not edit between these markers. -->

## Ported files

30 files from 2 sources, each a byte-identical copy of its source at the pinned commit. `npm run check:ports` compares them with the source (scripts/ports.lock.json).

### averlo-web-transition @ `cfa3d61`

Entries: `src/components/ui/foundations/focus.ts`, `src/components/ui/foundations/library.css`, `src/components/ui/foundations/iconAnimations.css`, `src/components/ui/foundations/motionTiming.ts`, `src/components/ui/foundations/spring.ts`, `src/components/ui/foundations/motionDisableOverride.ts`, `src/components/ui/foundations/settingsContext.tsx`, `src/components/ui/foundations/appearance.ts`, `src/components/ui/foundations/MotionProvider.tsx`, `src/components/ui/foundations/motionDriverContext.tsx`, `src/components/ui/primitives/Button.tsx`, `src/components/ui/primitives/Text.tsx`, `src/components/ui/primitives/Panel.tsx`, `src/components/ui/primitives/Dropdown.tsx`, `src/components/ui/primitives/Listbox.tsx`, `src/components/ui/primitives/dropdownStyles.ts`, `src/components/ui/overlays/Portal.tsx`, `src/components/ui/icons/Icon.tsx`, `src/components/ui/helpers/IconSwap.tsx`, `src/components/branding/Logo.tsx`.

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
| `motion`                   | 3 ports     | averlo-web-transition 12.38.0                             | 14.7.1       | override: the origin's pin wins over averlo-web-transition 12.38.0 (R2 rule 1)                             |
| `next`                     | 4 ports     | averlo-web-transition 16.2.6; averlo-next-template 16.4.3 | 16.4.5       | override: the origin's pin wins over averlo-web-transition 16.2.6, averlo-next-template 16.4.3 (R2 rule 1) |
| `react`                    | 17 ports    | averlo-web-transition 19.2.6                              | 19.3.1       | override: the origin's pin wins over averlo-web-transition 19.2.6 (R2 rule 1)                              |
| `react-dom`                | 1 port      | averlo-web-transition 19.2.6                              | 19.3.1       | override: the origin's pin wins over averlo-web-transition 19.2.6 (R2 rule 1)                              |
| `tailwindcss`              | 1 port      | averlo-web-transition 4.3.0                               | 4.3.0        | averlo-web-transition's lockfile (R2 rule 2)                                                               |

<!-- ports:end -->
