import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A scratch deck (feature 003): a slide folder of its own under
// tests/slides/.scratch/ (ignored by git, lint, prettier and tsc), indexed by
// scripts/slides-index.mjs, and a dev server that runs the deck of that
// folder's slides (SLIDES_DIR, next.config.ts) on its own port, beside the
// production build the other specs use. Next allows one dev server per
// folder, so a spec that uses one runs in one project.

const root = fileURLToPath(new URL("../../", import.meta.url));

/** Writes `files` (name → source) into a fresh scratch slide folder named
 *  `name`, indexes it, and returns its path relative to the repository. */
export function scratchDeck(name: string, files: Record<string, string>) {
  const dir = join("tests", "slides", ".scratch", name);
  rmSync(join(root, dir), { recursive: true, force: true });
  mkdirSync(join(root, dir), { recursive: true });
  for (const [file, source] of Object.entries(files))
    writeFileSync(join(root, dir, file), source);
  const indexed = spawnSync(
    process.execPath,
    [join(root, "scripts", "slides-index.mjs")],
    { cwd: root, env: { ...process.env, SLIDES_DIR: dir }, encoding: "utf8" },
  );
  if (indexed.status !== 0)
    throw new Error(`slides-index failed for ${dir}:\n${indexed.stderr}`);
  return dir;
}

/** Removes a scratch slide folder. */
export function removeScratch(dir: string) {
  rmSync(join(root, dir), { recursive: true, force: true });
}

/** Rejects when something already listens on the port. */
const portFree = (port: number) =>
  new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(new Error(`port ${port} is busy; stop it or choose another`)),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve()));
  });

const turnLock = join(root, "tests", "slides", ".scratch", ".dev-turn");

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Next runs one dev server per folder: a second `next dev` exits at once.
 *  So the specs that start one (files, presets) take turns, through a lock
 *  of their own that holds the worker's pid. Waits for the turn, and
 *  resolves its release. A lock whose worker is gone is taken over. */
async function takeTurn(timeoutMs = 540_000) {
  mkdirSync(dirname(turnLock), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      mkdirSync(turnLock);
      writeFileSync(join(turnLock, "pid"), String(process.pid));
      let held = true;
      return () => {
        if (held) rmSync(turnLock, { recursive: true, force: true });
        held = false;
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    let holder = 0;
    try {
      holder = Number(readFileSync(join(turnLock, "pid"), "utf8"));
    } catch {}
    if (holder && !alive(holder)) {
      rmSync(turnLock, { recursive: true, force: true });
      continue;
    }
    if (Date.now() > deadline)
      throw new Error("another scratch deck's dev server kept its turn");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** A dev server running the deck of slide folder `dir` on `port`, with
 *  `paths` compiled before it resolves. `stop` ends its process group; the
 *  next spec's dev server starts once this one has exited. */
export async function devDeck(dir: string, port: number, paths: string[]) {
  const release = await takeTurn();
  try {
    await portFree(port);
  } catch (error) {
    release();
    throw error;
  }
  const origin = `http://127.0.0.1:${port}`;
  const server: ChildProcess = spawn(
    "npx",
    ["next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: { ...process.env, SLIDES_DIR: dir },
      detached: true,
      stdio: "ignore",
    },
  );
  server.on("exit", release);
  server.on("error", release);
  const stop = () => {
    if (!server.pid) return;
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  };
  try {
    for (const path of paths) {
      const deadline = Date.now() + 240_000;
      for (;;) {
        try {
          const response = await fetch(`${origin}${path}`);
          if (response.ok) break;
        } catch {}
        if (Date.now() > deadline)
          throw new Error(`the dev server did not answer ${path}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (error) {
    stop();
    throw error;
  }
  return { origin, stop };
}
