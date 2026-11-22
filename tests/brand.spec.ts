import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { config } from "../src/brand/config";

// User Story 3, scenarios 2 and 3 (FR-004a, FR-005; research R9): the brand
// mark in the intro and on the hard-load screen, and the hard-load screen's
// timing. Runs at 390 and 1440 against the local production build.
//
// A mark is told by its source and by its `data-brand-mark` attribute
// ("averlo", "owner" or "placeholder"). The Averlo mark is served as
// /brand/averlo-mark.svg: the ported Logo's mark path, as an image, because
// the hard-load script waits on an image's decode and the intro's fog draws
// the mark from an image.

test.use({ reducedMotion: "no-preference" });

const AVERLO_MARK = "/brand/averlo-mark.svg";
/** The element the intro strip measures (tests/motion/strips.ts). */
const INTRO_MARK =
  "[data-gate-stage] > :not(canvas):not(svg):not([data-lock-state])";
const BOOT_MARK = "#deck-boot [data-boot-orb] img";
/** The placeholder's box in the intro: 96 px × 0.9 at a scale of 0.72. */
const INTRO_BOX = 96 * 0.9 * 0.72;

const averlo = config.brand.kind === "averlo";
const ownerWithoutMark = config.brand.kind === "owner" && !config.brand.mark;

async function unlock(page: Page) {
  // The intro has played this session: the hard-load screen shows alone.
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
}

const pathOf = (url: string) => new URL(url).pathname;

/** The intro's mark, checked mid-play (before the lock), and the URL its
 *  image came from. */
async function introMark(page: Page) {
  await page.goto("/?s=2");
  const mark = page.locator(INTRO_MARK);
  await expect(mark).toHaveCount(1);
  await expect(page.locator("[data-gate]")).toHaveAttribute(
    "data-gate",
    "intro",
  );
  const stage = page.locator("[data-gate-stage]");
  await expect(stage).toHaveAttribute("data-motion", /^(volume|fallback)$/);
  // Shown: the fog draws it, or its poster does without WebGL.
  const shown =
    (await stage.getAttribute("data-motion")) === "volume"
      ? stage.locator("canvas")
      : mark;
  await expect(shown).toBeVisible();
  const box = await mark.boundingBox();
  expect(box?.width).toBeCloseTo(INTRO_BOX, 0);
  expect(box?.height).toBeCloseTo(INTRO_BOX, 0);
  const image = await mark.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  const url = /url\("?([^")]+)"?\)/.exec(image)?.[1] ?? "";
  return { mark, url };
}

/** The hard-load screen's mark: an image the boot script waits on. */
async function bootMark(page: Page) {
  await unlock(page);
  await page.goto("/?s=2");
  const img = page.locator(BOOT_MARK);
  await expect(img).toHaveCount(1);
  await expect(page.locator("#deck-boot video")).toHaveCount(0);
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);
  const src = await img.evaluate((i: HTMLImageElement) => i.currentSrc);
  return { img, src };
}

test.describe("the Averlo brand (the default)", () => {
  test.skip(!averlo, "the deck's brand is not Averlo");

  test("the intro shows the Averlo mark in the placeholder's box", async ({
    page,
  }) => {
    const served = page.waitForResponse((r) => pathOf(r.url()) === AVERLO_MARK);
    const { mark, url } = await introMark(page);
    await expect(mark).toHaveAttribute("data-brand-mark", "averlo");
    expect(pathOf(new URL(url, page.url()).href)).toBe(AVERLO_MARK);
    expect((await served).status()).toBe(200);
  });

  test("the hard-load screen shows the Averlo mark as an image", async ({
    page,
  }) => {
    const { img, src } = await bootMark(page);
    await expect(img).toHaveAttribute("data-brand-mark", "averlo");
    expect(pathOf(src)).toBe(AVERLO_MARK);
  });

  test("the served Averlo mark is the ported Logo's mark", async ({
    request,
  }) => {
    const logo = readFileSync(
      new URL("../src/components/branding/Logo.tsx", import.meta.url),
      "utf8",
    );
    const port = /viewBox="(0 0 40 42)"[\s\S]*?\bd="([^"]+)"/.exec(logo);
    expect(port).not.toBeNull();
    const response = await request.get(AVERLO_MARK);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    const svg = await response.text();
    expect(svg).toContain(`viewBox="${port![1]}"`);
    expect(svg).toContain(`d="${port![2]}"`);
  });
});

test.describe("an owner's brand", () => {
  test("the mark follows the brand config", async () => {
    // The choice both places make (src/brand/mark.ts applies it to the
    // deck's config). A second build per brand would double the gate, so
    // the owner's brand is rendered only in a deck that configures it
    // (below).
    const { markFor, averloMark } = await import("../src/brand/marks");
    const placeholder = "/placeholder.svg";
    expect(averloMark).toBe(AVERLO_MARK);
    expect(markFor({ kind: "averlo" }, placeholder)).toEqual({
      src: AVERLO_MARK,
      kind: "averlo",
    });
    expect(markFor({ kind: "owner", name: "Example" }, placeholder)).toEqual({
      src: placeholder,
      kind: "placeholder",
    });
    expect(
      markFor(
        { kind: "owner", name: "Example", logo: "example-logo.svg" },
        placeholder,
      ),
    ).toEqual({ src: placeholder, kind: "placeholder" });
    expect(
      markFor(
        { kind: "owner", name: "Example", mark: "example-mark.svg" },
        placeholder,
      ),
    ).toEqual({ src: "/brand/example-mark.svg", kind: "owner" });
  });

  test('without a mark, both places show the "your logo" placeholder', async ({
    page,
  }) => {
    // The template ships the Averlo brand, so this runs in a deck whose
    // config names an owner's brand without a mark (the P7 dry run with
    // another brand, T041).
    test.skip(
      !ownerWithoutMark,
      "the deck's brand is not an owner's without a mark",
    );
    const { mark } = await introMark(page);
    await expect(mark).toHaveAttribute("data-brand-mark", "placeholder");
    const fresh = await page.context().browser()!.newContext();
    const boot = await fresh.newPage();
    try {
      const { img } = await bootMark(boot);
      await expect(img).toHaveAttribute("data-brand-mark", "placeholder");
    } finally {
      await fresh.close();
    }
  });
});

type BootStep = { state: string; t: number; decoded: boolean };

/** Every change of the hard-load screen's data-state, timed from when the
 *  screen first shows, with whether its mark had loaded by then. */
async function bootTimeline(page: Page) {
  await page.addInitScript(() => {
    const steps: { state: string; t: number; decoded: boolean }[] = [];
    (window as unknown as { __bootSteps: typeof steps }).__bootSteps = steps;
    const look = () => {
      const root = document.getElementById("deck-boot");
      const state = root?.dataset.state;
      if (!state || steps.at(-1)?.state === state) return;
      const img = root.querySelector("img");
      steps.push({
        state,
        t: performance.now(),
        decoded: Boolean(img?.complete && img.naturalWidth > 0),
      });
    };
    new MutationObserver(look).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  });
  await page.goto("/?s=2");
  await page.waitForFunction(
    () => document.getElementById("deck-boot")?.dataset.state === "done",
    undefined,
    { timeout: 10_000 },
  );
  const steps = await page.evaluate(
    () => (window as unknown as { __bootSteps: BootStep[] }).__bootSteps,
  );
  const at = (state: string) => steps.find((s) => s.state === state);
  expect(steps[0].state).toBe("loading");
  const t0 = steps[0].t;
  const lifted = steps.find((s) => s.state !== "loading");
  expect(lifted).toBeDefined();
  return {
    lifted: lifted!.t - t0,
    liftedDecoded: lifted!.decoded,
    done: at("done")!.t - t0,
  };
}

test.describe("the hard-load screen's timing", () => {
  test("a fast load still shows it for 400 ms, and it lifts well before the cap", async ({
    page,
  }) => {
    await unlock(page);
    const { lifted, done } = await bootTimeline(page);
    // The screen is drawn just before its script starts the clock.
    expect(lifted).toBeGreaterThanOrEqual(400 - 20);
    expect(done).toBeGreaterThanOrEqual(lifted);
    expect(done).toBeLessThan(3000);
  });

  test("a slow mark image is waited for no longer than the 3 s cap", async ({
    page,
  }) => {
    await unlock(page);
    // Every image the screen could show is held back for 6 s.
    await page.route(/\.svg(\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6_000));
      await route.continue().catch(() => {});
    });
    const { lifted, liftedDecoded, done } = await bootTimeline(page);
    expect(liftedDecoded).toBe(false);
    expect(lifted).toBeGreaterThanOrEqual(3000 - 20);
    expect(lifted).toBeLessThan(3000 + 400);
    // Then its 200 ms fade (the script's 240 ms timer) to done.
    expect(done).toBeLessThan(3000 + 800);
  });
});

// The browser tab's title, the home-screen app's name and the app icons
// follow the deck's config: the title is `deckTitle`, and the icons draw the
// brand's mark (the Averlo mark, the owner's `mark`, or the "your logo"
// placeholder) on the deck's dark background.
test.describe("the app's title and icons", () => {
  /** A PNG's width and height, from its IHDR chunk. */
  const pngSize = (bytes: Buffer) => {
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  };

  test("the icon's mark follows the brand config", async () => {
    // The choice src/brand/app-icon.tsx applies to the deck's config: the
    // file each app icon draws, relative to the repository.
    const { iconMarkFor } = await import("../src/brand/marks");
    const placeholder = "src/brand/placeholder/your-logo.svg";
    expect(iconMarkFor({ kind: "averlo" })).toEqual({
      file: "public/brand/averlo-mark.svg",
      kind: "averlo",
    });
    expect(iconMarkFor({ kind: "owner", name: "Example" })).toEqual({
      file: placeholder,
      kind: "placeholder",
    });
    expect(
      iconMarkFor({ kind: "owner", name: "Example", logo: "example-logo.svg" }),
    ).toEqual({ file: placeholder, kind: "placeholder" });
    for (const mark of [
      "example-mark.png",
      "/brand/example-mark.png",
      "public/brand/example-mark.png",
    ]) {
      expect(iconMarkFor({ kind: "owner", name: "Example", mark })).toEqual({
        file: "public/brand/example-mark.png",
        kind: "owner",
      });
    }
  });

  test("the root layout and the manifest take the title from the config", async () => {
    // A second build per title would double the gate: the manifest is
    // called with another title, and the layout's metadata is read as
    // source (it imports the stylesheet and the font, which only Next loads).
    const { default: manifest } = await import("../src/app/manifest");
    const title = config.deckTitle;
    try {
      config.deckTitle = "Another title";
      expect(manifest().name).toBe("Another title");
      expect(manifest().short_name).toBe("Another title");
    } finally {
      config.deckTitle = title;
    }
    const layout = readFileSync(
      new URL("../src/app/layout.tsx", import.meta.url),
      "utf8",
    );
    const metadata = /export const metadata[\s\S]*?\n};/.exec(layout)?.[0];
    expect(metadata).toBeDefined();
    expect(metadata).not.toMatch(/title:\s*["'`]/);
    expect(metadata!.match(/title: config\.deckTitle/g)).toHaveLength(2);
  });

  test("the tab title is the deck title", async ({ page }) => {
    await page.goto("/?intro=off");
    await expect(page).toHaveTitle(config.deckTitle);
    await expect(
      page.locator('head meta[name="apple-mobile-web-app-title"]'),
    ).toHaveAttribute("content", config.deckTitle);
  });

  test("the manifest names the app by the deck title", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toBe(config.deckTitle);
    expect(manifest.short_name).toBe(config.deckTitle);
  });

  test("the icon routes return PNG images at their sizes", async ({
    page,
    request,
  }) => {
    const expected = [
      { path: "/icon", rel: "icon", size: 256 },
      { path: "/apple-icon", rel: "apple-touch-icon", size: 180 },
    ];
    await page.goto("/?intro=off");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    for (const { path, rel, size } of expected) {
      const link = page.locator(`head link[rel="${rel}"]`);
      await expect(link).toHaveCount(1);
      const href = (await link.getAttribute("href")) ?? "";
      expect(pathOf(new URL(href, page.url()).href)).toBe(path);
      expect(manifest.icons).toContainEqual({
        src: path,
        sizes: `${size}x${size}`,
        type: "image/png",
      });
      const response = await request.get(href);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
      expect(pngSize(await response.body())).toEqual({
        width: size,
        height: size,
      });
    }
  });
});
