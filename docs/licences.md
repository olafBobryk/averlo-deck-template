# Licences

Every font, image, direct dependency and port in this repository has a row here, with its source and licence (FR-019). `npm run scan:public` fails when one is missing, or when a row that covers it is marked not redistributable (research R5).

## Format

- One table, with the header `| File, package or port | Source | Licence | Redistributable |`.
- **File, package or port**: one or more backticked entries. An entry is a package name (`next`), a path (`src/brand/mark.svg`), a folder (`public/brand/`), or a glob, where `*` matches within one folder and `**` across folders (`specs/*/references/screens/**`).
- **Source**: where it comes from (`npm`, `own work`, or a repository at a pinned commit).
- **Licence**: the licence name, or `brand asset (not under MIT)` for the Averlo name and mark.
- **Redistributable**: starts with `yes` or `no`. A brand asset is `yes (placeholder in this repo)`. A `no` row that covers a committed file, a dependency or a port fails the scan.

Packages are installed from npm and not committed; their rows record the licence of each direct dependency and devDependency in `package.json`.

## Entries

| File, package or port           | Source                                        | Licence    | Redistributable                         |
| ------------------------------- | --------------------------------------------- | ---------- | --------------------------------------- |
| `@radix-ui/react-dropdown-menu` | npm                                           | MIT        | yes (installed from npm, not committed) |
| `@radix-ui/react-radio-group`   | npm                                           | MIT        | yes (installed from npm, not committed) |
| `motion`                        | npm                                           | MIT        | yes (installed from npm, not committed) |
| `next`                          | npm                                           | MIT        | yes (installed from npm, not committed) |
| `react`                         | npm                                           | MIT        | yes (installed from npm, not committed) |
| `react-dom`                     | npm                                           | MIT        | yes (installed from npm, not committed) |
| `@axe-core/playwright`          | npm                                           | MPL-2.0    | yes (installed from npm, not committed) |
| `@material-symbols/svg-400`     | npm                                           | Apache-2.0 | yes (installed from npm, not committed) |
| `@playwright/test`              | npm                                           | Apache-2.0 | yes (installed from npm, not committed) |
| `@sparticuz/chromium`           | npm                                           | MIT        | yes (installed from npm, not committed) |
| `@types/node`                   | npm                                           | MIT        | yes (installed from npm, not committed) |
| `@types/react`                  | npm                                           | MIT        | yes (installed from npm, not committed) |
| `@types/react-dom`              | npm                                           | MIT        | yes (installed from npm, not committed) |
| `eslint`                        | npm                                           | MIT        | yes (installed from npm, not committed) |
| `eslint-config-next`            | npm                                           | MIT        | yes (installed from npm, not committed) |
| `playwright-core`               | npm                                           | Apache-2.0 | yes (installed from npm, not committed) |
| `prettier`                      | npm                                           | MIT        | yes (installed from npm, not committed) |
| `typescript`                    | npm                                           | Apache-2.0 | yes (installed from npm, not committed) |
| `specs/*/references/screens/**` | own work: screenshots of template builds only | MIT        | yes                                     |
