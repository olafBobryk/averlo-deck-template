// Fixture tests for scripts/gate.mjs (FR-021): result reporting with fake
// checks, env loading, and servers that are always stopped.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import {
  exitCode,
  formatReport,
  loadEnv,
  runGate,
  startServer,
} from "../../scripts/gate.mjs";
import { tempDir } from "./fixtures.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

const node = process.execPath;
const quiet = { write() {} };

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function answers(url) {
  try {
    const response = await fetch(url);
    return response.status;
  } catch {
    return null;
  }
}

function httpServerScript(port) {
  return `require("node:http").createServer((q, s) => s.end("ok")).listen(${port}, "127.0.0.1")`;
}

describe("gate", () => {
  test("reports passed, failed, a missing tool and a check's own not run", async () => {
    const { dir, cleanup } = tempDir("gate-fixture-");
    cleanups.push(cleanup);
    const checks = [
      { name: "ok", cmd: [node, "-e", "process.exit(0)"] },
      { name: "bad", cmd: [node, "-e", "process.exit(1)"] },
      {
        name: "tool",
        cmd: [node, "-e", "process.exit(0)"],
        requires: { path: "scripts/not-there.mjs", task: "T999" },
      },
      {
        name: "signal",
        cmd: [
          node,
          "-e",
          "console.log('checking'); console.log('not run — PORT_SOURCES_DIR is not set'); process.exit(3)",
        ],
      },
      {
        name: "later",
        cmd: [node, "-e", "process.exit(1)"],
        notRun: () => "T012 and T016",
      },
    ];
    const results = await runGate(checks, { cwd: dir, output: quiet });
    assert.deepEqual(
      results.map((r) => [r.name, r.status]),
      [
        ["ok", "passed"],
        ["bad", "failed"],
        ["tool", "not run"],
        ["signal", "not run"],
        ["later", "not run"],
      ],
    );
    assert.equal(exitCode(results), 1);

    const report = formatReport(results, {
      date: "2026-01-01T00:00:00.000Z",
      branch: "fixture-branch",
      commit: "abc1234",
    });
    assert.match(report, /^# Gate report/m);
    assert.match(report, /Date: 2026-01-01T00:00:00\.000Z/);
    assert.match(report, /Branch: fixture-branch/);
    assert.match(report, /Commit: abc1234/);
    assert.match(report, /\| ok +\| passed +\|/);
    assert.match(report, /\| bad +\| failed +\| exit code 1/);
    assert.match(report, /\| tool +\| not run +\| not run — T999/);
    assert.match(
      report,
      /\| signal +\| not run +\| not run — PORT_SOURCES_DIR is not set +\|/,
    );
    assert.match(report, /\| later +\| not run +\| not run — T012 and T016/);
    assert.match(report, /Overall: failed/);
  });

  test("exits 0 when nothing failed, and shows not run", async () => {
    const { dir, cleanup } = tempDir("gate-fixture-");
    cleanups.push(cleanup);
    const results = await runGate(
      [
        { name: "ok", cmd: [node, "-e", ""] },
        { name: "later", cmd: [node, "-e", ""], notRun: () => "T020" },
      ],
      { cwd: dir, output: quiet },
    );
    assert.equal(exitCode(results), 0);
    const report = formatReport(results, {
      date: "d",
      branch: "b",
      commit: "c",
    });
    assert.match(report, /Overall: passed \(1 not run\)/);
  });

  test("a note is shown with the result", async () => {
    const { dir, cleanup } = tempDir("gate-fixture-");
    cleanups.push(cleanup);
    const results = await runGate(
      [
        {
          name: "strips",
          cmd: [node, "-e", ""],
          note: "self-check against the origin build",
        },
      ],
      { cwd: dir, output: quiet },
    );
    const report = formatReport(results, {
      date: "d",
      branch: "b",
      commit: "c",
    });
    assert.match(
      report,
      /\| strips +\| passed +\| self-check against the origin build/,
    );
  });

  test("loadEnv fills missing values without overriding set ones and names the missing", () => {
    const { dir, cleanup } = tempDir("gate-env-");
    cleanups.push(cleanup);
    const file = join(dir, "env");
    writeFileSync(
      file,
      "# local machine\n\nLD_LIBRARY_PATH=/fixture/lib\nPORT_SOURCES_DIR=/from-file\nEXTRA = spaced value \n",
    );
    const env = { PORT_SOURCES_DIR: "/already-set" };
    const { missing } = loadEnv(file, env);
    assert.equal(env.LD_LIBRARY_PATH, "/fixture/lib");
    assert.equal(env.PORT_SOURCES_DIR, "/already-set");
    assert.equal(env.EXTRA, "spaced value");
    assert.deepEqual(missing, ["SCAN_TERMS_FILE", "ORIGIN_URL", "TARGET_URL"]);
  });

  test("loadEnv reports all five values missing when the file is absent", () => {
    const env = {};
    const { missing } = loadEnv("/nonexistent/env-file", env);
    assert.equal(missing.length, 5);
  });

  test("a check's server is started before it and stopped after it", async () => {
    const { dir, cleanup } = tempDir("gate-server-");
    cleanups.push(cleanup);
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const results = await runGate(
      [
        {
          name: "needs-server",
          servers: [
            { name: "fake", cmd: [node, "-e", httpServerScript(port)], url },
          ],
          cmd: [
            node,
            "-e",
            `fetch(${JSON.stringify(url)}).then(r => process.exit(r.status === 200 ? 0 : 1), () => process.exit(1))`,
          ],
        },
      ],
      { cwd: dir, output: quiet },
    );
    assert.equal(results[0].status, "passed", results[0].reason);
    assert.equal(
      await answers(url),
      null,
      "server still running after the check",
    );
  });

  test("a server is stopped even when its check fails", async () => {
    const { dir, cleanup } = tempDir("gate-server-");
    cleanups.push(cleanup);
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const results = await runGate(
      [
        {
          name: "fails",
          servers: [
            { name: "fake", cmd: [node, "-e", httpServerScript(port)], url },
          ],
          cmd: [node, "-e", "process.exit(2)"],
        },
      ],
      { cwd: dir, output: quiet },
    );
    assert.equal(results[0].status, "failed");
    assert.equal(await answers(url), null);
  });

  test("startServer rejects when the server exits before answering", async () => {
    const port = await freePort();
    await assert.rejects(
      startServer({
        name: "dies",
        cmd: [node, "-e", "process.exit(1)"],
        url: `http://127.0.0.1:${port}`,
        timeoutMs: 10_000,
        output: quiet,
      }),
      /exited/,
    );
  });
});
