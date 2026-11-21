#!/usr/bin/env node
// The drift test (`npm run check:ports`, FR-009, research R3a step 9).
//
// Every port that scripts/port-averlo.mjs recorded in scripts/ports.lock.json
// is compared byte for byte with `git show <commit>:<source path>` in its
// source's clone under PORT_SOURCES_DIR. It fails when a port differs or is
// missing, or when the lock no longer matches the manifest's pins (re-run
// the port script after a re-pin). It reports "not run" (exit 3, with the
// reason on the last line) when the sources are not on this machine, or when
// the manifest turns the drift test off (`"driftTest": false`), so a deck
// made from the template without the sources does not fail.
//
// PORT_SOURCES_DIR comes from the environment, else .local/env, else the
// "Port sources folder (PORT_SOURCES_DIR):" line of .local/origin.md. The
// output names files only, never a blocked term.
//
// Exit codes: 0 passed, 1 failed, 2 configuration error, 3 not run.
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  LOCK,
  MANIFEST,
  Stop,
  findRoot,
  loadLock,
  loadManifest,
  resolveCommit,
  showFile,
  sourcesDir,
} from "./port-averlo.mjs";
import { loadTerms, termsIn } from "./scan-public.mjs";

const NOT_RUN = 3;

function redactor(root, env) {
  const setting = env.SCAN_TERMS_FILE || ".local/public-scan-terms.txt";
  try {
    const terms = loadTerms(
      isAbsolute(setting) ? setting : resolve(root, setting),
    );
    return (path) =>
      termsIn(path, terms).length ? "<a path redacted, it holds a term>" : path;
  } catch {
    return (path) => path;
  }
}

const sameList = (a = [], b = []) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function checkPorts(root, env = process.env) {
  const lines = [];
  const notRun = (reason) => ({ code: NOT_RUN, lines, reason });
  const manifest = loadManifest(root);
  if (!manifest.driftTest) {
    return notRun(
      `the drift test is turned off in ${MANIFEST} ("driftTest": false)`,
    );
  }
  const dir = sourcesDir(root, env);
  if (!dir) {
    return notRun(
      "PORT_SOURCES_DIR is not set (in the environment, .local/env or .local/origin.md), so the port sources are not on this machine",
    );
  }
  if (!existsSync(dir)) {
    return notRun("PORT_SOURCES_DIR names a folder that does not exist");
  }
  for (const source of manifest.sources) {
    if (!resolveCommit(join(dir, source.repo), source.commit)) {
      return notRun(
        `the clone ${source.repo} under PORT_SOURCES_DIR is missing, or has no commit ${source.commit} (fetch it)`,
      );
    }
  }

  const lock = loadLock(root);
  if (!lock) {
    lines.push(
      `${LOCK} is missing: run node scripts/port-averlo.mjs to make the ports`,
    );
    return { code: 1, lines };
  }
  const shown = redactor(root, env);
  const problems = [];
  const locked = lock.sources ?? [];
  for (const source of manifest.sources) {
    const entry = locked.find((s) => s.repo === source.repo);
    if (
      !entry ||
      entry.commit !== source.commit ||
      !sameList(entry.entries, source.entries)
    ) {
      problems.push(
        `${source.repo}: ${LOCK} does not match ${MANIFEST} (pin or entries changed): run node scripts/port-averlo.mjs`,
      );
    }
  }
  for (const entry of locked) {
    if (!manifest.sources.some((s) => s.repo === entry.repo)) {
      problems.push(
        `${entry.repo}: in ${LOCK} but not in ${MANIFEST}: run node scripts/port-averlo.mjs`,
      );
    }
  }

  let total = 0;
  let matching = 0;
  for (const entry of locked) {
    const repoDir = join(dir, entry.repo);
    if (!resolveCommit(repoDir, entry.commit)) {
      problems.push(
        `${entry.repo}: the clone has no commit ${entry.commit} from ${LOCK}`,
      );
      continue;
    }
    for (const file of entry.files ?? []) {
      total += 1;
      const target = shown(file.target);
      const source = showFile(repoDir, entry.commit, file.source);
      if (!source) {
        problems.push(
          `${target}: its source ${shown(file.source)} is not in ${entry.repo}@${entry.commit}`,
        );
        continue;
      }
      const full = join(root, file.target);
      if (!existsSync(full)) {
        problems.push(
          `${target}: missing (the port of ${entry.repo}@${entry.commit}:${shown(file.source)})`,
        );
        continue;
      }
      if (!readFileSync(full).equals(source)) {
        problems.push(
          `${target}: differs from ${entry.repo}@${entry.commit}:${shown(file.source)}`,
        );
        continue;
      }
      matching += 1;
    }
  }
  const percent = total ? Math.floor((matching / total) * 100) : 0;
  lines.push(...problems.map((p) => `  ${p}`));
  lines.push(
    `check-ports: ${matching} of ${total} ports match their source (${percent}%)`,
  );
  return { code: problems.length || total === 0 ? 1 : 0, lines };
}

function main() {
  const root = findRoot();
  let result;
  try {
    result = checkPorts(root);
  } catch (error) {
    if (error instanceof Stop) {
      console.log(`check-ports: ${error.message}`);
      return 2;
    }
    throw error;
  }
  for (const line of result.lines) console.log(line);
  if (result.code === NOT_RUN) {
    console.log(`not run — ${result.reason}`);
  } else {
    console.log(
      result.code === 0 ? "check-ports passed" : "check-ports failed",
    );
  }
  return result.code;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main();
}
