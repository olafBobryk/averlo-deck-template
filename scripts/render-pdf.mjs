// Renders the deck to one PDF per language (public/pdf/<slug>-<lang>.pdf),
// 1920×1080 per page, from the built app's /print view. Runs after
// `next build` (npm run build), locally and on Vercel.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { config } from "../src/brand/config.ts";
import { langs } from "../src/deck/langs.ts";
import { pdfName } from "../src/deck/pdf-name.ts";

const root = new URL("..", import.meta.url);
const port = Number(process.env.PDF_PORT ?? 3199);
const origin = `http://127.0.0.1:${port}`;
const outDir = new URL("public/pdf/", root);
mkdirSync(outDir, { recursive: true });

const server = spawn(
  "npx",
  ["next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, NODE_ENV: "production" },
    detached: true,
  },
);
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
};
process.on("exit", stop);

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${origin}/print`);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error("next start did not come up");
}

async function launch() {
  const { chromium } = await import("playwright-core");
  // Vercel's build image (Amazon Linux) has no system Chromium: use the
  // Lambda-ready build. Locally, use Chrome / Playwright's Chromium.
  if (process.platform === "linux") {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      executablePath: await sparticuz.executablePath(),
      args: sparticuz.args,
      headless: true,
    });
  }
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

try {
  await waitForServer();
  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  for (const lang of langs) {
    await page.goto(`${origin}/print?lang=${lang}`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) => img.decode().catch(() => {})),
      );
    });
    const name = pdfName(config.deckTitle, lang);
    const path = new URL(name, outDir);
    await page.pdf({
      path: path.pathname,
      width: "1920px",
      height: "1080px",
      printBackground: true,
      preferCSSPageSize: true,
    });
    console.log(`render-pdf: wrote public/pdf/${name}`);
  }
  await browser.close();
} catch (error) {
  console.error("render-pdf:", error);
  process.exitCode = 1;
} finally {
  stop();
}
