# Workflows

The procedures behind the names in the workflow menu, `WORKFLOWS.md`.

## Port the design system

The template is built on the Averlo design system by porting its source files, never by re-implementing them (constitution, Principle VIII; FR-008, FR-009, FR-009a). A port is a whole, unchanged copy of a source file at a pinned commit, together with every file it imports. Ports come in only through [`scripts/port-averlo.mjs`](../scripts/port-averlo.mjs) and its manifest, [`scripts/ports.manifest.json`](../scripts/ports.manifest.json).

### What you need

- A clean clone of each source repository named in the manifest, in one folder: `<PORT_SOURCES_DIR>/<repo>`. The clones are read only. The script reads them with `git show <commit>:<path>` and never checks out, edits or commits there.
- `PORT_SOURCES_DIR`, the path of that folder. It is a machine setting, so it lives in the ignored `.local/env`, never in a tracked file. The scripts look for it in the environment, then in `.local/env`, then in the line "Port sources folder (PORT_SOURCES_DIR):" in `.local/origin.md`.
- The blocked-term list that the public scan reads (`SCAN_TERMS_FILE`, by default `.local/public-scan-terms.txt`).

### The rules

The script applies these rules (research R3a) to each source in the manifest:

1. **Follow every import.** Starting from the manifest's entry files, it follows every TS and JS import (static, dynamic, `export … from`, `require`), every CSS `@import` and `url()`, and every asset import (SVG, JSON, images). Imports named only in comments are not followed.
2. **Resolve aliases with the source's own tsconfig.** For example, averlo-web-transition maps `@/*` to `./src/*`. The template's tsconfig declares the same alias, so the ported imports resolve unchanged. A `.js` specifier that names a `.ts` file resolves to the `.ts` file.
3. **Stop at npm packages.** The script records each package and the version in the source's lockfile. You then add it to `package.json` at the version that R2's precedence gives: the template's own pins win for next, react, react-dom, motion, typescript, @playwright/test and eslint; otherwise averlo-web-transition's lockfile wins; other sources add only packages that are not yet present. The script prints each package that `package.json` is missing or holds at another version. Every override is listed in [`docs/design-source.md`](../docs/design-source.md).
4. **Copy every file to the same path relative to `src/`.** A source's `targetRoot` sets where that is; the questionnaire's files go under `src/questionnaire/`. Files outside `src/` (public files) keep their path.
5. **Write down the closure.** The script writes every file (source repository, commit, source path, target path), every exclusion and every package to the generated section of `docs/design-source.md`, between its markers, and to `scripts/ports.lock.json`. It keeps everything outside the markers.
6. **Never edit a port, not even to make it compile.** A ported file is not reformatted, linted or "fixed": the ported folders are in the ESLint ignores and in `.prettierignore`. Build configuration that lets unchanged files resolve is template-owned and allowed, for example tsconfig paths, `.js` specifiers resolving to `.ts`, or a CSS `url()` of an excluded file left unresolved at build time. If a port does not build unchanged and no such setting fixes it, add an open question and park the phase.
7. **Exclude only files whose licence forbids redistribution.** The manifest's `exclude` list names files that are never copied, even when the closure reaches them, such as font files that may not be shared (owner: "Exclude the font files only"). Their references stay in the ported files unchanged. If the build or the smoke test's console check fails because they are missing, and no template-owned setting fixes it, raise an open question.
8. **The script stops, and copies nothing,** when:
   - an import cannot be resolved;
   - a pulled file would land under a template-owned path (the manifest's `templateOwned`: `src/app`, `src/deck`, `src/gate`, `src/boot`, `src/motion`, `src/brand`, `src/styles`) or overwrite a file that the port script did not make;
   - a pulled file's path or content holds a blocked term (it prints the file and the term's number, never the term);
   - an asset (anything other than code, CSS or JSON) has no row in [`docs/licences.md`](../docs/licences.md), or its row is marked not redistributable, and the manifest does not exclude it.
9. **Sources may be absent.** In a deck made from the template without the sources folder, `npm run check:ports` reports "not run" with the reason. It does not fail.

### Run a port

1. Check that each clone has the pinned commit: `git -C <PORT_SOURCES_DIR>/<repo> cat-file -e <commit>^{commit}`.
2. Run `node scripts/port-averlo.mjs`. If it stops, fix the cause it names: add a licence row, add an exclusion, or raise the question with the owner. Never edit the pulled file.
3. Add each package that it prints to `package.json` at the version shown, with exact versions, then run `npm install`.
4. Add a row to `docs/licences.md` for each new package, port and asset, in the same commit.
5. Run `npm run check:ports`, `npm run check` and the gate.

### Re-pin

1. Fetch the new commit in the source's clone.
2. Change the source's `commit` in the manifest, and its entries if they changed.
3. Run the port: steps 2 to 5 above. The script removes ported files that the new closure no longer reaches. Until it runs, `check:ports` fails because the lock no longer matches the manifest.

### How the drift test works

`npm run check:ports` ([`scripts/check-ports.mjs`](../scripts/check-ports.mjs)) reads `scripts/ports.lock.json` and compares every ported file, byte for byte, with `git show <commit>:<source path>` in its clone. It fails when:

- a port differs from its source, or is missing (it names each file);
- the lock no longer matches the manifest's pins or entries.

It reports "not run", with the reason, when `PORT_SOURCES_DIR` is not set, the folder or a clone is missing, or a clone lacks the pinned commit. The gate runs it as its `ports` check.

### In a deck made from the template

The drift test guards the template's own build. A deck made from the template may change its look and its ports (FR-009):

- **Re-pin:** point the manifest at a newer commit of the same source, as above.
- **Re-target:** port from your own fork or another design system. Clone it into your `PORT_SOURCES_DIR`, change the source's `repo` (the clone's folder name), `commit` and `entries`, and run the port. Then change the licence rows to match.
- **Turn it off:** once you edit ported files on purpose, set `"driftTest": false` in the manifest. `check:ports` then reports "not run — the drift test is turned off", and the gate shows that, instead of failing.
