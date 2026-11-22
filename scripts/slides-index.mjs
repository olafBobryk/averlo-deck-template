#!/usr/bin/env node
// Writes the deck's slide index (feature 003, research R1): reads the slide
// files in src/slides/ (`NN-name.tsx`, each exporting `meta`, `copy` and a
// default component), sorts them by number, and writes src/slides/index.ts,
// which imports each one and lists it with its number and id (the name
// without the number). Fails, naming the files, on a file without a number,
// on two files with the same number or id, and on a file without `meta`,
// `copy` or a default export. Runs before `dev`, `build`, `check` and
// `typecheck` (package.json), and as `npm run slides`.
//
// It also writes src/slides/data.ts: each file's number, id, `meta` and
// `copy`, read from the file with the TypeScript compiler as literal values
// and written out as plain objects. Plain Node can import that file (it
// imports types only), so the tests and the deck's slide list
// (src/deck/slides.ts) read the slides' words without loading their
// components and styles. A `meta` or `copy` that is not a literal (a call, a
// name, a spread) fails, naming the file and the value.
//
// A slide file may instead re-export another file's slide (`export { copy,
// default, meta } from "@/presets/slides/bar-chart"`): the deck's showcase
// draws the preset files that way. Its data is read from that file.
//
// It writes the same index and data for the preset files
// (src/presets/slides/, feature 003, T331): each preset's example, its
// second example in alternates/ and the composed visual example in
// composed/, named without a number; the gallery draws them, and a deck
// copies one into src/slides/ with a number.
//
// SLIDES_DIR (relative to the repository, or absolute) points it at another
// slide folder, whose own `index.ts` and `data.ts` it writes; next.config.ts
// reads the same variable, so `SLIDES_DIR=<folder> npm run dev` runs a deck
// of that folder's slides (tests/slides/files.spec.ts).
//
// The module exports its pieces for tests/tools/slides_test.mjs; main() runs
// only when the file is invoked directly.
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A slide file's name: its number, a dash, its id in kebab case. */
const NAME = /^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.tsx$/;

/** A re-export of another file's slide: its names and where from. */
const REEXPORT = /^export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/m;

const EXPORTS = [
  [/^export\s+const\s+meta\b/m, "meta"],
  [/^export\s+const\s+copy\b/m, "copy"],
  [/^export\s+default\b/m, "a default component"],
];

/** The kinds a slide's `meta` can name (src/deck/model.ts, `SlideKind`). */
const KINDS = ["title", "divider", "slide", "closing"];

/** A literal's value: a string, a number, a boolean, or an array or object
 *  of them, through `satisfies`, `as` and parentheses. Throws naming `path`
 *  for anything else. */
function literal(node, path) {
  while (
    ts.isSatisfiesExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isParenthesizedExpression(node)
  )
    node = node.expression;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  )
    return -Number(node.operand.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((item, i) => literal(item, `${path}[${i}]`));
  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const property of node.properties) {
      const name =
        ts.isPropertyAssignment(property) &&
        (ts.isIdentifier(property.name) ||
          ts.isStringLiteral(property.name) ||
          ts.isNumericLiteral(property.name))
          ? property.name.text
          : null;
      if (name === null)
        throw new Error(
          `${path}: ${property.getText()} is not a plain property`,
        );
      value[name] = literal(property.initializer, `${path}.${name}`);
    }
    return value;
  }
  throw new Error(`${path}: ${node.getText()} is not a literal`);
}

/** The literal values of a slide file's `meta` and `copy` (its source).
 *  Throws naming the value it cannot read. */
export function readSlide(source, name = "slide.tsx") {
  const file = ts.createSourceFile(
    name,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = {};
  for (const statement of file.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      !statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      continue;
    for (const declaration of statement.declarationList.declarations) {
      const key = ts.isIdentifier(declaration.name)
        ? declaration.name.text
        : null;
      if ((key === "meta" || key === "copy") && declaration.initializer)
        found[key] = literal(declaration.initializer, key);
    }
  }
  for (const key of ["meta", "copy"])
    if (!(key in found)) throw new Error(`no literal \`${key}\``);
  const { meta, copy } = found;
  if (!KINDS.includes(meta.kind))
    throw new Error(
      `meta.kind: ${JSON.stringify(meta.kind)} is not one of ${KINDS.join(", ")}`,
    );
  const langs = Object.keys(copy);
  if (!langs.length) throw new Error("copy: no language");
  for (const lang of langs) {
    if (typeof copy[lang]?.title !== "string")
      throw new Error(`copy.${lang}.title: not a string`);
    for (const key of ["section", "parent"])
      if (meta[key] !== undefined && typeof copy[lang][meta[key]] !== "string")
        throw new Error(
          `meta.${key} names ${JSON.stringify(meta[key])}, which copy.${lang} has no string for`,
        );
  }
  return { meta, copy };
}

/** The file a re-export names, from the folder `dir`: `@/` is src/, and a
 *  path without an extension is a `.tsx` or `.ts` file. */
function resolveFrom(dir, specifier) {
  const base = specifier.startsWith("@/")
    ? join(repoRoot, "src", specifier.slice(2))
    : resolve(dir, specifier);
  for (const path of [base, `${base}.tsx`, `${base}.ts`])
    if (existsSync(path) && statSync(path).isFile()) return path;
  throw new Error(`re-exports ${specifier}, which is no file`);
}

/** A slide file's `meta` and `copy` (readSlide), following a re-export of
 *  another file's slide. Throws naming what it misses. */
export function readSlideFile(path) {
  const source = readFileSync(path, "utf8");
  const reexport = REEXPORT.exec(source);
  if (reexport) {
    const names = reexport[1].split(",").map((name) => name.trim());
    const missing = ["meta", "copy", "default"].filter(
      (name) => !names.includes(name),
    );
    if (missing.length)
      throw new Error(`re-exports no ${missing.join(", no ")}`);
    return readSlideFile(resolveFrom(dirname(path), reexport[2]));
  }
  const missing = EXPORTS.filter(([pattern]) => !pattern.test(source)).map(
    ([, what]) => what,
  );
  if (missing.length) throw new Error(`exports no ${missing.join(", no ")}`);
  return readSlide(source, path);
}

/** The slide files in `dir`, in number order: { name, number, id, meta,
 *  copy }. Throws one error naming every file the deck cannot place. */
export function scanSlides(dir) {
  const names = readdirSync(dir)
    .filter((name) => name.endsWith(".tsx"))
    .sort();
  const problems = [];
  const files = [];
  for (const name of names) {
    const match = NAME.exec(name);
    if (!match) {
      problems.push(
        `${name}: no number; a slide file is named NN-name.tsx, e.g. 05-results.tsx`,
      );
      continue;
    }
    let read;
    try {
      read = readSlideFile(join(dir, name));
    } catch (error) {
      problems.push(`${name}: ${error.message}`);
      continue;
    }
    files.push({ name, number: Number(match[1]), id: match[2], ...read });
  }
  for (const [key, what] of [
    ["number", "number"],
    ["id", "name"],
  ]) {
    const seen = new Map();
    for (const file of files) {
      const other = seen.get(file[key]);
      if (other)
        problems.push(`${other.name} and ${file.name}: the same ${what}`);
      else seen.set(file[key], file);
    }
  }
  if (problems.length)
    throw new Error(
      `slides-index: ${dir}:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  return files.sort((a, b) => a.number - b.number);
}

const HEADER = `// Generated by scripts/slides-index.mjs from the slide files in this folder,
// in number order. Do not edit: add, rename or remove a slide file and run
// \`npm run slides\` (dev, build and check run it too).
`;

/** The index for `files` (scanSlides' list), formatted as the repository's
 *  prettier settings format it. */
export async function renderIndex(files) {
  const lines = [HEADER];
  if (files.length === 0) {
    lines.push('import type { SlideFile } from "@/deck/slide";');
    lines.push("");
    lines.push("export const slideFiles: SlideFile[] = [];");
  } else {
    lines.push('import { slideFile, type SlideFile } from "@/deck/slide";');
    files.forEach((file, i) => {
      const n = i + 1;
      lines.push(
        `import Slide${n}, { copy as copy${n}, meta as meta${n} } from "./${file.name.replace(/\.tsx$/, "")}";`,
      );
    });
    lines.push("");
    lines.push("export const slideFiles: SlideFile[] = [");
    files.forEach((file, i) => {
      const n = i + 1;
      lines.push(
        `slideFile(${file.number}, ${JSON.stringify(file.id)}, meta${n}, copy${n}, Slide${n}),`,
      );
    });
    lines.push("];");
  }
  return format(lines.join("\n"), "index.ts");
}

const DATA_HEADER = `// Generated by scripts/slides-index.mjs from the slide files in this folder,
// in number order: each file's number, id, \`meta\` and \`copy\`, as literal
// values. Plain Node imports it (types only), so the tests read the slides'
// words without their components. Do not edit: change a slide file and run
// \`npm run slides\` (dev, build and check run it too).
`;

/** The data file for `files` (scanSlides' list), formatted as the
 *  repository's prettier settings format it. */
export async function renderData(files) {
  const entries = files.map(({ number, id, meta, copy }) =>
    JSON.stringify({ number, id, meta, copy }),
  );
  const lines = [
    DATA_HEADER,
    'import type { SlideData } from "@/deck/slide";',
    "",
    `export const slideData: SlideData[] = [${entries.join(",\n")}];`,
  ];
  return format(lines.join("\n"), "data.ts");
}

async function format(text, name) {
  const prettier = await import("prettier");
  const options =
    (await prettier.resolveConfig(join(repoRoot, "src", "slides", name))) ?? {};
  return prettier.format(text, { ...options, parser: "typescript" });
}

/** The preset folder: each preset's example file, and the files in its
 *  subfolders (alternates/, composed/). */
export const presetsDir = join(repoRoot, "src", "presets", "slides");

/** The preset files under `dir`, by path without `.tsx` (`bar-chart`,
 *  `alternates/bar-chart`), in that order: { name, id, number: 0, meta,
 *  copy }. Throws one error naming every file it cannot read. */
export function scanPresets(dir = presetsDir) {
  const problems = [];
  const files = [];
  const walk = (folder) => {
    for (const name of readdirSync(folder).sort()) {
      const path = join(folder, name);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!name.endsWith(".tsx")) continue;
      const id = relative(dir, path).replace(/\.tsx$/, "");
      if (!/^([a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
        problems.push(`${id}.tsx: a preset file is named in kebab case`);
        continue;
      }
      try {
        files.push({
          name: `${id}.tsx`,
          id,
          number: 0,
          ...readSlideFile(path),
        });
      } catch (error) {
        problems.push(`${id}.tsx: ${error.message}`);
      }
    }
  };
  walk(dir);
  if (problems.length)
    throw new Error(
      `slides-index: ${dir}:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  // Top-level examples first, then each subfolder's.
  return files.sort(
    (a, b) =>
      a.id.split("/").length - b.id.split("/").length ||
      a.id.localeCompare(b.id),
  );
}

const PRESET_HEADER = `// Generated by scripts/slides-index.mjs from the preset files in this folder
// and its subfolders. Do not edit: add, rename or remove a preset file and
// run \`npm run slides\` (dev, build and check run it too).
`;

/** The preset folder's index: each file's component, meta and copy, by its
 *  path (scanPresets' list). */
export async function renderPresetIndex(files) {
  const lines = [PRESET_HEADER];
  lines.push('import { slideFile, type SlideFile } from "@/deck/slide";');
  files.forEach((file, i) => {
    const n = i + 1;
    lines.push(
      `import Preset${n}, { copy as copy${n}, meta as meta${n} } from "./${file.id}";`,
    );
  });
  lines.push("");
  lines.push("/** The preset files, as the gallery draws them. */");
  lines.push("export const presetFiles: SlideFile[] = [");
  files.forEach((file, i) => {
    const n = i + 1;
    lines.push(
      `slideFile(0, ${JSON.stringify(file.id)}, meta${n}, copy${n}, Preset${n}),`,
    );
  });
  lines.push("];");
  return format(lines.join("\n"), "index.ts");
}

/** The preset folder's data: each file's id, meta and copy. */
export async function renderPresetData(files) {
  const entries = files.map(({ id, meta, copy }) =>
    JSON.stringify({ number: 0, id, meta, copy }),
  );
  const lines = [
    PRESET_HEADER.replace(
      "and its subfolders.",
      "and its subfolders: each\n// file's id, `meta` and `copy`, as literal values, for plain Node.",
    ),
    'import type { SlideData } from "@/deck/slide";',
    "",
    `export const presetData: SlideData[] = [${entries.join(",\n")}];`,
  ];
  return format(lines.join("\n"), "data.ts");
}

/** Writes `text` to `file` when it differs. */
function write(file, text) {
  let before = null;
  try {
    before = readFileSync(file, "utf8");
  } catch {}
  if (before !== text) writeFileSync(file, text);
}

/** The slide folder SLIDES_DIR names, or src/slides. */
export function slidesDir(env = process.env) {
  return resolve(repoRoot, env.SLIDES_DIR || join("src", "slides"));
}

async function main() {
  const dir = slidesDir();
  let files;
  try {
    files = scanSlides(dir);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  write(join(dir, "index.ts"), await renderIndex(files));
  write(join(dir, "data.ts"), await renderData(files));
  if (process.env.SLIDES_DIR || !existsSync(presetsDir)) return;
  let presets;
  try {
    presets = scanPresets();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  write(join(presetsDir, "index.ts"), await renderPresetIndex(presets));
  write(join(presetsDir, "data.ts"), await renderPresetData(presets));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
