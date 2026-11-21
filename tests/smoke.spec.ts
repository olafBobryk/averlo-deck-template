import { expect, test, type Page } from "@playwright/test";
import { langs } from "../src/deck/langs";
import { pdfHref } from "../src/deck/model";
import { slides } from "../src/deck/slides";

// The placeholder deck (src/deck/slides.ts): every slide is numbered by its
// position, and its title is read from the data.
const lang = langs[0];
const title = (n: number) => slides[n - 1].title;
const current = (page: Page) => page.locator("main:not([aria-hidden])");

// Every page load must be free of console errors (the deliberate wrong-key
// 403 is the only expected failed request).
function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text().includes("403")) return;
    errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Waits until the hard-load screen is done, so the first key lands. */
async function ready(page: Page) {
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
}

async function unlock(page: Page) {
  // No key: mark the intro as played this session, so the
  // deck opens straight away as on a repeat visit.
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
}

test("open: no key, PDFs served, out of search engines", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/?s=3&intro=off");
  await expect(current(page)).toHaveAttribute(
    "aria-label",
    `3 / ${slides.length}`,
    { timeout: 15_000 },
  );
  await expect(
    current(page).getByRole("heading", { name: title(3)[lang] }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  for (const lang of langs) {
    const pdf = await page.request.get(pdfHref(lang));
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["x-robots-tag"]).toContain("noindex");
  }
  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toMatch(/Disallow: \//);
  expect((await page.request.get("/unlock")).status()).toBe(404);
  expect(
    (await page.request.post("/api/unlock", { data: { key: "x" } })).status(),
  ).toBe(404);
  expect(errors).toEqual([]);
});

test("keys move slides and keep the URL in step", async ({ page }) => {
  const errors = watchConsole(page);
  await unlock(page);
  await page.goto("/?s=1");
  await ready(page);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/s=2/);
  await page.keyboard.press("End");
  await expect(page).toHaveURL(new RegExp(`s=${slides.length}(?!\\d)`));
  await expect(
    current(page).getByRole("heading", { name: title(slides.length)[lang] }),
  ).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page).toHaveURL(/s=1(?!\d)/);
  expect(errors).toEqual([]);
});

test("menu: slide list and the PDF downloads", async ({ page }) => {
  const errors = watchConsole(page);
  await unlock(page);
  await page.goto("/?s=3");
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu.locator("[aria-current='true']")).toContainText(
    title(3)[lang],
  );
  await menu.getByRole("button", { name: "Download" }).click();
  for (const lang of langs) {
    const link = page.getByRole("menu").locator(`a[href="${pdfHref(lang)}"]`);
    await expect(link).toBeVisible();
    const pdf = await page.request.get(pdfHref(lang));
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  }
  expect(errors).toEqual([]);
});

test("overview shows every slide and jumps to one", async ({ page }) => {
  const errors = watchConsole(page);
  await unlock(page);
  await page.goto("/?s=1");
  await ready(page);
  await page.keyboard.press("o");
  const overview = page.getByRole("dialog", { name: "Overview" });
  await expect(overview).toBeVisible();
  await expect(overview.getByRole("listitem")).toHaveCount(slides.length);
  const target = Math.min(slides.length, 5);
  await overview
    .getByRole("button", {
      name: `${String(target).padStart(2, "0")} ${title(target)[lang]}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`s=${target}(?!\\d)`));
  expect(errors).toEqual([]);
});
