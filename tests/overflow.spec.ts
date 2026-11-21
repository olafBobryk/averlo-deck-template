import { spawn, type ChildProcess } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";
import { slideContent } from "../src/deck/content";
import { slides } from "../src/deck/slides";

// A slide whose content is too long for its stage shows what fits and, in
// development only, reports the overflow (spec, edge cases). The report is a
// console warning that says "overflow" and names the slide by its position
// ("3 / 8"), as the slide's own label does.
//
// The report exists only under `next dev`, so this file starts its own dev
// server on DEV_PORT (default 3196) beside the smoke suite's production
// server, and stops it after. Desktop project only: one dev server per run.

// Waiting on the owner: the origin deck has no slide overflow report, so
// this check needs a new dev-only reporter (open question in the P1 PR).
// Until it is answered, the development check is marked fixme.
const awaitingOwner = true;

const port = Number(process.env.DEV_PORT ?? 3196);
const dev = `http://127.0.0.1:${port}`;
let server: ChildProcess | undefined;

/** The first slide with a headline and a body: the one made over-long. */
const S = slides.findIndex((slide) => slideContent(slide.id).headline) + 1;
const label = `${S} / ${slides.length}`;

async function waitFor(url: string, ms: number) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    if (Date.now() > until) throw new Error(`${url} did not answer`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

test.beforeAll(async ({}, info) => {
  if (awaitingOwner || info.project.name !== "desktop") return;
  test.setTimeout(300_000);
  const env = { ...process.env };
  delete env.NODE_ENV;
  server = spawn(
    "npx",
    ["next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { detached: true, stdio: "ignore", env },
  );
  // The first request compiles the deck's page.
  await waitFor(`${dev}/?intro=off`, 240_000);
});

test.afterAll(async () => {
  if (!server?.pid) return;
  const exited = new Promise((resolve) => server!.once("exit", resolve));
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // Already gone.
  }
  const timer = setTimeout(() => {
    try {
      process.kill(-server!.pid!, "SIGKILL");
    } catch {
      // Already gone.
    }
  }, 5_000);
  await exited;
  clearTimeout(timer);
});

/** Console warnings and errors that report an overflow. */
function watchReports(page: Page) {
  const reports: string[] = [];
  page.on("console", (message) => {
    if (!["warning", "error"].includes(message.type())) return;
    if (/overflow/i.test(message.text())) reports.push(message.text());
  });
  return reports;
}

async function openDeck(page: Page, base: string) {
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`${base}/?s=${S}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 60_000 },
  );
}

/** Makes the live placeholder over-long: lines of placeholder text added to
 *  its body, then a resize, as a long edit and a window change would. */
async function overfill(page: Page) {
  await page
    .locator("main:not([aria-hidden]) [data-kind]")
    .evaluate((slide) => {
      const body = slide.querySelector("[data-slide-body]") ?? slide;
      for (let i = 0; i < 60; i++) {
        const line = document.createElement("p");
        line.textContent = "Placeholder text";
        body.append(line);
      }
    });
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width - 1, height: size.height });
}

test("an over-long placeholder reports its overflow in development", async ({
  page,
}, info) => {
  test.fixme(awaitingOwner, "open question: the dev overflow report");
  test.skip(info.project.name !== "desktop", "one dev server, desktop only");
  test.setTimeout(120_000);
  expect(S, "a slide with a headline").toBeGreaterThan(0);
  const reports = watchReports(page);
  await openDeck(page, dev);
  // The placeholder as shipped fits: nothing is reported.
  await page.waitForTimeout(1_000);
  expect(reports).toEqual([]);
  await overfill(page);
  await expect
    .poll(() => reports.length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  expect(reports.join("\n")).toContain(label);
  // It shows what fits: the slide clips, the page does not scroll.
  const clipped = await page
    .locator("main:not([aria-hidden]) [data-kind]")
    .evaluate((slide) => ({
      overflow: getComputedStyle(slide).overflowY,
      tall: slide.scrollHeight > slide.clientHeight,
      page: document.scrollingElement!.scrollTop,
    }));
  expect(clipped.tall).toBe(true);
  expect(clipped.overflow).toBe("hidden");
  expect(clipped.page).toBe(0);
});

test("a production build reports nothing", async ({ page, baseURL }) => {
  expect(S, "a slide with a headline").toBeGreaterThan(0);
  const reports = watchReports(page);
  await openDeck(page, baseURL!);
  await overfill(page);
  await page.waitForTimeout(1_000);
  expect(reports).toEqual([]);
});
