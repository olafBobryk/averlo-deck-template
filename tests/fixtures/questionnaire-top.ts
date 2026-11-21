import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// The parity reference for tests/topbar.spec.ts: the questionnaire's own top,
// rendered by the questionnaire's own runtime (its `Questionnaire` component
// and its built `styles.css`), with the same font override the deck's bar
// uses (research R4: `--font-sf-pro: var(--font-inter)`, Inter from
// next/font/google as `--font-inter`).
//
// Nothing of the questionnaire is committed here. At test time this file:
//   1. finds the questionnaire's clone under PORT_SOURCES_DIR, as the drift
//      test does, at the commit scripts/ports.manifest.json pins it to (its
//      checked-out HEAD until the top bar's port pins it);
//   2. extracts that commit with `git archive` into the ignored
//      .local/questionnaire-top/<key>/pkg, links the clone's node_modules and
//      runs the questionnaire's own `npm run build` there (its dist/);
//   3. writes a minimal Next.js page beside it that renders `Questionnaire`
//      with a generic definition of as many steps as the deck has slides,
//      and builds it as a static export with the clone's own Next.js;
//   4. serves that export from this test process (no child server).
// The clone is only read. The build is cached per commit and page source.

const root = fileURLToPath(new URL("../../", import.meta.url));
const REPO = "averlo-questionnaire-template";
const cacheRoot = join(root, ".local", "questionnaire-top");

export type Reference =
  | { available: true; clone: string; commit: string }
  | { available: false; reason: string };

/** PORT_SOURCES_DIR from the environment, else .local/env, else the line in
 *  .local/origin.md (the same order as scripts/port-averlo.mjs). */
function sourcesDir() {
  const absolute = (dir: string) =>
    isAbsolute(dir) ? dir : resolve(root, dir);
  if (process.env.PORT_SOURCES_DIR)
    return absolute(process.env.PORT_SOURCES_DIR);
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

/** The commit the manifest pins the questionnaire to, else the clone's HEAD. */
function pinnedCommit() {
  const manifest = JSON.parse(
    readFileSync(join(root, "scripts", "ports.manifest.json"), "utf8"),
  ) as { sources?: { repo: string; commit: string }[] };
  return manifest.sources?.find((s) => s.repo === REPO)?.commit ?? "HEAD";
}

async function run(command: string, args: string[], cwd: string, log: string) {
  const output: string[] = [];
  const code = await new Promise<number | null>((done, fail) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => output.push(String(chunk)));
    child.stderr.on("data", (chunk) => output.push(String(chunk)));
    child.on("error", fail);
    child.on("exit", done);
  });
  writeFileSync(log, output.join(""), { flag: "a" });
  if (code !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd} (log: ${log}):\n${output.join("").slice(-2000)}`,
    );
  return output.join("");
}

/** Whether the reference can be rendered on this machine, and if not, why
 *  (reported as "not run", as check:ports does). */
export function findReference(): Reference {
  const dir = sourcesDir();
  if (!dir)
    return {
      available: false,
      reason:
        "PORT_SOURCES_DIR is not set (in the environment, .local/env or .local/origin.md), so the questionnaire's clone is not on this machine",
    };
  const clone = join(dir, REPO);
  if (!existsSync(join(clone, ".git")))
    return {
      available: false,
      reason: `the clone ${REPO} under PORT_SOURCES_DIR is missing`,
    };
  if (!existsSync(join(clone, "node_modules", "next")))
    return {
      available: false,
      reason: `the clone ${REPO} has no node_modules (run npm ci in it)`,
    };
  const pin = pinnedCommit();
  let commit = "";
  try {
    // A read of the clone; it changes nothing there.
    commit = execFileSync(
      "git",
      ["-C", clone, "rev-parse", "--verify", "--quiet", `${pin}^{commit}`],
      { encoding: "utf8" },
    ).trim();
  } catch {
    // Not there: reported below.
  }
  if (!commit)
    return {
      available: false,
      reason: `the clone ${REPO} has no commit ${pin} (fetch it)`,
    };
  return { available: true, clone, commit };
}

/** The page that renders the questionnaire's top: its own runtime, a generic
 *  definition with `steps` steps (the first a section, so the navigator
 *  speaks of slides, as a deck's does), and the font override. */
function pageFiles(steps: number): Record<string, string> {
  const definition = {
    id: "deck-top-reference",
    title: "Placeholder title",
    revision: 1,
    steps: Array.from({ length: steps }, (_, i) =>
      i === 0
        ? { id: "step-1", kind: "section", title: "Placeholder title" }
        : {
            id: `step-${i + 1}`,
            title: "Placeholder title",
            fields: [
              { id: `field-${i + 1}`, type: "text", label: "Placeholder text" },
            ],
          },
    ),
  };
  return {
    "package.json": `{ "private": true, "type": "module" }\n`,
    "next.config.mjs": `export default { output: "export", devIndicators: false, images: { unoptimized: true }, eslint: { ignoreDuringBuilds: true } };\n`,
    "app/definition.json": `${JSON.stringify(definition, null, 2)}\n`,
    "app/reference.css": `/* The deck's font override (research R4), on the questionnaire's own wrapper. */\n.aq { --font-sf-pro: var(--font-inter) !important; }\n`,
    "app/layout.jsx": `import { Inter } from "next/font/google";
import "../../dist/styles.css";
import "./reference.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export default function Layout({ children }) {
  return <html lang="en" className={inter.variable}><body style={{ margin: 0 }}>{children}</body></html>;
}
`,
    "app/page.jsx": `"use client";
import { Questionnaire } from "../../dist/react.js";
import definition from "./definition.json";

export default function Page() {
  return <Questionnaire definition={definition} onSubmit={async () => {}} />;
}
`,
  };
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Builds (or reuses) the static reference for `steps` steps and returns the
 *  folder of its export. */
export async function buildReference(
  reference: Extract<Reference, { available: true }>,
  steps: number,
) {
  const files = pageFiles(steps);
  const key = createHash("sha256")
    .update(reference.commit)
    .update(JSON.stringify(files))
    .digest("hex")
    .slice(0, 16);
  const dir = join(cacheRoot, key);
  const out = join(dir, "pkg", "reference", "out");
  const done = join(dir, "done");
  if (existsSync(done)) return out;

  // One build at a time across workers; a lock older than 15 min is stale.
  mkdirSync(cacheRoot, { recursive: true });
  const lock = `${dir}.lock`;
  const until = Date.now() + 600_000;
  for (;;) {
    try {
      mkdirSync(lock);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    if (existsSync(done)) return out;
    try {
      if (Date.now() - statSync(lock).mtimeMs > 900_000)
        rmSync(lock, { recursive: true, force: true });
    } catch {
      // Released meanwhile.
    }
    if (Date.now() > until)
      throw new Error(`the reference build is locked by ${lock}`);
    await sleep(2000);
  }

  try {
    if (existsSync(done)) return out;
    rmSync(dir, { recursive: true, force: true });
    const pkg = join(dir, "pkg");
    mkdirSync(pkg, { recursive: true });
    const log = join(dir, "build.log");
    // The questionnaire at the pinned commit: only what its build reads.
    const tar = join(dir, "source.tar");
    await run(
      "git",
      [
        "-C",
        reference.clone,
        "archive",
        "--format=tar",
        "-o",
        tar,
        reference.commit,
        "package.json",
        "tsconfig.json",
        "src",
        "scripts/clean-dist.mjs",
        "scripts/copy-styles.mjs",
      ],
      dir,
      log,
    );
    await run("tar", ["-xf", tar, "-C", pkg], dir, log);
    rmSync(tar);
    symlinkSync(
      join(reference.clone, "node_modules"),
      join(pkg, "node_modules"),
      "dir",
    );
    await run("npm", ["run", "build"], pkg, log);

    const app = join(pkg, "reference");
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(app, path)), { recursive: true });
      writeFileSync(join(app, path), content);
    }
    await run(
      process.execPath,
      [join(pkg, "node_modules", "next", "dist", "bin", "next"), "build"],
      app,
      log,
    );
    if (!existsSync(join(out, "index.html")))
      throw new Error(`the reference build wrote no ${out}/index.html`);
    writeFileSync(done, `${reference.commit}\n`);
    return out;
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** Serves the export from this process on 127.0.0.1:`port`. */
export async function serveReference(out: string, port: number) {
  const server = createServer(async (request, response) => {
    let path = decodeURIComponent(
      new URL(request.url ?? "/", "http://reference").pathname,
    );
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(out, path));
    if (!file.startsWith(out)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response
        .writeHead(200, {
          "content-type": types[extname(file)] ?? "application/octet-stream",
        })
        .end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", done);
  });
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
