import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { langs } from "../../src/deck/langs";
import { slides } from "../../src/deck/slides";
import { copy } from "./fixtures/13-file-example";
import { devDeck, removeScratch, scratchDeck } from "./scratch";

// A slide given as a file (feature 003, US1, T300): a numbered file in the
// deck's slide folder shows in its numbered place, appears in the menu and
// the overview, prints, and keeps its `?s=` link.
//
// The template's deck is its slide files (src/slides/, J2). This spec runs a
// second deck (./scratch): a copy of those files with one more,
// tests/slides/fixtures/13-file-example.tsx, put in at number 13, the files
// from 13 on moved one number up. It runs on a dev server on its own port,
// which builds into .next/dev and leaves the production build the other
// specs use alone. Next allows one dev server per folder, so the spec runs
// in one project and sets both widths itself.

const root = fileURLToPath(new URL("../../", import.meta.url));
const lang = langs[0];
const port = Number(process.env.FILES_PORT ?? 3195);
const AT = 13;
const N = slides.length + 1;
const words = copy[lang];
const pad = (n: number) => String(n).padStart(2, "0");
const widths = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

/** The deck's slide files, those from `AT` on one number up, and the
 *  example at `AT`. */
function withExample() {
  const files: Record<string, string> = {};
  const deck = join(root, "src", "slides");
  for (const name of readdirSync(deck)) {
    const match = /^(\d+)-(.+\.tsx)$/.exec(name);
    if (!match) continue;
    const n = Number(match[1]);
    files[`${pad(n >= AT ? n + 1 : n)}-${match[2]}`] = readFileSync(
      join(deck, name),
      "utf8",
    );
  }
  files[`${AT}-file-example.tsx`] = readFileSync(
    join(root, "tests", "slides", "fixtures", "13-file-example.tsx"),
    "utf8",
  );
  return files;
}

test("the default deck has no file slide", async ({ page }) => {
  await page.goto("/print");
  await expect(page.locator("[data-print-page]")).toHaveCount(slides.length);
  await expect(page.locator("[data-file-example]")).toHaveCount(0);
});

test.describe("a deck with a slide file", () => {
  let deck: { origin: string; stop: () => void } | undefined;
  let dir = "";
  let origin = "";
  test.beforeAll(async ({}, info) => {
    test.skip(
      info.project.name !== "desktop",
      "one dev server per folder: the desktop project sets both widths",
    );
    // Up to 9 minutes waiting for the other dev server spec's turn.
    test.setTimeout(840_000);
    dir = scratchDeck("files", withExample());
    // Compile both routes before the first test.
    deck = await devDeck(dir, port, ["/print", "/?intro=off"]);
    origin = deck.origin;
  });
  test.afterAll(() => {
    deck?.stop();
    if (dir) removeScratch(dir);
  });

  const current = (page: Page) => page.locator("main:not([aria-hidden])");

  async function open(page: Page, s: number) {
    await page.addInitScript(() =>
      sessionStorage.setItem("deck:intro-played", "1"),
    );
    await page.goto(`${origin}/?s=${s}&intro=off`);
    await page.waitForFunction(
      () =>
        document.getElementById("deck-boot")?.dataset.state === "done" &&
        !document.documentElement.hasAttribute("data-arriving"),
      undefined,
      { timeout: 60_000 },
    );
  }

  for (const size of widths)
    test.describe(`at ${size.width}`, () => {
      test.use({ viewport: size });

      test("shows in its numbered place and keeps its ?s= link", async ({
        page,
      }) => {
        await open(page, AT);
        await expect(current(page)).toHaveAttribute(
          "aria-label",
          `${AT} / ${N}`,
        );
        const file = current(page).locator("[data-file-example]");
        await expect(file).toHaveText(words.body);
        // Inside the slide's frame, with its kind.
        await expect(
          current(page).locator('[data-kind="slide"] [data-file-example]'),
        ).toHaveCount(1);
        await expect(page).toHaveURL(/[?&]s=13\b/);

        // The slides around it are the placeholder deck's 12th and 13th.
        await page.keyboard.press("ArrowLeft");
        await expect(current(page)).toHaveAttribute(
          "aria-label",
          `${AT - 1} / ${N}`,
        );
        await expect(page).toHaveURL(/[?&]s=12\b/);
        await expect(current(page).locator("[data-file-example]")).toHaveCount(
          0,
        );
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await expect(current(page)).toHaveAttribute(
          "aria-label",
          `${AT + 1} / ${N}`,
        );
        await expect(current(page)).toContainText(slides[AT - 1].title[lang]);
        await page.keyboard.press("ArrowLeft");
        await expect(page).toHaveURL(/[?&]s=13\b/);

        // A reload lands on it again.
        await page.reload();
        await expect(current(page).locator("[data-file-example]")).toHaveText(
          words.body,
          { timeout: 30_000 },
        );
      });

      test("appears in the menu and the overview", async ({ page }) => {
        await open(page, AT);
        await page.keyboard.press("m");
        const menu = page.getByRole("dialog", { name: "Menu" });
        await expect(
          menu
            .getByRole("list", { name: "Slides", exact: true })
            .getByRole("button", {
              name: `${pad(AT)} ${words.title}`,
              exact: true,
            }),
        ).toBeVisible();
        await page.keyboard.press("o");
        const overview = page.getByRole("dialog", { name: "Overview" });
        const thumbs = overview.locator("[data-thumb]");
        await expect(thumbs).toHaveCount(N);
        const thumb = thumbs.nth(AT - 1);
        await expect(thumb).toContainText(`${pad(AT)}${words.title}`);
        await expect(thumb.locator("[data-file-example]")).toHaveText(
          words.body,
        );
      });

      test("prints on its own page", async ({ page }) => {
        await page.goto(`${origin}/print?lang=${lang}`);
        const pages = page.locator("[data-print-page]");
        await expect(pages).toHaveCount(N);
        const own = pages.nth(AT - 1);
        await expect(own.locator("[data-file-example]")).toHaveText(words.body);
        await expect(own).toContainText(`${pad(AT)} / ${pad(N)}`);
        await expect(page.locator("[data-file-example]")).toHaveCount(1);
      });
    });
});
