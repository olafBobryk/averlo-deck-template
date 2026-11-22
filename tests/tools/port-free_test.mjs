// Tests for the PDF render's port check (the owner's answer: "the PDF
// script doesn't check its port is free… Fail clearly instead").
// scripts/render-pdf.mjs starts `next start` on PDF_PORT; when something
// already answers there, it must stop with an error naming the port, before
// it starts a server or renders anything. No build is needed: the script
// exits before it starts one.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import { assertPortFree } from "../../scripts/port-free.mjs";
import { repoRoot } from "./fixtures.mjs";

const cleanups = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()();
});

/** A dummy server on a free port of 127.0.0.1; it answers 503 to anything,
 *  so a render that missed the check would wait on it, not render it. */
async function holdPort() {
  const server = createServer((_, res) => {
    res.statusCode = 503;
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));
  return server.address().port;
}

async function freePort() {
  const port = await holdPort();
  await cleanups.pop()();
  return port;
}

/** Runs the PDF script with PDF_PORT set; kills its process group after
 *  `timeout` ms. Resolves { code, stderr, timedOut }. */
function renderPdf(port, timeout = 15_000) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [join(repoRoot, "scripts", "render-pdf.mjs")],
      {
        cwd: repoRoot,
        env: { ...process.env, PDF_PORT: String(port) },
        stdio: ["ignore", "ignore", "pipe"],
        detached: true,
      },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => (stderr += chunk));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }, timeout);
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
      resolve({ code, stderr, timedOut });
    });
  });
}

describe("assertPortFree", () => {
  test("resolves for a free port", async () => {
    await assertPortFree(await freePort());
  });

  test("rejects for a busy port, naming it", async () => {
    const port = await holdPort();
    await assert.rejects(assertPortFree(port), (error) => {
      assert.match(error.message, new RegExp(`\\b${port}\\b`));
      assert.match(error.message, /busy/);
      return true;
    });
  });
});

describe("render-pdf.mjs", () => {
  test("fails clearly, naming the port, when PDF_PORT is busy", async () => {
    const port = await holdPort();
    const { code, stderr, timedOut } = await renderPdf(port);
    assert.equal(timedOut, false, "the script did not stop on its own");
    assert.equal(code, 1);
    assert.match(stderr, new RegExp(`render-pdf: port ${port} is busy`));
  });
});
