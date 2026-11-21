// Fixtures for the port tools (research R3a): a throwaway source repository
// with one commit, and a throwaway template root holding a ports manifest,
// a licence list, a design-source page and a package.json. Invented names
// and terms only.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { commitAll, dummyTerms, git, tempDir, write } from "./fixtures.mjs";

export const SOURCE = "fixture-source";

/** The source repository's files at its one commit. */
export function sourceFiles(extra = {}) {
  return {
    "tsconfig.json": JSON.stringify(
      { compilerOptions: { paths: { "@/*": ["./src/*"] } } },
      null,
      2,
    ),
    "package-lock.json": JSON.stringify(
      {
        lockfileVersion: 3,
        packages: {
          "": { name: "fixture-source" },
          "node_modules/clsx": { version: "2.1.1" },
          "node_modules/@fake/icons": { version: "3.0.0" },
          "node_modules/react": { version: "19.0.0" },
        },
      },
      null,
      2,
    ),
    "src/components/ui/Card.tsx": [
      '"use client";',
      'import clsx from "clsx";',
      'import { Star } from "@fake/icons/star";',
      'import type { ReactNode } from "react";',
      'import { tone } from "@/lib/tone";',
      'import "./card.css";',
      'import mark from "./mark.svg";',
      '// import nothing from "./not-followed";',
      "export const Card = (p: { children: ReactNode }) => [clsx(tone), Star, mark, p];",
      "",
    ].join("\n"),
    "src/lib/tone.ts":
      'import { base } from "./base";\nexport const tone = base;\n',
    "src/lib/base.ts": "export const base = 1;\n",
    "src/components/ui/card.css": [
      '@import "tailwindcss";',
      '@import "./card-base.css";',
      "/* url(./commented-out.png) is not followed */",
      '.card { background: url("./grain.png"); }',
      "",
    ].join("\n"),
    "src/components/ui/card-base.css": ".card { display: block; }\n",
    "src/components/ui/mark.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>\n',
    "src/components/ui/grain.png": "not really a png\n",
    "src/unrelated.ts": "export const unrelated = true;\n",
    ...extra,
  };
}

/** A git repository named `name` under `sourcesDir`; returns its full sha. */
export function makeSource(sourcesDir, files, name = SOURCE) {
  const repo = join(sourcesDir, name);
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.name", "Fixture");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(repo, "config", "commit.gpgsign", "false");
  for (const [path, content] of Object.entries(files))
    write(repo, path, content);
  commitAll(repo, "Fixture source");
  return git(repo, "rev-parse", "HEAD").trim();
}

export const DESIGN_SOURCE_HEADER = [
  "# Design source",
  "",
  "A hand-written introduction that the port script keeps.",
  "",
  "<!-- ports:begin -->",
  "<!-- ports:end -->",
  "",
  "A hand-written closing section that the port script keeps.",
  "",
].join("\n");

export function manifest(commit, overrides = {}) {
  return {
    driftTest: true,
    templateOwned: ["src/app/", "src/deck/"],
    sources: [
      {
        repo: SOURCE,
        commit,
        targetRoot: "src",
        entries: [
          {
            source: "src/components/ui/Card.tsx",
            target: "src/components/ui/Card.tsx",
          },
        ],
        exclude: [],
        ...overrides,
      },
    ],
  };
}

export function licenceList(rows) {
  return [
    "# Licences",
    "",
    "| File, package or port | Source | Licence | Redistributable |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export const assetRows = [
  "| `src/components/ui/mark.svg` | fixture source | MIT | yes |",
  "| `src/components/ui/grain.png` | fixture source | MIT | yes |",
];

/**
 * A source repository and a template root that can be ported. Returns
 * { dir, root, sourcesDir, termsFile, commit, env, cleanup }.
 */
export function makePortFixture({
  files = sourceFiles(),
  rows = assetRows,
  manifestOverrides = {},
  terms = dummyTerms,
} = {}) {
  const { dir, cleanup } = tempDir("ports-fixture-");
  const sourcesDir = join(dir, "sources");
  const commit = makeSource(sourcesDir, files);
  const root = join(dir, "template");
  mkdirSync(root);
  git(root, "init", "-q", "-b", "main");
  const termsFile = join(dir, "terms.txt");
  writeFileSync(termsFile, terms.join("\n") + "\n");
  write(
    root,
    "scripts/ports.manifest.json",
    JSON.stringify(manifest(commit.slice(0, 7), manifestOverrides), null, 2),
  );
  write(root, "docs/licences.md", licenceList(rows));
  write(root, "docs/design-source.md", DESIGN_SOURCE_HEADER);
  write(
    root,
    "package.json",
    JSON.stringify({ name: "fixture", dependencies: { react: "19.3.1" } }),
  );
  return {
    dir,
    root,
    sourcesDir,
    termsFile,
    commit,
    env: { PORT_SOURCES_DIR: sourcesDir, SCAN_TERMS_FILE: termsFile },
    cleanup,
  };
}
