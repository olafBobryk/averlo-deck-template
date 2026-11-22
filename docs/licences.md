# Licences

Every font, image, direct dependency and port in this repository has a row here, with its source and licence (FR-019). `npm run scan:public` fails when one is missing, or when a row that covers it is marked not redistributable (research R5).

The repository is under the MIT licence ([`LICENSE`](../LICENSE)), which covers the template's own code and the ported code. The Averlo name and mark are not under it (see [Brand assets](#brand-assets-not-under-mit)).

## Format

- Each table has the header `| File, package or port | Source | Licence | Redistributable |`. The scan reads every table with that header.
- **File, package or port**: one or more backticked entries. An entry is a package name (`next`), a path (`src/brand/mark.svg`), a folder (`public/brand/`), or a glob, where `*` matches within one folder and `**` across folders (`specs/*/references/screens/**`).
- **Source**: where it comes from (`npm`, `own work`, or a repository at a pinned commit).
- **Licence**: the licence name, or `brand asset (not under MIT)` for the Averlo name and mark.
- **Redistributable**: starts with `yes` or `no`. A brand asset is `yes (placeholder in this repo)`. A `no` row that covers a committed file, a dependency or a port fails the scan.

A deck made from the template adds a row for each asset, package or port it adds, in the same commit.

## Ports

Ported files are whole, unchanged copies (the [port procedure](../process/workflows.md#port-the-design-system)), so any licence notice a source file carries is kept, and the drift test (`npm run check:ports`) proves the copy is byte for byte. Every ported file is listed in [`docs/design-source.md`](design-source.md).

**Notices kept:** at the pinned commits, no ported file carries a licence or copyright notice. All 42 files in `scripts/ports.lock.json` (30 from averlo-web-transition at `cfa3d61`, 1 from averlo-next-template at `dc3b01d`, 11 from averlo-questionnaire-template at `756be64`) were searched for "licence", "license", "copyright" and "SPDX", with no match. When a re-pin brings in a file with a notice, list it here.

| File, package or port                                         | Source                                                                                                                                                                                                                | Licence                      | Redistributable                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| `src/components/ui/`, `src/config/`, `src/hooks/`, `src/lib/` | averlo-web-transition @ `cfa3d61`, ported unchanged with their import closure by `scripts/port-averlo.mjs`                                                                                                            | MIT (this repository; owner) | yes                                                 |
| `src/font/`                                                   | averlo-next-template @ `dc3b01d`, ported unchanged: code only, which loads Inter (OFL-1.1) through `next/font/google` at build time; no font file is committed                                                        | MIT (this repository; owner) | yes                                                 |
| `src/font/sf-pro-display/**`                                  | averlo-web-transition @ `cfa3d61`: the SF Pro Display font files that the ported `library.css` declares; excluded in `scripts/ports.manifest.json` and never copied (FR-020)                                          | Apple font licence           | no (excluded from the ports; must not be committed) |
| `src/questionnaire/`                                          | averlo-questionnaire-template @ `756be64`, ported unchanged with its import closure by `scripts/port-averlo.mjs` (every file is listed in `docs/design-source.md`); its SF Pro font files are excluded, not committed | MIT (this repository; owner) | yes                                                 |

## Brand assets (not under MIT)

The Averlo name and mark are brand assets. They are the default placeholder brand, and the [`LICENSE`](../LICENSE) excludes them from the MIT licence: they are not licensed for reuse. A deck with its own brand sets it in `src/brand/config.ts`, puts its assets in `public/brand/`, and lists them here.

| File, package or port                   | Source                                                                                                                                                                                                                                                                                                                                                                  | Licence                     | Redistributable                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------ |
| `src/components/branding/Logo.tsx`      | averlo-web-transition @ `cfa3d61`, ported unchanged: the Averlo name and mark                                                                                                                                                                                                                                                                                           | brand asset (not under MIT) | yes (placeholder in this repo) |
| `public/brand/averlo-mark.svg`          | The Averlo mark, its path copied from the ported `src/components/branding/Logo.tsx` (averlo-web-transition @ `cfa3d61`), white in the placeholder's 240 px square of a 512 px canvas, served as the intro's and the hard-load screen's mark (T033), and drawn in the app icons, which Next renders at build time from it (`src/app/icon.tsx`, `src/app/apple-icon.tsx`) | brand asset (not under MIT) | yes (placeholder in this repo) |
| `src/questionnaire/primitives/Logo.tsx` | averlo-questionnaire-template @ `756be64`, ported unchanged: the Averlo mark, as the questionnaire's top bar draws it                                                                                                                                                                                                                                                   | brand asset (not under MIT) | yes (placeholder in this repo) |

## Template files and images

| File, package or port                 | Source                                                                                                                                                                                              | Licence    | Redistributable |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------- |
| `src/brand/placeholder/your-logo.svg` | own work: the neutral "your logo" placeholder mark shown in the intro, on the hard-load screen and in the top bar's brand slot (T013), and drawn in the app icons when an owner's brand has no mark | MIT        | yes             |
| `src/gate/AnimatedLock.tsx`           | The Material Symbols Rounded `lock` glyph by Google (`@material-symbols/svg-400` 0.48.2), drawn as an SVG path inside the carried intro lock (T013); kept after P3                                  | Apache-2.0 | yes             |
| `specs/*/references/screens/**`       | own work: screenshots of template builds only                                                                                                                                                       | MIT        | yes             |

## Packages

Packages are installed from npm and not committed. Each row records the licence of a direct dependency or devDependency in `package.json`.

| File, package or port      | Source | Licence    | Redistributable                         |
| -------------------------- | ------ | ---------- | --------------------------------------- |
| `motion`                   | npm    | MIT        | yes (installed from npm, not committed) |
| `next`                     | npm    | MIT        | yes (installed from npm, not committed) |
| `react`                    | npm    | MIT        | yes (installed from npm, not committed) |
| `react-dom`                | npm    | MIT        | yes (installed from npm, not committed) |
| `@phosphor-icons/react`    | npm    | MIT        | yes (installed from npm, not committed) |
| `class-variance-authority` | npm    | Apache-2.0 | yes (installed from npm, not committed) |
| `clsx`                     | npm    | MIT        | yes (installed from npm, not committed) |
| `lucide-react`             | npm    | ISC        | yes (installed from npm, not committed) |
| `@axe-core/playwright`     | npm    | MPL-2.0    | yes (installed from npm, not committed) |
| `@playwright/test`         | npm    | Apache-2.0 | yes (installed from npm, not committed) |
| `@sparticuz/chromium`      | npm    | MIT        | yes (installed from npm, not committed) |
| `@types/node`              | npm    | MIT        | yes (installed from npm, not committed) |
| `@types/react`             | npm    | MIT        | yes (installed from npm, not committed) |
| `@types/react-dom`         | npm    | MIT        | yes (installed from npm, not committed) |
| `eslint`                   | npm    | MIT        | yes (installed from npm, not committed) |
| `eslint-config-next`       | npm    | MIT        | yes (installed from npm, not committed) |
| `playwright-core`          | npm    | Apache-2.0 | yes (installed from npm, not committed) |
| `prettier`                 | npm    | MIT        | yes (installed from npm, not committed) |
| `typescript`               | npm    | Apache-2.0 | yes (installed from npm, not committed) |
| `@tailwindcss/postcss`     | npm    | MIT        | yes (installed from npm, not committed) |
| `tailwindcss`              | npm    | MIT        | yes (installed from npm, not committed) |
