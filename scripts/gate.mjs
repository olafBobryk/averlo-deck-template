#!/usr/bin/env node
// The gate (`npm run gate`, FR-021). It loads the machine settings from the
// ignored .local/env, runs every check in order, starts and stops the
// servers a check needs, and reports each check as passed, failed or not run.
// The report is printed and written to gate-results/gate-report.md, then
// checked with the public scan's text mode.
//
// A check reports "not run" when its tool does not exist yet (the report
// names the task that creates it), or by exiting with code 3: its last
// output line is then the reason.
//
// The module exports its pieces for tests/tools/gate_test.mjs; main() runs
// only when the file is invoked directly.
import { spawn, spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ENV_KEYS = [
  "LD_LIBRARY_PATH",
  "PORT_SOURCES_DIR",
  "SCAN_TERMS_FILE",
  "ORIGIN_URL",
  "TARGET_URL",
];

const NOT_RUN_EXIT = 3;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------------ env ----

/** KEY=VALUE lines; blank lines and # comments are skipped. */
export function parseEnv(text) {
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

/**
 * Loads `file` into `env` without overriding values already set, and names
 * the expected values that are still missing.
 */
export function loadEnv(file, env = process.env) {
  const found = existsSync(file);
  if (found) {
    for (const [key, value] of Object.entries(
      parseEnv(readFileSync(file, "utf8")),
    )) {
      if (env[key] === undefined || env[key] === "") env[key] = value;
    }
  }
  const missing = ENV_KEYS.filter((key) => !env[key]);
  return { found, missing };
}

// ------------------------------------------------------------ processes ----

const liveGroups = new Set();

function killGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    // already gone
  }
}

/** Forwards a stream to `write`, line by line with a prefix, keeping a tail. */
function pipeLines(stream, { prefix = "", write, tail, log }) {
  let partial = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    log?.write(chunk);
    const lines = (partial + chunk).split("\n");
    partial = lines.pop();
    for (const line of lines) {
      write(`${prefix}${line}\n`);
      if (tail) {
        tail.push(line);
        if (tail.length > 50) tail.shift();
      }
    }
  });
  stream.on("end", () => {
    if (partial) {
      write(`${prefix}${partial}\n`);
      tail?.push(partial);
    }
  });
}

function spawnGroup(cmd, { cwd, env }) {
  const child = spawn(cmd[0], cmd.slice(1), {
    cwd,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (child.pid) liveGroups.add(child.pid);
  child.on("exit", () => liveGroups.delete(child.pid));
  return child;
}

/** Runs a command in its own process group; resolves { code, tail }. */
export function runCommand(cmd, { cwd, env = process.env, output, log } = {}) {
  return new Promise((done) => {
    const write = (text) => output?.write(text);
    const tail = [];
    let child;
    try {
      child = spawnGroup(cmd, { cwd, env });
    } catch (error) {
      done({ code: 127, tail: [String(error.message)] });
      return;
    }
    pipeLines(child.stdout, { write, tail, log });
    pipeLines(child.stderr, { write, tail, log });
    child.on("error", (error) => done({ code: 127, tail: [error.message] }));
    // A check may leave a server behind in its group (the carried PDF script
    // stops `npx`, not the server under it): when the check exits, stop its
    // whole group, so nothing outlives it and its pipes close.
    let exited = null;
    child.on("exit", (code, signal) => {
      exited = { code, signal };
      killGroup(child.pid, "SIGTERM");
    });
    child.on("close", (code, signal) => {
      const end = exited ?? { code, signal };
      done({ code: end.code ?? (end.signal ? 128 : 1), tail });
    });
  });
}

async function answers(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    await response.arrayBuffer();
    return response.status;
  } catch {
    return null;
  }
}

/**
 * Starts a server in its own process group and waits until `url` answers
 * 200. Resolves { stop }; stop() kills the whole group.
 */
export async function startServer({
  name,
  cmd,
  cwd,
  env = process.env,
  url,
  timeoutMs = 180_000,
  output,
}) {
  if ((await answers(url)) !== null) {
    throw new Error(
      `${name} server: something already answers at ${url}; stop it first`,
    );
  }
  const write = (text) => output?.write(text);
  const child = spawnGroup(cmd, { cwd, env });
  let exited = null;
  const exitPromise = new Promise((done) =>
    child.on("exit", (code, signal) => {
      exited = { code, signal };
      done();
    }),
  );
  child.on("error", (error) => {
    exited = { code: 127, error };
  });
  pipeLines(child.stdout, { prefix: `[${name}] `, write });
  pipeLines(child.stderr, { prefix: `[${name}] `, write });

  const stop = async () => {
    if (!child.pid) return;
    if (!exited) {
      killGroup(child.pid, "SIGTERM");
      const timer = setTimeout(() => killGroup(child.pid, "SIGKILL"), 10_000);
      await exitPromise;
      clearTimeout(timer);
    }
    // Members of the group that outlived its leader (npx's children).
    killGroup(child.pid, "SIGKILL");
  };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(
        `${name} server exited before answering (exit code ${exited.code ?? exited.signal})`,
      );
    }
    if ((await answers(url)) === 200) return { stop };
    await new Promise((r) => setTimeout(r, 500));
  }
  await stop();
  throw new Error(`${name} server did not answer 200 at ${url} in time`);
}

// ----------------------------------------------------------------- gate ----

const value = (v) => (typeof v === "function" ? v() : v);

function notRunReason(tail) {
  const lines = tail
    .map((line) => line.trim())
    .filter((line) => line && !/^npm (error|ERR!)/.test(line));
  const last = lines.at(-1) ?? "the check reported not run";
  return last.replace(/^not run\s*[—–-]+\s*/i, "");
}

/**
 * Runs checks in order. A check is
 *   { name, cmd: [command, ...args], env?, note?,
 *     requires?: { path, task },  not run when path is missing
 *     notRun?: () => reason|null, not run with that reason
 *     failIf?: () => reason|null, failed before running
 *     before?: [[command, ...args]] | () => ..., setup commands
 *     servers?: [{ name, cmd, cwd?, url }] | () => ... }
 * Resolves [{ name, status, reason, note }].
 */
export async function runGate(
  checks,
  {
    cwd = process.cwd(),
    env = process.env,
    output = process.stdout,
    logDir,
  } = {},
) {
  const results = [];
  for (const check of checks) {
    output.write(`\n=== gate: ${check.name} ===\n`);
    const result = await runCheck(check, { cwd, env, output, logDir });
    output.write(
      `=== gate: ${check.name}: ${result.status}${result.reason ? ` — ${result.reason}` : ""} ===\n`,
    );
    results.push(result);
  }
  return results;
}

async function runCheck(check, { cwd, env, output, logDir }) {
  const base = { name: check.name, note: value(check.note) ?? null };
  const notRun = (reason) => ({ ...base, status: "not run", reason });
  const failed = (reason) => ({ ...base, status: "failed", reason });

  if (check.requires && !existsSync(resolve(cwd, check.requires.path))) {
    return notRun(check.requires.task);
  }
  const skip = check.notRun?.();
  if (skip) return notRun(skip);
  const blocked = check.failIf?.();
  if (blocked) return failed(blocked);

  const checkEnv = { ...env, ...value(check.env) };
  let log;
  if (logDir) {
    mkdirSync(logDir, { recursive: true });
    log = createWriteStream(join(logDir, `${check.name}.log`));
  }
  const servers = [];
  try {
    for (const step of value(check.before) ?? []) {
      const { code } = await runCommand(step, {
        cwd,
        env: checkEnv,
        output,
        log,
      });
      if (code !== 0) return failed(`setup step failed (exit code ${code})`);
    }
    for (const server of value(check.servers) ?? []) {
      try {
        servers.push(
          await startServer({
            ...server,
            cwd: server.cwd ?? cwd,
            env: checkEnv,
            output,
          }),
        );
      } catch (error) {
        return failed(error.message);
      }
    }
    const { code, tail } = await runCommand(check.cmd, {
      cwd,
      env: checkEnv,
      output,
      log,
    });
    if (code === 0)
      return { ...base, status: "passed", reason: flakyReason(tail) };
    if (code === NOT_RUN_EXIT) return notRun(notRunReason(tail));
    return failed(`exit code ${code}`);
  } finally {
    for (const server of servers.reverse()) await server.stop();
    log?.end();
  }
}

/**
 * Playwright's summary lists tests that passed only on a retry under
 * "N flaky" (owner: "Retry once, report it"). Returns that as a note, or null.
 */
function flakyReason(tail) {
  const at = tail.findIndex((line) => /^\s*\d+ flaky\s*$/.test(line));
  if (at < 0) return null;
  const count = tail[at].trim().split(" ")[0];
  const names = [];
  for (const line of tail.slice(at + 1)) {
    const match = /^\s+(\[[^\]]+\]) › .*? › (.+?)[\s─]*$/.exec(line);
    if (!match) break;
    names.push(`${match[1]} ${match[2]}`);
  }
  return `${count} flaky (passed on retry): ${names.join(", ")}`;
}

export function exitCode(results) {
  return results.some((r) => r.status === "failed") ? 1 : 0;
}

function details(result) {
  const parts = [];
  if (result.status === "not run") parts.push(`not run — ${result.reason}`);
  else if (result.reason) parts.push(result.reason);
  if (result.note && result.status !== "not run") parts.push(result.note);
  return parts.join("; ").replace(/\|/g, "\\|");
}

/** The markdown report: meta, one row per check, and the overall result. */
export function formatReport(
  results,
  { date, branch, commit, missingEnv = [] },
) {
  const failedCount = results.filter((r) => r.status === "failed").length;
  const notRunCount = results.filter((r) => r.status === "not run").length;
  const overall = failedCount
    ? `failed (${failedCount} failed${notRunCount ? `, ${notRunCount} not run` : ""})`
    : `passed${notRunCount ? ` (${notRunCount} not run)` : ""}`;
  const lines = [
    "# Gate report",
    "",
    `- Date: ${date}`,
    `- Branch: ${branch}`,
    `- Commit: ${commit}`,
  ];
  if (missingEnv.length) {
    lines.push(`- Missing from .local/env: ${missingEnv.join(", ")}`);
  }
  lines.push(
    "",
    "| Check | Result | Details |",
    "| --- | --- | --- |",
    ...results.map((r) => `| ${r.name} | ${r.status} | ${details(r)} |`),
    "",
    `Overall: ${overall}`,
    "",
  );
  return lines.join("\n");
}

// --------------------------------------------------------------- checks ----

function portOf(url) {
  const parsed = new URL(url);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

/** The origin's scratch build folder, from .local/origin.md (never printed). */
function originFolder(root) {
  const file = join(root, ".local", "origin.md");
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("- Scratch build for baselines:"));
  const match = line && /`([^`]+)`/.exec(line);
  if (!match) return null;
  let folder = match[1].trim();
  if (folder.startsWith("~/")) folder = join(homedir(), folder.slice(2));
  return isAbsolute(folder) ? folder : resolve(root, folder);
}

function nextStart(url) {
  return [
    "npx",
    "next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    portOf(url),
  ];
}

export function buildChecks(root, env) {
  const hasApp = () => existsSync(join(root, "src", "app"));
  return [
    { name: "check", cmd: ["npm", "run", "check"] },
    { name: "tools", cmd: ["npm", "run", "test:tools"] },
    {
      name: "smoke",
      cmd: ["npm", "run", "test:smoke"],
      notRun: () => (hasApp() ? null : "T012 and T016"),
    },
    {
      name: "strips",
      cmd: ["npm", "run", "test:strips"],
      requires: { path: "playwright.strips.config.ts", task: "T009" },
      note: () =>
        hasApp()
          ? "against the template's production build"
          : "self-check against the origin build",
      failIf: () => {
        if (hasApp()) {
          return env.TARGET_URL ? null : "TARGET_URL is not set in .local/env";
        }
        if (!env.ORIGIN_URL) return "ORIGIN_URL is not set in .local/env";
        const folder = originFolder(root);
        if (!folder) {
          return "no scratch build folder in .local/origin.md";
        }
        if (!existsSync(join(folder, ".next"))) {
          return "the origin scratch folder has no build (T006)";
        }
        return null;
      },
      env: () => (hasApp() ? {} : { TARGET_URL: env.ORIGIN_URL }),
      before: () =>
        hasApp() && !existsSync(join(root, ".next", "BUILD_ID"))
          ? [["npx", "next", "build"]]
          : [],
      servers: () =>
        hasApp()
          ? [
              {
                name: "template",
                cmd: nextStart(env.TARGET_URL),
                cwd: root,
                url: env.TARGET_URL,
              },
            ]
          : [
              {
                name: "origin",
                cmd: nextStart(env.ORIGIN_URL),
                cwd: originFolder(root),
                url: env.ORIGIN_URL,
              },
            ],
    },
    {
      name: "ports",
      cmd: ["npm", "run", "check:ports"],
      requires: { path: "scripts/check-ports.mjs", task: "T020" },
    },
    { name: "scan", cmd: ["npm", "run", "scan:public"] },
  ];
}

// ----------------------------------------------------------------- main ----

function gitValue(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function cleanUpAndExit(code) {
  for (const pid of liveGroups) killGroup(pid, "SIGTERM");
  setTimeout(() => {
    for (const pid of liveGroups) killGroup(pid, "SIGKILL");
    process.exit(code);
  }, 2000).unref();
}

async function main() {
  process.on("SIGINT", () => cleanUpAndExit(130));
  process.on("SIGTERM", () => cleanUpAndExit(143));
  process.on("exit", () => {
    for (const pid of liveGroups) killGroup(pid, "SIGKILL");
  });

  const { found, missing } = loadEnv(join(repoRoot, ".local", "env"));
  if (!found) console.log("gate: .local/env is missing");
  if (missing.length) {
    console.log(`gate: missing from .local/env: ${missing.join(", ")}`);
  }

  const results = await runGate(buildChecks(repoRoot, process.env), {
    cwd: repoRoot,
    env: process.env,
    output: process.stdout,
    logDir: join(repoRoot, "gate-results", "logs"),
  });

  const dirty = gitValue(["status", "--porcelain"]);
  const commit =
    gitValue(["rev-parse", "--short", "HEAD"]) +
    (dirty && dirty !== "unknown" ? " (with uncommitted changes)" : "");
  let report = formatReport(results, {
    date: new Date().toISOString(),
    branch: gitValue(["rev-parse", "--abbrev-ref", "HEAD"]),
    commit,
    missingEnv: missing,
  });
  const reportFile = join(repoRoot, "gate-results", "gate-report.md");
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, report);

  const scan = spawnSync(
    process.execPath,
    [join(repoRoot, "scripts", "scan-public.mjs"), "--text", reportFile],
    { cwd: repoRoot, env: process.env, encoding: "utf8" },
  );
  const reportClean = scan.status === 0;
  report += `\nPublic scan of this report: ${reportClean ? "passed" : "failed"}\n`;
  writeFileSync(reportFile, report);

  console.log(`\n${report}`);
  console.log("Written to gate-results/gate-report.md");
  if (!reportClean) {
    console.log(`${scan.stdout ?? ""}${scan.stderr ?? ""}`.trim());
  }
  process.exitCode = exitCode(results) || (reportClean ? 0 : 1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
