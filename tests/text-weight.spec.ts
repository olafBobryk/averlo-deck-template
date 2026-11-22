import { expect, test, type Page } from "@playwright/test";
import { slides } from "../src/deck/slides";
import { bodyRoles } from "../src/deck/text";
import { gallery } from "../src/presets/gallery";

// Body text weight (spec 001, "After reviewing the merged build": "body text
// always being medium/is to heavy, we have to adjust the design system to
// read easily"; "Regular 400 + test"): every body and supporting text role
// (block text, point descriptions, card bodies, notes, leads, labels and the
// presets' body text) is drawn at the regular weight, 400, through the deck's
// own text roles (src/deck/text.tsx). Titles and headings keep theirs; a
// key phrase marked `**…**` stays bold inside its body text. Every slide of
// the placeholder deck and of the preset gallery, at 1440 (desktop project).

async function open(page: Page, url: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(url);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

/** The live slide's body-role texts heavier than 400, and how many it has. */
const heavier = (page: Page) =>
  page.locator("main:not([aria-hidden]) [data-kind]").evaluate(
    (slide, roles) => {
      const found = [
        ...slide.querySelectorAll<HTMLElement>("[data-variant]"),
      ].filter((el) => roles.includes(el.dataset.variant!));
      const heavy = found
        .filter((el) => Number(getComputedStyle(el).fontWeight) > 400)
        .map(
          (el) =>
            `${el.dataset.variant} .${[...el.classList].join(".")} (${
              getComputedStyle(el).fontWeight
            }): ${el.textContent?.trim().slice(0, 40)}`,
        );
      return { count: found.length, heavy };
    },
    bodyRoles as readonly string[],
  );

const decks = [
  { name: "placeholder deck", path: "/", n: slides.length },
  { name: "preset gallery", path: "/gallery", n: gallery.slides.length },
];

test("the body roles are the regular weight's", () => {
  expect([...bodyRoles].sort()).toEqual(
    ["body-l", "body-m", "body-xl", "label-l", "label-m"].sort(),
  );
});

for (const deck of decks) {
  test(`${deck.name}: every body and supporting text is regular (400) at 1440`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "measured at 1440");
    test.setTimeout(30_000 + deck.n * 5_000);
    let seen = 0;
    const heavy: string[] = [];
    for (let s = 1; s <= deck.n; s++) {
      await open(page, `${deck.path}?s=${s}`);
      const found = await heavier(page);
      seen += found.count;
      heavy.push(...found.heavy.map((text) => `slide ${s}: ${text}`));
    }
    expect(seen, "body-role texts found").toBeGreaterThan(0);
    expect(heavy, "body-role texts heavier than 400").toEqual([]);
  });
}
