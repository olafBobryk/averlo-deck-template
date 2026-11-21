// Shared helpers for the tool tests: throwaway git repositories and a runner
// for the repo's scripts. Every fixture uses invented terms only.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export const dummyTerms = ["Zorblax", "Quuxcorp"];

/** A fresh temp dir; removed by the returned cleanup. */
export function tempDir(prefix = "tools-test-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function write(cwd, path, content) {
  const full = join(cwd, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

export function commitAll(cwd, message) {
  git(cwd, "add", "-A");
  git(cwd, "commit", "-q", "--allow-empty", "-m", message);
}

/**
 * A temp git repo that passes the public scan: one dependency, a licence
 * list covering it, and a terms file outside the repo.
 */
export function makeRepo({ terms = dummyTerms } = {}) {
  const { dir, cleanup } = tempDir("scan-fixture-");
  const repo = join(dir, "repo");
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.name", "Fixture");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(repo, "config", "commit.gpgsign", "false");
  const termsFile = join(dir, "terms.txt");
  if (terms !== null) writeFileSync(termsFile, terms.join("\n") + "\n");
  write(
    repo,
    "package.json",
    JSON.stringify(
      {
        name: "fixture",
        dependencies: { "fake-dep": "1.0.0" },
        devDependencies: { "@fake/dev-tool": "1.0.0" },
      },
      null,
      2,
    ) + "\n",
  );
  write(repo, "docs/licences.md", licences([]));
  write(repo, "README.md", "A plain fixture.\n");
  commitAll(repo, "Start the fixture");
  return { dir, repo, termsFile, cleanup };
}

/** A licence list with the fixture's packages plus extra rows. */
export function licences(extraRows) {
  const rows = [
    "| `fake-dep` | npm | MIT | yes |",
    "| `@fake/dev-tool` | npm | ISC | yes |",
    ...extraRows,
  ];
  return [
    "# Licences",
    "",
    "| File, package or port | Source | Licence | Redistributable |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

/** Runs a repo script with node; returns { code, out } (stdout + stderr). */
export function runScript(script, args, { cwd, env = {}, input } = {}) {
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, "scripts", script), ...args],
    {
      cwd,
      env: { ...process.env, ...env },
      encoding: "utf8",
      input,
      timeout: 60_000,
    },
  );
  return {
    code: result.status,
    out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/** True when the output names none of the given terms, in any case. */
export function leaksNoTerm(out, terms = dummyTerms) {
  const lower = out.toLowerCase();
  return terms.every((term) => !lower.includes(term.toLowerCase()));
}
