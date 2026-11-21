#!/usr/bin/env node
// Public scan (research R5, FR-017..FR-019).
//
//   npm run scan:public                  scan the repository
//   npm run scan:public -- --text <file> scan one text (a PR body, a report)
//   npm run scan:public -- --text [-]    scan stdin
//
// Blocked terms come from SCAN_TERMS_FILE (default .local/public-scan-terms.txt,
// relative to the repository root): one term per line, matched
// case-insensitively. The output names only files, lines, commits and the
// term's number in the list, never a term or the matched text, and never a
// path that itself contains a term.
//
// The repository scan fails on a term in: the contents or paths of tracked
// (and untracked, not ignored) files, every diff and commit message of
// `git log --all`, and every ref name and annotated tag message. It also
// fails when a font, image, direct dependency or port is not covered by a row
// of docs/licences.md, or is covered by a row marked not redistributable.
//
// Exit codes: 0 passed, 1 findings, 2 configuration or usage error.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_TERMS_FILE = ".local/public-scan-terms.txt";
const LICENCES_FILE = "docs/licences.md";
const PORTS_MANIFEST = "scripts/ports.manifest.json";
const LICENCE_HEADER = "file, package or port";
const FONT_EXT = ["woff", "woff2", "ttf", "otf", "eot"];
const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "ico"];
const MAX_LINES = 200;

class ConfigError extends Error {}

// ---------------------------------------------------------------- terms ----

export function loadTerms(file) {
  if (!existsSync(file)) {
    throw new ConfigError(
      "public scan: the terms file is missing (set SCAN_TERMS_FILE or create " +
        `${DEFAULT_TERMS_FILE}); nothing was scanned`,
    );
  }
  const terms = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((term) => term.toLowerCase());
  if (terms.length === 0) {
    throw new ConfigError(
      "public scan: the terms file has no terms; nothing was scanned",
    );
  }
  return terms;
}

/** 1-based numbers of the terms found in `text`. */
export function termsIn(text, terms) {
  const lower = text.toLowerCase();
  const found = [];
  terms.forEach((term, i) => {
    if (lower.includes(term)) found.push(i + 1);
  });
  return found;
}

/** [{ line, term }] for every line of `text` that holds a term. */
export function scanLines(text, terms) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const term of termsIn(line, terms)) hits.push({ line: i + 1, term });
  });
  return hits;
}

function list(numbers) {
  return numbers.length === 1
    ? `term ${numbers[0]}`
    : `terms ${numbers.join(", ")}`;
}

// ------------------------------------------------------------------ git ----

function git(cwd, args) {
  return execFileSync("git", ["-c", "core.quotePath=false", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function blobId(buffer) {
  return createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex")
    .slice(0, 7);
}

/** A path safe to print: the path itself, or a placeholder when it holds a term. */
function shownPath(path, terms, id) {
  const hit = termsIn(path, terms);
  if (hit.length === 0) return path;
  return `<${id ? `${id} ` : ""}path redacted, it matches ${list(hit)}>`;
}

function repoFiles(root) {
  const out = git(root, [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
  ]);
  return [...new Set(out.split("\0").filter(Boolean))].sort();
}

// --------------------------------------------------------- file contents ----

function scanFiles(root, files, terms, report) {
  let scanned = 0;
  for (const path of files) {
    const full = join(root, path);
    let stat;
    try {
      stat = lstatSync(full);
    } catch {
      continue; // deleted in the working tree
    }
    let content;
    if (stat.isSymbolicLink()) content = Buffer.from(readlinkSync(full));
    else if (stat.isFile()) content = readFileSync(full);
    else continue;
    scanned += 1;
    const id = `blob ${blobId(content)}`;
    const pathHits = termsIn(path, terms);
    if (pathHits.length) report(`file <${id}>: path matches ${list(pathHits)}`);
    const shown = shownPath(path, terms, id);
    const head = content.subarray(0, 8000);
    if (head.includes(0)) {
      // Binary: no lines, but names in metadata still count.
      const hits = termsIn(content.toString("latin1"), terms);
      if (hits.length) report(`${shown} (binary): ${list(hits)}`);
      continue;
    }
    for (const { line, term } of scanLines(content.toString("utf8"), terms)) {
      report(`${shown}:${line}: term ${term}`);
    }
  }
  return scanned;
}

// -------------------------------------------------------------- history ----

function hasCommits(root) {
  return git(root, ["rev-list", "--all", "-n", "1"]).trim() !== "";
}

function scanHistory(root, terms, report) {
  const out = git(root, [
    "log",
    "--all",
    "-p",
    "--no-color",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--format=%x01%h",
  ]);
  let commit = "";
  let path = "";
  let oldPath = "";
  let inHunk = false;
  let oldLine = 0;
  let newLine = 0;
  for (const raw of out.split("\n")) {
    if (raw.startsWith("\x01")) {
      commit = raw.slice(1);
      path = "";
      inHunk = false;
      continue;
    }
    if (raw.startsWith("diff --git ")) {
      inHunk = false;
      path = "";
      oldPath = "";
      const hits = termsIn(raw, terms);
      if (hits.length)
        report(`history ${commit}: a path matches ${list(hits)}`);
      continue;
    }
    if (!inHunk) {
      if (raw.startsWith("--- ")) oldPath = raw.slice(4).replace(/^a\//, "");
      if (raw.startsWith("+++ ")) {
        path = raw.slice(4).replace(/^b\//, "");
        if (path === "/dev/null") path = oldPath;
      }
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (hunk) {
        inHunk = true;
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[2]);
        const hits = termsIn(raw.slice(hunk[0].length), terms);
        if (hits.length) {
          report(
            `history ${commit} ${shownPath(path, terms)}:${newLine} (hunk header): ${list(hits)}`,
          );
        }
        continue;
      }
      // Other header lines (mode, index, ---/+++, "Binary files ... differ")
      // only name paths, which the diff --git line already covered.
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      const hits = termsIn(raw.slice(hunk[0].length), terms);
      if (hits.length) {
        report(
          `history ${commit} ${shownPath(path, terms)}:${newLine} (hunk header): ${list(hits)}`,
        );
      }
      continue;
    }
    const mark = raw[0];
    let line;
    let kind;
    if (mark === "+") {
      line = newLine++;
      kind = "added";
    } else if (mark === "-") {
      line = oldLine++;
      kind = "removed";
    } else if (mark === " ") {
      line = newLine++;
      oldLine++;
      kind = "context";
    } else {
      continue; // "\ No newline at end of file", or the blank line between commits
    }
    const hits = termsIn(raw.slice(1), terms);
    if (hits.length) {
      report(
        `history ${commit} ${shownPath(path, terms)}:${line} (${kind}): ${list(hits)}`,
      );
    }
  }
  return git(root, ["rev-list", "--all", "--count"]).trim();
}

function scanCommitMessages(root, terms, report) {
  const out = git(root, [
    "log",
    "--all",
    "--format=%x01%h%x02%an <%ae>%x02%cn <%ce>%x02%B",
  ]);
  for (const entry of out.split("\x01").filter(Boolean)) {
    const [sha, author, committer, body = ""] = entry.split("\x02");
    const who = [...termsIn(author, terms), ...termsIn(committer, terms)];
    if (who.length) report(`commit ${sha} author or committer: ${list(who)}`);
    for (const { line, term } of scanLines(body.replace(/\n+$/, ""), terms)) {
      report(`commit message ${sha} line ${line}: term ${term}`);
    }
  }
}

function scanRefs(root, terms, report) {
  const out = git(root, [
    "for-each-ref",
    "--format=%01%(objectname:short)%02%(objecttype)%02%(refname)%02%(contents)",
  ]);
  let count = 0;
  for (const entry of out.split("\x01").filter(Boolean)) {
    const [sha, type, name, contents = ""] = entry.split("\x02");
    count += 1;
    const hits = termsIn(name, terms);
    if (hits.length) {
      const kind = name.startsWith("refs/tags/") ? "tag" : "branch or ref";
      report(`${kind} at ${sha}: name matches ${list(hits)}`);
    }
    if (type === "tag") {
      for (const { line, term } of scanLines(contents, terms)) {
        report(`tag message at ${sha} line ${line}: term ${term}`);
      }
    }
  }
  return count;
}

// ------------------------------------------------------------- licences ----

/** Splits a markdown table row into trimmed cells. */
function cells(line) {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|")) body = body.slice(0, -1);
  return body.split("|").map((cell) => cell.trim());
}

/**
 * Rows of every table in docs/licences.md whose header starts with
 * "File, package or port": [{ line, entries, licence, redistributable }].
 */
export function parseLicences(text) {
  const rows = [];
  const errors = [];
  let inTable = false;
  text.split("\n").forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim().startsWith("|")) {
      inTable = false;
      return;
    }
    const row = cells(raw);
    if (!inTable) {
      inTable = row[0].toLowerCase().startsWith(LICENCE_HEADER);
      return;
    }
    if (row.every((cell) => /^:?-+:?$/.test(cell))) return; // separator
    if (row.length < 4) {
      errors.push(`${LICENCES_FILE}:${line}: a row needs 4 columns`);
      return;
    }
    const entries = [...row[0].matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
    if (entries.length === 0) {
      errors.push(
        `${LICENCES_FILE}:${line}: the first column has no backticked entry`,
      );
      return;
    }
    const value = row[3].toLowerCase();
    let redistributable;
    if (/^yes\b/.test(value)) redistributable = true;
    else if (/^no\b/.test(value)) redistributable = false;
    else {
      errors.push(
        `${LICENCES_FILE}:${line}: "Redistributable" must start with yes or no`,
      );
      return;
    }
    rows.push({ line, entries, licence: row[2], redistributable });
  });
  return { rows, errors };
}

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

/** Whether a licence entry (package name, path, folder or glob) covers `item`. */
export function covers(entry, item) {
  if (/[*?]/.test(entry)) return globToRegExp(entry).test(item);
  const folder = entry.endsWith("/") ? entry : `${entry}/`;
  return item === entry || item.startsWith(folder);
}

function portTargets(root, problems) {
  const file = join(root, PORTS_MANIFEST);
  if (!existsSync(file)) return [];
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    problems.push(`${PORTS_MANIFEST}: not valid JSON`);
    return [];
  }
  // Tolerant reader: every string under a key named target, targets, to,
  // dest or destination is a port's target path.
  const keys = new Set(["target", "targets", "to", "dest", "destination"]);
  const targets = [];
  const walk = (value, key) => {
    if (typeof value === "string") {
      if (keys.has(key)) targets.push(value.replace(/^\.\//, ""));
    } else if (Array.isArray(value)) {
      value.forEach((v) => walk(v, key));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, k);
    }
  };
  walk(data, "");
  return [...new Set(targets)];
}

function checkLicences(root, files, terms, report) {
  const isAsset = (path) => {
    const ext = path.toLowerCase().split(".").pop();
    return (
      path.includes(".") && (FONT_EXT.includes(ext) || IMAGE_EXT.includes(ext))
    );
  };
  const items = files
    .filter(isAsset)
    .filter((path) => existsSync(join(root, path)))
    .map((path) => ({ kind: "file", name: path }));

  const pkgFile = join(root, "package.json");
  if (existsSync(pkgFile)) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
    } catch {
      report("package.json: not valid JSON");
      pkg = {};
    }
    const names = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);
    for (const name of [...names].sort()) items.push({ kind: "package", name });
  }

  const problems = [];
  for (const name of portTargets(root, problems))
    items.push({ kind: "port", name });
  problems.forEach(report);

  const counts = { file: 0, package: 0, port: 0 };
  items.forEach((item) => (counts[item.kind] += 1));
  if (items.length === 0) return counts;

  const licenceFile = join(root, LICENCES_FILE);
  if (!existsSync(licenceFile)) {
    report(`licence: ${LICENCES_FILE} is missing`);
    return counts;
  }
  const { rows, errors } = parseLicences(readFileSync(licenceFile, "utf8"));
  errors.forEach(report);

  for (const item of items) {
    const label = `${item.kind} ${shownPath(item.name, terms)}`;
    const matching = rows.filter((row) =>
      item.kind === "port"
        ? row.entries.some(
            (e) =>
              covers(e, item.name) || covers(e, item.name.replace(/\/?$/, "/")),
          )
        : row.entries.some((e) => covers(e, item.name)),
    );
    if (matching.length === 0) {
      report(`licence: ${label} is not covered by ${LICENCES_FILE}`);
    } else {
      for (const row of matching.filter((r) => !r.redistributable)) {
        report(
          `licence: ${label} is marked not redistributable (${LICENCES_FILE}:${row.line})`,
        );
      }
    }
  }
  return counts;
}

// ----------------------------------------------------------------- main ----

function collector() {
  const lines = [];
  const seen = new Set();
  return {
    lines,
    report(line) {
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    },
  };
}

function print(lines) {
  for (const line of lines.slice(0, MAX_LINES)) console.log(`  ${line}`);
  if (lines.length > MAX_LINES) {
    console.log(`  ... and ${lines.length - MAX_LINES} more`);
  }
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function scanText(args, terms) {
  const target = args[0];
  let text;
  if (!target || target === "-") text = readStdin();
  else if (!existsSync(target))
    throw new ConfigError("public scan: the text file is missing");
  else text = readFileSync(target, "utf8");
  const hits = scanLines(text, terms);
  if (hits.length) {
    console.log(`public scan (text): ${hits.length} hit(s)`);
    print(hits.map(({ line, term }) => `line ${line}: term ${term}`));
    console.log("public scan (text) failed");
    return 1;
  }
  console.log("public scan (text) passed");
  return 0;
}

function scanRepo(root, terms) {
  const { lines, report } = collector();
  const files = repoFiles(root);
  const scanned = scanFiles(root, files, terms, report);
  let commits = "0";
  let refs = 0;
  if (hasCommits(root)) {
    commits = scanHistory(root, terms, report);
    scanCommitMessages(root, terms, report);
    refs = scanRefs(root, terms, report);
  }
  const counts = checkLicences(root, files, terms, report);
  const summary =
    `${scanned} files, ${commits} commits, ${refs} refs; licence coverage: ` +
    `${counts.file} fonts and images, ${counts.package} packages, ${counts.port} ports`;
  if (lines.length) {
    console.log(`public scan: ${lines.length} problem(s)`);
    print(lines);
    console.log(`public scan failed (${summary})`);
    return 1;
  }
  console.log(`public scan passed (${summary})`);
  return 0;
}

function main(argv) {
  let root;
  try {
    root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  } catch {
    root = process.cwd();
  }
  const termsSetting = process.env.SCAN_TERMS_FILE || DEFAULT_TERMS_FILE;
  const termsFile = isAbsolute(termsSetting)
    ? termsSetting
    : resolve(root, termsSetting);
  try {
    const terms = loadTerms(termsFile);
    const textAt = argv.indexOf("--text");
    if (textAt !== -1) return scanText(argv.slice(textAt + 1), terms);
    if (argv.length) {
      throw new ConfigError(
        `public scan: unknown arguments (use --text <file>)`,
      );
    }
    return scanRepo(root, terms);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      return 2;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main(process.argv.slice(2));
}
