import { expect, test, type Page } from "@playwright/test";
import { langs } from "../src/deck/langs";
import { slides } from "../src/deck/slides";

// The keyless intro: the
// questionnaire's keyless sequence over the deck, once per browser session.

test.use({ reducedMotion: "no-preference" });

const gate = (page: Page) => page.locator("[data-gate]");
const heading = (page: Page, name: string) =>
  page.locator("main:not([aria-hidden])").getByRole("heading", { name });
/** Placeholder slides share a title: the slide shown is told by its
 *  position as well. */
const shown = async (page: Page, n: number) => {
  await expect(page.locator("main:not([aria-hidden])")).toHaveAttribute(
    "aria-label",
    `${n} / ${slides.length}`,
    { timeout: 6_000 },
  );
  await expect(heading(page, slides[n - 1].title[langs[0]])).toBeVisible();
};
const S = Math.min(slides.length, 4);

test("a first visit plays the intro, then opens the asked slide", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/?s=${S}`);
  const start = Date.now();
  await expect(gate(page)).toBeVisible();
  await expect(page.locator("[data-gate] [role=status]")).toHaveText("Loading");
  // No key field, ever.
  await expect(page.getByLabel("Access key")).toHaveCount(0);
  // The placeholder mark stands in the gate's stage, where the orb was.
  const mark = page.locator(
    "[data-gate-stage] > :not(canvas):not(svg):not([data-lock-state])",
  );
  await expect(mark).toHaveCount(1);
  expect((await mark.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  // The lock pops in after the orb's 2.2 s approach, shut, then opens.
  const lock = page.locator("[data-lock-state]");
  await expect(lock).toHaveAttribute("data-lock-state", "shut", {
    timeout: 5_000,
  });
  const shut = Date.now() - start;
  await expect(lock).toHaveAttribute("data-lock-state", "open", {
    timeout: 5_000,
  });
  const open = Date.now() - start;
  expect(shut).toBeGreaterThan(1_800);
  expect(open - shut).toBeGreaterThan(900);

  // Then the intro fades and leaves; the slide asked for is there.
  await expect(gate(page)).toHaveCount(0, { timeout: 5_000 });
  await shown(page, S);
  expect(page.url()).toContain(`s=${S}`);
  expect(
    await page.evaluate(() =>
      document.documentElement.hasAttribute("data-intro"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => sessionStorage.getItem("deck:intro-played")),
  ).toBe("1");
  expect(errors).toEqual([]);
});

test("the slide enters under the fading intro", async ({ page }) => {
  await page.goto("/?s=3");
  await expect(page.locator("[data-lock-state='open']")).toBeVisible({
    timeout: 6_000,
  });
  // Sample the heading section through the hand-off: the open lock holds
  // 1.2 s, then the slide enters on the page step's spring.
  const xs = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const seen: number[] = [];
        const t0 = performance.now();
        const tick = () => {
          const section = document.querySelector(
            "main:not([aria-hidden]) [data-kind] > [data-page-section]:first-child",
          );
          const t = section ? getComputedStyle(section).transform : "none";
          seen.push(t === "none" ? 0 : new DOMMatrixReadOnly(t).m41);
          if (performance.now() - t0 < 3_000) requestAnimationFrame(tick);
          else resolve(seen);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(Math.max(...xs)).toBeGreaterThan(20);
  expect(xs.at(-1)).toBeCloseTo(0, 0);
});

test("the slide mounts once, at the hand-off, not under the intro", async ({
  page,
}) => {
  await page.goto("/?s=3");
  await expect(page.locator("[data-lock-state='shut']")).toBeVisible({
    timeout: 5_000,
  });
  // While the intro plays there is no slide waiting at rest under it, so the
  // hand-off's page step never shows a slide jump back and enter again.
  await expect(page.locator("main [data-page-section]")).toHaveCount(0);
  await shown(page, 3);
});

test("once per session: a reload goes straight to the deck", async ({
  page,
}) => {
  await page.goto("/?s=3");
  await expect(gate(page)).toHaveCount(0, { timeout: 8_000 });
  await page.reload();
  await shown(page, 3);
  await expect(gate(page)).toBeHidden();
  expect(
    await page.evaluate(() =>
      document.documentElement.hasAttribute("data-intro"),
    ),
  ).toBe(false);
});

test.describe("skipped", () => {
  test("under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?s=3");
    await shown(page, 3);
    await expect(gate(page)).toBeHidden();
  });

  test("with ?intro=off", async ({ page }) => {
    await page.goto("/?s=3&intro=off");
    await shown(page, 3);
    await expect(gate(page)).toBeHidden();
  });
});
