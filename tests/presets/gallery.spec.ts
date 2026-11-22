import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { langs } from "../../src/deck/langs";
import { galleryPdfName } from "../../src/deck/pdf-name";
import { slideContent } from "../../src/deck/content";
import { gallery } from "../../src/presets/gallery";
import { registry } from "../../src/presets/registry";
import { expectFits } from "./fit";

// The preset gallery (feature 002, FR-004, SC-002, SC-005): a separate deck
// at /gallery with a slide for every preset in the registry and a second
// slide for its alternate example. Each fits its stage at 390 and 1440 (the
// two projects), passes axe's colour contrast, and prints: the gallery's PDF
// has one page per slide. The default deck is not touched.

async function openGallery(page: Page, s: number) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/gallery?s=${s}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

const N = gallery.slides.length;
/** A gallery slide's position (1-based), by id. */
const at = (id: string) => gallery.slides.findIndex((s) => s.id === id) + 1;

test("the gallery has a title slide, a divider per family in use and two slides per preset", () => {
  const families = new Set(registry.map((entry) => entry.family));
  expect(gallery.slides[0].kind).toBe("title");
  expect(N).toBe(1 + families.size + 2 * registry.length);
  expect(gallery.slides.filter((s) => s.kind === "divider")).toHaveLength(
    families.size,
  );
  const ids = gallery.slides.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("every registry entry has a gallery slide for its example and its alternate", () => {
  for (const entry of registry) {
    const { example, alternate } = gallery.presetSlides(entry.name);
    expect(example, entry.name).toBeTruthy();
    expect(alternate, entry.name).toBeTruthy();
    expect(gallery.content[example!.id].blocks).toContainEqual(entry.example);
    expect(gallery.content[alternate!.id].blocks).toContainEqual(
      entry.alternate,
    );
  }
});

test("the gallery's content is its own: the default deck's is unchanged", () => {
  for (const slide of gallery.slides)
    expect(slideContent(slide.id).blocks, slide.id).toEqual([]);
});

test("/gallery opens on its title slide", async ({ page }) => {
  await openGallery(page, 1);
  const main = page.locator("main:not([aria-hidden])");
  await expect(main).toHaveAttribute("aria-label", `1 / ${N}`);
  await expect(
    main.getByRole("heading", { name: gallery.slides[0].title[langs[0]] }),
  ).toBeVisible();
});

test("every gallery slide fits its stage (SC-002)", async ({ page }) => {
  test.setTimeout(30_000 + N * 10_000);
  for (let s = 1; s <= N; s++) {
    await openGallery(page, s);
    await expectFits(page, `gallery slide ${s} (${gallery.slides[s - 1].id})`);
  }
});

test("each preset renders its example and its alternate, and both fit (SC-005)", async ({
  page,
}) => {
  test.setTimeout(30_000 + registry.length * 20_000);
  for (const entry of registry) {
    const slides = gallery.presetSlides(entry.name);
    for (const slide of [slides.example!, slides.alternate!]) {
      await openGallery(page, at(slide.id));
      await expect(
        page.locator(`main:not([aria-hidden]) [data-block="${entry.block}"]`),
        `${entry.name}: ${slide.id}`,
      ).toBeVisible();
      await expectFits(page, `${entry.name}: ${slide.id}`);
    }
  }
});

test("every gallery slide passes axe's colour contrast (SC-002)", async ({
  page,
}) => {
  test.setTimeout(30_000 + N * 10_000);
  for (let s = 1; s <= N; s++) {
    await openGallery(page, s);
    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .include("main:not([aria-hidden])")
      .analyze();
    const found = results.violations.flatMap((v) =>
      v.nodes.map((node) => `${v.id}: ${node.target.join(" ")}`),
    );
    expect(found, `gallery slide ${s}`).toEqual([]);
  }
});

test("the print view draws the gallery with ?deck=gallery", async ({
  page,
}) => {
  await page.goto("/print?deck=gallery");
  await expect(page.locator("[data-print-page]")).toHaveCount(N);
  await page.goto("/print");
  await expect(page.locator("[data-print-page]")).not.toHaveCount(N);
});

test("the gallery's PDF has one page per gallery slide", async ({ page }) => {
  for (const lang of langs) {
    const response = await page.request.get(`/pdf/${galleryPdfName(lang)}`);
    expect(response.status(), lang).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const pdf = (await response.body()).toString("latin1");
    expect(pdf.slice(0, 5)).toBe("%PDF-");
    // Page objects, not the page tree (`/Type /Pages`).
    const pages = pdf.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? [];
    expect(pages.length, lang).toBe(N);
  }
});

test("the gallery's menu downloads the gallery's PDF", async ({ page }) => {
  await openGallery(page, 1);
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByRole("menuitem").first()).toHaveAttribute(
    "href",
    `/pdf/${galleryPdfName(langs[0])}`,
  );
});
