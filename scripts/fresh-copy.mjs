#!/usr/bin/env node
// The fresh-copy check (T042, SC-001): a new deck owner goes from "use this
// template" to a running placeholder deck in under 10 minutes.
//
//   node scripts/fresh-copy.mjs --source <path or url> [--branch <name>]
//                               [--port <n>] [--keep] [--deck]
//                               [--folder <empty or new folder>]
//
// It clones the source into a new temporary folder (or --folder), copies
// this checkout's ignored .local/ into it (it stays ignored there), runs
// `npm ci` and `npm run build`, starts the production server, and steps
// through every slide with Playwright. It prints the time each step took and
// the total against SC-001's 10 minutes. A clone of a local path holds its
// committed HEAD only, not uncommitted changes.
//
// With --deck (feature 004, T400; FR-004) it is a deck owner's copy: no
// .local/ is copied, and after `npm ci` it runs `npm run check:deck`, which
// must pass without one. A machine whose browser needs LD_LIBRARY_PATH sets
// it in the environment it runs this from.
//
// Exit codes: 0 passed, 1 a step failed or the total was over 10 minutes,
// 2 usage error.
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv, runCommand, startServer } from "./gate.mjs";

const LIMIT_MS = 10 * 60 * 1000;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = { port: 3496, keep: false, deck: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--keep") args.keep = true;
    else if (flag === "--deck") args.deck = true;
    else if (["--source", "--branch", "--port", "--folder"].includes(flag)) {
      const value = argv[++i];
      if (!value) throw new Error(`${flag} needs a value`);
      args[flag.slice(2)] = value;
    } else throw new Error(`unknown argument ${flag}`);
  }
  if (!args.source) throw new Error("--source <path or url> is required");
  args.port = Number(args.port);
  return args;
}

/** The steps a run takes, in order: the template's, or a deck owner's. */
export function freshCopySteps({ deck }) {
  return deck
    ? ["clone", "npm ci", "npm run check:deck"]
    : [
        "clone",
        "copy .local/",
        "npm ci",
        "npm run build",
        "start",
        "step through the deck",
      ];
}

const seconds = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

/** Steps through every slide with the keyboard, from the first to the last. */
async function stepThrough(folder, url) {
  const require = createRequire(join(folder, "package.json"));
  const { chromium } = require("playwright-core");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}/?s=1&intro=off`);
    await page.waitForFunction(
      () =>
        document.getElementById("deck-boot")?.dataset.state === "done" &&
        !document.documentElement.hasAttribute("data-arriving"),
      undefined,
      { timeout: 15_000 },
    );
    const current = page.locator("main:not([aria-hidden])");
    const label = async () => (await current.getAttribute("aria-label")) ?? "";
    const [, total] = /^1 \/ (\d+)$/.exec(await label()) ?? [];
    if (!total) throw new Error(`the deck did not open on slide 1`);
    for (let n = 2; n <= Number(total); n++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(
        (want) =>
          document
            .querySelector("main:not([aria-hidden])")
            ?.getAttribute("aria-label") === want,
        `${n} / ${total}`,
        { timeout: 10_000 },
      );
    }
    if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
    return Number(total);
  } finally {
    await browser.close();
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`fresh-copy: ${error.message}`);
    return 2;
  }
  const local = join(repoRoot, ".local");
  if (!args.deck && !existsSync(local)) {
    console.error("fresh-copy: this checkout has no .local/ to copy");
    return 2;
  }
  if (args.folder && existsSync(args.folder)) {
    if (readdirSync(args.folder).length) {
      console.error(`fresh-copy: ${args.folder} is not empty`);
      return 2;
    }
  }

  let folder;
  if (args.folder) {
    folder = resolve(args.folder);
    mkdirSync(folder, { recursive: true });
  } else folder = mkdtempSync(join(tmpdir(), "deck-fresh-copy-"));
  const plan = freshCopySteps(args);
  const started = Date.now();
  const times = [];
  let stop = null;
  let failed = null;
  const step = async (name, run) => {
    if (!plan.includes(name)) throw new Error(`no step ${name}`);
    const at = Date.now();
    console.log(`\n=== fresh-copy: ${name} ===`);
    await run();
    times.push([name, Date.now() - at]);
  };
  const exec = async (cmd, opts = {}) => {
    const { code } = await runCommand(cmd, {
      cwd: folder,
      output: process.stdout,
      ...opts,
    });
    if (code !== 0) throw new Error(`${cmd.join(" ")} exited with ${code}`);
  };

  try {
    await step("clone", () =>
      exec(
        [
          "git",
          "clone",
          "--depth",
          "1",
          ...(args.branch ? ["--branch", args.branch] : []),
          args.source,
          folder,
        ],
        { cwd: tmpdir() },
      ),
    );
    if (args.deck) await deckSteps();
    else await templateSteps();
  } catch (error) {
    failed = error.message;
  } finally {
    await stop?.();
  }

  async function deckSteps() {
    if (existsSync(join(folder, ".local")))
      throw new Error("the clone has a .local/");
    await step("npm ci", () => exec(["npm", "ci"]));
    await step("npm run check:deck", () => exec(["npm", "run", "check:deck"]));
  }

  async function templateSteps() {
    await step("copy .local/", async () => {
      cpSync(local, join(folder, ".local"), { recursive: true });
      await exec(["git", "check-ignore", "-q", ".local/env"]);
    });
    loadEnv(join(folder, ".local", "env"));
    await step("npm ci", () => exec(["npm", "ci"]));
    await step("npm run build", () => exec(["npm", "run", "build"]));
    const url = `http://127.0.0.1:${args.port}`;
    await step("start", async () => {
      ({ stop } = await startServer({
        name: "fresh-copy",
        cmd: [
          "npx",
          "next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(args.port),
        ],
        cwd: folder,
        url,
        output: process.stdout,
      }));
    });
    await step("step through the deck", async () => {
      const total = await stepThrough(folder, url);
      console.log(`fresh-copy: stepped through ${total} slides`);
    });
  }

  // SC-001's 10 minutes are the template's run; a deck's checks have no limit.
  const elapsed = Date.now() - started;
  const over = !args.deck && elapsed > LIMIT_MS;
  console.log(`\n# Fresh-copy check${args.deck ? " (deck)" : ""}\n`);
  for (const [name, ms] of times) console.log(`- ${name}: ${seconds(ms)}`);
  console.log(
    `- total: ${seconds(elapsed)}${args.deck ? "" : ` (SC-001: under ${seconds(LIMIT_MS)})`}`,
  );
  if (failed) console.log(`\nResult: failed — ${failed}`);
  else if (over) console.log("\nResult: failed — over 10 minutes");
  else console.log("\nResult: passed");

  if (args.keep) console.log(`The copy is kept at ${folder}`);
  else rmSync(folder, { recursive: true, force: true });
  return failed || over ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await main();
}
