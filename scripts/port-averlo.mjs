#!/usr/bin/env node
// The port script (research R3a; the procedure is in process/workflows.md,
// "Port the design system").
//
//   node scripts/port-averlo.mjs
//
// From each source's entry files in scripts/ports.manifest.json it follows
// every TS/JS import, CSS @import and url(), and asset import, resolving
// aliases with the source repository's own tsconfig, and stops at npm
// packages, which it records with the source lockfile's version. Every file
// of that closure is copied unchanged from `git show <commit>:<path>` in the
// source's clone under PORT_SOURCES_DIR to the same path relative to src/
// (under the source's `targetRoot`). It writes the closure to
// scripts/ports.lock.json, which `npm run check:ports` reads, and to the
// generated section of docs/design-source.md.
//
// It stops, before copying anything, on: an import it cannot resolve; a
// pulled file under a template-owned path, or one that would overwrite a
// file the port script did not make; a blocked term (from SCAN_TERMS_FILE,
// as the public scan reads it) in a pulled file's path or content; an asset
// with no licence row in docs/licences.md, or one marked not
// redistributable, that the manifest does not exclude. Its output names
// files and term numbers only, never a term.
//
// PORT_SOURCES_DIR comes from the environment, else .local/env, else the
// "Port sources folder (PORT_SOURCES_DIR):" line of .local/origin.md.
//
// Exit codes: 0 ported, 1 stopped (nothing is written).
import { builtinModules } from "node:module";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { parseEnv } from "./gate.mjs";
import { covers, loadTerms, parseLicences, termsIn } from "./scan-public.mjs";

export const MANIFEST = "scripts/ports.manifest.json";
export const LOCK = "scripts/ports.lock.json";
export const DESIGN_SOURCE = "docs/design-source.md";
const LICENCES = "docs/licences.md";
const DEFAULT_TERMS_FILE = ".local/public-scan-terms.txt";
export const BEGIN = "<!-- ports:begin -->";
export const END = "<!-- ports:end -->";

/** The origin's pins win over every source lockfile (research R2, rule 1). */
const ORIGIN_PINS = [
  "next",
  "react",
  "react-dom",
  "motion",
  "typescript",
  "@playwright/test",
  "eslint",
];
const SCRIPT = /\.(?:[cm]?[jt]sx?)$/i;
const CSS = /\.css$/i;
/** Code and data, covered by the ported-code licence row; anything else
 *  the closure reaches is an asset and needs its own row. */
const CODE = /\.(?:[cm]?[jt]sx?|css|json)$/i;
const SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".d.ts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];

export class Stop extends Error {}

// --------------------------------------------------------------- setup ----

export function findRoot(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return cwd;
  }
}

/** The port sources folder, or null when no setting names one. */
export function sourcesDir(root, env = process.env) {
  const absolute = (dir) => (isAbsolute(dir) ? dir : resolve(root, dir));
  if (env.PORT_SOURCES_DIR) return absolute(env.PORT_SOURCES_DIR);
  const envFile = join(root, ".local", "env");
  if (existsSync(envFile)) {
    const value = parseEnv(readFileSync(envFile, "utf8")).PORT_SOURCES_DIR;
    if (value) return absolute(value);
  }
  const origin = join(root, ".local", "origin.md");
  if (existsSync(origin)) {
    const match =
      /Port sources folder \(PORT_SOURCES_DIR\):\s*`?([^`\n]+?)`?\.?\s*$/m.exec(
        readFileSync(origin, "utf8"),
      );
    if (match) return absolute(match[1].trim());
  }
  return null;
}

/** A source path's target: the same path relative to src/, under the
 *  source's targetRoot. Paths outside src/ (public files) keep their path. */
export function targetOf(source, targetRoot = "src") {
  return source.startsWith("src/")
    ? posix.join(targetRoot, source.slice("src/".length))
    : source;
}

export function loadManifest(root) {
  const file = join(root, MANIFEST);
  if (!existsSync(file)) throw new Stop(`${MANIFEST} is missing`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Stop(`${MANIFEST} is not valid JSON`);
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    throw new Stop(`${MANIFEST} lists no sources`);
  }
  const owned = (data.templateOwned ?? []).map((p) =>
    p.endsWith("/") ? p : `${p}/`,
  );
  const sources = data.sources.map((source, i) => {
    const where = `${MANIFEST}: source ${i + 1}`;
    if (!source.repo || !source.commit) {
      throw new Stop(`${where} needs a repo and a commit`);
    }
    const targetRoot = source.targetRoot ?? "src";
    const entries = (source.entries ?? []).map((entry) => {
      const path = typeof entry === "string" ? entry : entry.source;
      const target = typeof entry === "string" ? targetOf(path) : entry.target;
      if (target !== targetOf(path, targetRoot)) {
        throw new Stop(
          `${where}: ${path} must target ${targetOf(path, targetRoot)} (the same path relative to src/)`,
        );
      }
      return path;
    });
    if (entries.length === 0) throw new Stop(`${where} lists no entries`);
    return {
      repo: source.repo,
      commit: source.commit,
      targetRoot,
      entries,
      exclude: (source.exclude ?? []).map((e) =>
        typeof e === "string" ? { path: e, reason: "" } : e,
      ),
    };
  });
  return { driftTest: data.driftTest !== false, templateOwned: owned, sources };
}

export function loadLock(root) {
  const file = join(root, LOCK);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Stop(`${LOCK} is not valid JSON`);
  }
}

// ----------------------------------------------------------------- git ----

export function sourceGit(repoDir, args, encoding = "utf8") {
  return execFileSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd: repoDir,
    encoding,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** The full sha of `commit` in the clone, or null when it is not there. */
export function resolveCommit(repoDir, commit) {
  if (!existsSync(join(repoDir, ".git")) && !existsSync(join(repoDir, "HEAD")))
    return null;
  try {
    return sourceGit(repoDir, [
      "rev-parse",
      "--verify",
      "--quiet",
      `${commit}^{commit}`,
    ]).trim();
  } catch {
    return null;
  }
}

/** A file's bytes at the commit, or null when the commit has no such file. */
export function showFile(repoDir, commit, path) {
  try {
    return sourceGit(repoDir, ["show", `${commit}:${path}`], "buffer");
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- closure ----

/** The source's tsconfig `paths`, as [{ prefix, suffix, targets }]. */
function aliases(repoDir, commit) {
  const text = showFile(repoDir, commit, "tsconfig.json");
  if (!text) return [];
  const { config } = ts.parseConfigFileTextToJson(
    "tsconfig.json",
    text.toString("utf8"),
  );
  const options = config?.compilerOptions ?? {};
  const base = posix.normalize(options.baseUrl ?? ".");
  return Object.entries(options.paths ?? {})
    .map(([pattern, targets]) => {
      const star = pattern.indexOf("*");
      return {
        prefix: star === -1 ? pattern : pattern.slice(0, star),
        suffix: star === -1 ? "" : pattern.slice(star + 1),
        exact: star === -1,
        targets: targets.map((t) => posix.join(base, t)),
      };
    })
    .sort((a, b) => b.prefix.length - a.prefix.length);
}

const packageName = (spec) =>
  spec.startsWith("@")
    ? spec.split("/").slice(0, 2).join("/")
    : spec.split("/")[0];

const builtins = new Set(builtinModules);
const isBuiltin = (spec) =>
  spec.startsWith("node:") || builtins.has(spec.split("/")[0]);

/** [{ spec, kind }] for every file or package a file names. */
export function specifiers(path, text) {
  if (SCRIPT.test(path)) {
    return ts
      .preProcessFile(text, true, true)
      .importedFiles.map((f) => ({ spec: f.fileName, kind: "module" }));
  }
  if (CSS.test(path)) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "");
    const found = [];
    for (const m of code.matchAll(
      /@(?:import|plugin|reference|config)\s+(?:url\(\s*)?(["'])([^"']+)\1/g,
    ))
      found.push({ spec: m[2], kind: "css-import" });
    for (const m of code.matchAll(/@import\s+url\(\s*([^"')\s]+)\s*\)/g))
      found.push({ spec: m[1], kind: "css-import" });
    for (const m of code.matchAll(/url\(\s*(["']?)([^"')]+?)\1\s*\)/g)) {
      if (!found.some((f) => f.spec === m[2]))
        found.push({ spec: m[2], kind: "url" });
    }
    return found;
  }
  return [];
}

/**
 * The closure of one source: { files: [source path], packages: Map(name →
 * Set(importer)), excluded: [{ source, reason }] }. Problems are pushed.
 */
export function closure(repoDir, commit, source, problems) {
  const tree = new Set(
    sourceGit(repoDir, ["ls-tree", "-r", "-z", "--name-only", commit])
      .split("\0")
      .filter(Boolean),
  );
  const paths = aliases(repoDir, commit);
  const excluded = new Map();
  const exclusion = (path) =>
    source.exclude.find((e) => covers(e.path, path)) ?? null;
  const find = (base) => {
    for (const suffix of SUFFIXES) {
      if (tree.has(base + suffix)) return base + suffix;
    }
    // `.js` specifiers that name `.ts` files.
    const js = /\.(m?)jsx?$/.exec(base);
    if (js) {
      const stem = base.slice(0, -js[0].length);
      for (const ext of js[1] ? [".mts"] : [".ts", ".tsx"]) {
        if (tree.has(stem + ext)) return stem + ext;
      }
    }
    return null;
  };
  const viaAlias = (spec) => {
    for (const a of paths) {
      const hit = a.exact
        ? spec === a.prefix
        : spec.startsWith(a.prefix) && spec.endsWith(a.suffix);
      if (!hit) continue;
      const middle = a.exact
        ? ""
        : spec.slice(a.prefix.length, spec.length - a.suffix.length);
      for (const t of a.targets) {
        const found = find(posix.normalize(t.replace("*", middle)));
        if (found) return { found };
      }
      return { found: null };
    }
    return null;
  };

  const files = new Set();
  const packages = new Map();
  const queue = [...source.entries];
  for (const entry of source.entries) {
    if (!tree.has(entry)) {
      problems.push(
        `${source.repo}@${source.commit}: the entry ${entry} does not exist at that commit`,
      );
    }
  }
  while (queue.length) {
    const file = queue.shift();
    if (files.has(file) || excluded.has(file) || !tree.has(file)) continue;
    const rule = exclusion(file);
    if (rule) {
      excluded.set(file, rule.reason ?? "");
      continue;
    }
    files.add(file);
    if (!SCRIPT.test(file) && !CSS.test(file)) continue;
    const text = showFile(repoDir, commit, file).toString("utf8");
    for (const { spec: raw, kind } of specifiers(file, text)) {
      const spec = raw.trim();
      if (/^(?:data:|[a-z][a-z0-9+.-]*:\/\/|\/\/|#)/i.test(spec)) continue;
      if (kind === "url" && spec.includes("(")) continue; // url(var(--x))
      if (kind === "module" && isBuiltin(spec)) continue;
      const bare = spec.replace(/[?#].*$/, "");
      let found;
      let named = false;
      if (bare.startsWith("/")) {
        // A root-relative URL is a public file.
        named = true;
        found = find(posix.join("public", bare));
      } else if (bare.startsWith(".") || kind === "url") {
        named = true;
        found = find(posix.normalize(posix.join(posix.dirname(file), bare)));
      } else {
        const alias = viaAlias(bare);
        if (alias) {
          named = true;
          found = alias.found;
        }
      }
      if (!named) {
        const name = packageName(bare);
        if (!packages.has(name)) packages.set(name, new Set());
        packages.get(name).add(file);
        continue;
      }
      if (!found) {
        problems.push(
          `cannot resolve '${spec}', imported by ${source.repo}@${source.commit}:${file}`,
        );
        continue;
      }
      queue.push(found);
    }
  }
  return {
    files: [...files].sort(),
    packages,
    excluded: [...excluded].map(([path, reason]) => ({
      source: path,
      reason,
    })),
  };
}

/** The version a package-lock.json records for `name`, or null. */
function lockVersion(lock, name) {
  return (
    lock?.packages?.[`node_modules/${name}`]?.version ??
    lock?.dependencies?.[name]?.version ??
    null
  );
}

// -------------------------------------------------------------- output ----

const cell = (text) => String(text).replace(/\|/g, "\\|");
const code = (text) => `\`${cell(text)}\``;

function table(head, rows) {
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

/** Version precedence (research R2): the origin's pins in the template's
 *  package.json win; otherwise the first source in manifest order whose
 *  lockfile records the package. */
export function choosePackages(sources, pkg) {
  const installed = { ...pkg.devDependencies, ...pkg.dependencies };
  const names = [
    ...new Set(sources.flatMap((s) => s.packages.map((p) => p.name))),
  ].sort();
  return names.map((name) => {
    const recorded = sources
      .map((s) => ({
        repo: s.repo,
        commit: s.commit,
        ...s.packages.find((p) => p.name === name),
      }))
      .filter((r) => r.name);
    const locked = recorded.find((r) => r.version) ?? null;
    let chosen;
    let rule;
    if (ORIGIN_PINS.includes(name) && installed[name]) {
      chosen = installed[name];
      const over = recorded.filter((r) => r.version && r.version !== chosen);
      rule = over.length
        ? `override: the origin's pin wins over ${over.map((r) => `${r.repo} ${r.version}`).join(", ")} (R2 rule 1)`
        : "the origin's pin (R2 rule 1)";
    } else if (locked) {
      chosen = locked.version;
      rule =
        sources[0].repo === locked.repo
          ? `${locked.repo}'s lockfile (R2 rule 2)`
          : `${locked.repo}'s lockfile, as no earlier source locks it (R2 rule 3)`;
      const over = recorded.filter((r) => r.version && r.version !== chosen);
      if (over.length)
        rule += `; overrides ${over.map((r) => `${r.repo} ${r.version}`).join(", ")}`;
    } else {
      chosen = installed[name] ?? null;
      rule = "not in any source lockfile";
    }
    return {
      name,
      recorded,
      chosen,
      rule,
      installed: installed[name] ?? null,
      importers: recorded.reduce((n, r) => n + r.importedBy, 0),
    };
  });
}

function generated(results, chosen) {
  const total = results.reduce((n, r) => n + r.files.length, 0);
  const out = [
    BEGIN,
    "",
    "<!-- Written by scripts/port-averlo.mjs from scripts/ports.manifest.json; do not edit between these markers. -->",
    "",
    "## Ported files",
    "",
    `${total} files from ${results.length} source${results.length === 1 ? "" : "s"}, each a byte-identical copy of its source at the pinned commit. \`npm run check:ports\` compares them with the source (scripts/ports.lock.json).`,
    "",
  ];
  for (const r of results) {
    out.push(`### ${r.repo} @ \`${r.commit}\``, "");
    out.push(
      `Entries: ${r.entries.map(code).join(", ")}.`,
      "",
      table(
        ["Source repository", "Commit", "Source path", "Target path"],
        r.files.map((f) => [
          r.repo,
          code(r.commit),
          code(f.source),
          code(f.target),
        ]),
      ),
      "",
    );
    if (r.exclude.length) {
      out.push(
        "Excluded by the manifest: never copied, even when the closure reaches them; their references stay in the ported files unchanged.",
        "",
        table(
          ["Excluded path", "Reason", "Reached by the closure"],
          r.exclude.map((e) => {
            const hit = r.excluded.filter((x) => covers(e.path, x.source));
            return [
              code(e.path),
              cell(e.reason || "excluded"),
              hit.length ? hit.map((x) => code(x.source)).join(", ") : "no",
            ];
          }),
        ),
        "",
      );
    }
  }
  out.push(
    "## npm packages",
    "",
    "Where the closure stops. Versions follow research R2: the origin's pins win for next, react, react-dom, motion, typescript, @playwright/test and eslint; otherwise averlo-web-transition's lockfile, then the other sources' for packages not yet present. Every override is named.",
    "",
    table(
      ["Package", "Imported by", "Source lockfile", "Version used", "Rule"],
      chosen.map((p) => [
        code(p.name),
        `${p.importers} port${p.importers === 1 ? "" : "s"}`,
        p.recorded
          .map((r) => `${r.repo} ${r.version ?? "(not locked)"}`)
          .join("; "),
        p.chosen ?? "(not set)",
        cell(p.rule),
      ]),
    ),
    "",
    END,
  );
  return out.join("\n");
}

async function formatted(text, file) {
  try {
    const prettier = await import("prettier");
    const options = (await prettier.resolveConfig(file)) ?? {};
    return await prettier.format(text, { ...options, filepath: file });
  } catch {
    return text;
  }
}

function removeEmptyParents(root, file, stopAt) {
  for (
    let dir = dirname(join(root, file));
    dir.startsWith(join(root, stopAt)) && dir !== join(root, stopAt);
    dir = dirname(dir)
  ) {
    if (readdirSync(dir).length) return;
    rmdirSync(dir);
  }
}

// ---------------------------------------------------------------- main ----

export async function port(root, env = process.env, log = console.log) {
  const manifest = loadManifest(root);
  const previous = loadLock(root);
  const madeByPort = new Set(
    (previous?.sources ?? []).flatMap((s) =>
      (s.files ?? []).map((f) => f.target),
    ),
  );

  const termsSetting = env.SCAN_TERMS_FILE || DEFAULT_TERMS_FILE;
  let terms;
  try {
    terms = loadTerms(
      isAbsolute(termsSetting) ? termsSetting : resolve(root, termsSetting),
    );
  } catch (error) {
    throw new Stop(`${error.message}; the port needs it to check pulled files`);
  }
  const shown = (path) =>
    termsIn(path, terms).length ? "<a path redacted, it holds a term>" : path;

  const dir = sourcesDir(root, env);
  if (!dir) {
    throw new Stop(
      "PORT_SOURCES_DIR is not set (in the environment, .local/env or .local/origin.md)",
    );
  }
  if (!existsSync(dir)) {
    throw new Stop("PORT_SOURCES_DIR names a folder that does not exist");
  }

  const pagePath = join(root, DESIGN_SOURCE);
  const page = existsSync(pagePath)
    ? readFileSync(pagePath, "utf8")
    : `# Design source\n\nWhere the template's ports come from.\n\n${BEGIN}\n${END}\n`;
  const begin = page.indexOf(BEGIN);
  const end = page.indexOf(END);
  if (begin === -1 || end < begin) {
    throw new Stop(
      `${DESIGN_SOURCE} needs the markers ${BEGIN} and ${END} around its generated section`,
    );
  }

  const problems = [];
  const results = [];
  for (const source of manifest.sources) {
    const repoDir = join(dir, source.repo);
    const resolved = resolveCommit(repoDir, source.commit);
    if (!resolved) {
      throw new Stop(
        `the clone ${source.repo} is missing from PORT_SOURCES_DIR, or has no commit ${source.commit}`,
      );
    }
    const found = closure(repoDir, source.commit, source, problems);
    const lockText = showFile(repoDir, source.commit, "package-lock.json");
    const lock = lockText ? JSON.parse(lockText.toString("utf8")) : null;
    results.push({
      repo: source.repo,
      commit: source.commit,
      resolved,
      repoDir,
      entries: source.entries,
      files: found.files.map((path) => ({
        source: path,
        target: targetOf(path, source.targetRoot),
      })),
      excluded: found.excluded,
      exclude: source.exclude,
      packages: [...found.packages]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([name, importers]) => ({
          name,
          version: lockVersion(lock, name),
          importedBy: importers.size,
        })),
    });
  }

  // Collisions, terms and licences, all before anything is written.
  const licenceFile = join(root, LICENCES);
  const { rows } = existsSync(licenceFile)
    ? parseLicences(readFileSync(licenceFile, "utf8"))
    : { rows: [] };
  const seen = new Map();
  for (const r of results) {
    for (const file of r.files) {
      const label = `${r.repo}@${r.commit}:${shown(file.source)}`;
      const target = shown(file.target);
      if (seen.has(file.target)) {
        problems.push(
          `${target}: pulled from both ${seen.get(file.target)} and ${r.repo}`,
        );
      }
      seen.set(file.target, r.repo);
      const owned = manifest.templateOwned.find((p) =>
        file.target.startsWith(p),
      );
      if (owned) {
        problems.push(
          `${target} (from ${label}) is under the template-owned path ${owned}`,
        );
      } else if (
        existsSync(join(root, file.target)) &&
        !madeByPort.has(file.target)
      ) {
        problems.push(
          `${target} (from ${label}) would overwrite a template file the port script did not make`,
        );
      }
      const bytes = showFile(r.repoDir, r.commit, file.source);
      const hits = [
        ...new Set([
          ...termsIn(file.source, terms),
          ...termsIn(bytes.toString("latin1"), terms),
        ]),
      ];
      if (hits.length) {
        problems.push(
          `${label}: holds blocked ${hits.length === 1 ? "term" : "terms"} ${hits.join(", ")}`,
        );
      }
      if (!CODE.test(file.source)) {
        const matching = rows.filter((row) =>
          row.entries.some((e) => covers(e, file.target)),
        );
        if (matching.length === 0) {
          problems.push(
            `${target} (from ${label}): an asset with no row in ${LICENCES} (unknown licence); add its row or exclude it in ${MANIFEST}`,
          );
        } else if (matching.some((row) => !row.redistributable)) {
          problems.push(
            `${target} (from ${label}): ${LICENCES} marks it not redistributable; exclude it in ${MANIFEST}`,
          );
        }
      }
    }
  }
  if (problems.length) {
    for (const p of problems) log(`  ${p}`);
    throw new Stop(`${problems.length} problem(s); nothing was copied`);
  }

  // Write: drop ports the closure no longer reaches, copy, record.
  const targets = new Set(results.flatMap((r) => r.files.map((f) => f.target)));
  for (const old of madeByPort) {
    if (targets.has(old) || !existsSync(join(root, old))) continue;
    rmSync(join(root, old));
    removeEmptyParents(root, old, "src");
    log(`  removed ${old} (no longer in the closure)`);
  }
  for (const r of results) {
    for (const file of r.files) {
      const bytes = showFile(r.repoDir, r.commit, file.source);
      const full = join(root, file.target);
      if (existsSync(full) && readFileSync(full).equals(bytes)) continue;
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, bytes);
    }
  }

  const pkgFile = join(root, "package.json");
  const pkg = existsSync(pkgFile)
    ? JSON.parse(readFileSync(pkgFile, "utf8"))
    : {};
  const chosen = choosePackages(results, pkg);

  const lock = {
    $comment:
      "Written by scripts/port-averlo.mjs from scripts/ports.manifest.json; read by scripts/check-ports.mjs. Do not edit: change the manifest and run the port script.",
    sources: results.map((r) => ({
      repo: r.repo,
      commit: r.commit,
      resolved: r.resolved,
      entries: r.entries,
      files: r.files,
      excluded: r.excluded,
      packages: r.packages,
    })),
  };
  const lockPath = join(root, LOCK);
  writeFileSync(
    lockPath,
    await formatted(`${JSON.stringify(lock, null, 2)}\n`, lockPath),
  );
  const next =
    page.slice(0, begin) +
    generated(results, chosen) +
    page.slice(end + END.length);
  mkdirSync(dirname(pagePath), { recursive: true });
  writeFileSync(pagePath, await formatted(next, pagePath));

  for (const r of results) {
    log(
      `  ${r.repo}@${r.commit}: ${r.files.length} files, ${r.excluded.length} excluded, ${r.packages.length} packages`,
    );
  }
  for (const p of chosen) {
    if (p.chosen && p.installed !== p.chosen) {
      log(
        `  package.json: ${p.name} should be ${p.chosen} (${p.installed ? `it has ${p.installed}` : "missing"}; ${p.rule})`,
      );
    }
  }
  return { results, chosen };
}

async function main() {
  const root = findRoot();
  try {
    const { results } = await port(root);
    const total = results.reduce((n, r) => n + r.files.length, 0);
    console.log(
      `port done: ${total} files; wrote ${LOCK} and ${DESIGN_SOURCE}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof Stop) {
      console.log(`port stopped: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await main();
}
