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

// Phase V1 (T110): the charts and stats. Each chart kind and the stat cards
// have a registry entry; their example and alternate draw the visual itself
// (not the pending stub), with every category and value as given; the first
// series is in the Averlo accent; and the print view draws them too.
const chartKinds = ["bar", "line", "donut"] as const;
const chartEntry = (kind: (typeof chartKinds)[number]) =>
  registry.find(
    (entry) =>
      entry.block === "chart" &&
      entry.example.type === "chart" &&
      entry.example.kind === kind,
  );
const statEntry = () => registry.find((entry) => entry.block === "stat");
/** Words alone: SVG text wraps into tspans, which drop the spaces. */
const squash = (s: string) => s.replace(/\s+/g, "");

test("the charts and stats family has bar, line, donut and stat entries", () => {
  for (const kind of chartKinds) expect(chartEntry(kind), kind).toBeTruthy();
  expect(statEntry(), "stat").toBeTruthy();
});

for (const kind of chartKinds) {
  test(`the ${kind} chart draws every category and series as given`, async ({
    page,
  }) => {
    const entry = chartEntry(kind);
    expect(entry, kind).toBeTruthy();
    const slides = gallery.presetSlides(entry!.name);
    for (const slide of [slides.example!, slides.alternate!]) {
      const block = gallery.content[slide.id].blocks[0];
      if (block.type !== "chart") throw new Error(`${slide.id}: not a chart`);
      await openGallery(page, at(slide.id));
      const main = page.locator("main:not([aria-hidden])");
      await expect(main.locator("[data-preset-pending]")).toHaveCount(0);
      const chart = main.locator(`[data-chart="${kind}"]`);
      await expect(chart, slide.id).toBeVisible();
      const marks = chart.locator("[data-mark]");
      const expected =
        kind === "bar"
          ? block.categories.length * block.series.length
          : kind === "line"
            ? block.series.length
            : block.categories.length;
      await expect(marks, slide.id).toHaveCount(expected);
      // Every category, in order, word for word.
      const labels = await chart
        .locator("[data-category]")
        .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ""));
      expect(labels.map(squash), slide.id).toEqual(
        block.categories.map((c) => squash(c[langs[0]])),
      );
      if (block.unit)
        await expect(chart.locator("[data-unit]")).toHaveText(
          block.unit[langs[0]],
        );
      if (block.source)
        await expect(chart.locator("[data-source]")).toHaveText(
          block.source[langs[0]],
        );
      // A static legend only with two or more series.
      await expect(chart.locator("[data-legend]")).toHaveCount(
        kind !== "donut" && block.series.length > 1 ? 1 : 0,
      );
      // The first series is drawn in the Averlo accent.
      const [fill, accent] = await chart.evaluate((root) => {
        const mark = root.querySelector("[data-mark]")!;
        const style = getComputedStyle(mark);
        const probe = document.createElement("span");
        probe.style.color = "var(--color-accent)";
        root.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();
        return [style.fill === "none" ? style.stroke : style.fill, accent];
      });
      expect(fill, slide.id).toBe(accent);
    }
  });
}

test("the stat cards show each value as written", async ({ page }) => {
  const entry = statEntry();
  expect(entry, "stat").toBeTruthy();
  const slides = gallery.presetSlides(entry!.name);
  for (const slide of [slides.example!, slides.alternate!]) {
    const block = gallery.content[slide.id].blocks[0];
    if (block.type !== "stat") throw new Error(`${slide.id}: not a stat`);
    await openGallery(page, at(slide.id));
    const main = page.locator("main:not([aria-hidden])");
    await expect(main.locator("[data-preset-pending]")).toHaveCount(0);
    const values = main.locator("[data-stat-value]");
    await expect(values, slide.id).toHaveText(block.items.map((i) => i.value));
  }
});

test("the print view draws every chart with its marks", async ({ page }) => {
  await page.goto("/print?deck=gallery");
  const charts = page.locator("[data-chart]");
  const count = 2 * chartKinds.length;
  await expect(charts).toHaveCount(count);
  for (let i = 0; i < count; i++) {
    const chart = charts.nth(i);
    const box = await chart.locator("svg").first().boundingBox();
    expect(box?.width ?? 0, `print chart ${i}`).toBeGreaterThan(100);
    expect(box?.height ?? 0, `print chart ${i}`).toBeGreaterThan(100);
    expect(await chart.locator("[data-mark]").count()).toBeGreaterThan(0);
  }
});

// Phase V3 (T130): the text layouts and the image slides. The quote, agenda
// and compare presets draw their own components; the statement is the
// `statement` layout with a `lead` block, and image + text an `image` block
// in a `split` layout, each through its registry entry's `layout`. The
// image presets (full-bleed, captioned, grid) carry no `src` in the gallery,
// so each image shows the template's placeholder, labelled "Image", with the
// image's alt text as its name. Every image frame prints.
type Entry = (typeof registry)[number];
const v3 = {
  quote: (e: Entry) => e.block === "quote",
  agenda: (e: Entry) => e.block === "agenda",
  compare: (e: Entry) => e.block === "compare",
  statement: (e: Entry) => e.block === "lead" && e.layout === "statement",
  "image + text": (e: Entry) => e.block === "image" && e.layout === "split",
  "full-bleed image": (e: Entry) =>
    e.block === "image" && e.example.type === "image" && !!e.example.bleed,
  "captioned image": (e: Entry) =>
    e.block === "image" &&
    e.example.type === "image" &&
    !e.example.bleed &&
    !!e.example.caption &&
    (e.layout ?? "stack") === "stack",
  "image grid": (e: Entry) => e.block === "imageGrid",
} as const;
const v3Entry = (key: keyof typeof v3) => registry.find(v3[key]);
/** A gallery slide's two blocks' slides, for a V3 entry. */
const v3Slides = (key: keyof typeof v3) => {
  const entry = v3Entry(key);
  expect(entry, key).toBeTruthy();
  const { example, alternate } = gallery.presetSlides(entry!.name);
  return { entry: entry!, slides: [example!, alternate!] };
};

test("the text and image families have every V3 entry, in their family", () => {
  for (const key of Object.keys(v3) as (keyof typeof v3)[]) {
    const entry = v3Entry(key);
    expect(entry, key).toBeTruthy();
    const family =
      key.includes("image") && key !== "image + text" ? "images" : "text";
    expect(entry!.family, key).toBe(family);
  }
});

test("a registry entry's layout is its gallery slides' layout", () => {
  for (const entry of registry) {
    const { example, alternate } = gallery.presetSlides(entry.name);
    for (const slide of [example!, alternate!])
      expect(gallery.content[slide.id].layout, slide.id).toBe(
        entry.layout ?? "stack",
      );
  }
});

for (const [key, layout] of [
  ["statement", "statement"],
  ["image + text", "split"],
] as const) {
  test(`the ${key} slides draw in the ${layout} layout`, async ({ page }) => {
    const { entry, slides } = v3Slides(key);
    for (const slide of slides) {
      await openGallery(page, at(slide.id));
      const main = page.locator("main:not([aria-hidden])");
      await expect(main.locator("[data-layout]")).toHaveAttribute(
        "data-layout",
        layout,
      );
      await expect(
        main.locator(`[data-block="${entry.block}"]`),
        slide.id,
      ).toBeVisible();
      await expect(main.locator("[data-preset-pending]")).toHaveCount(0);
    }
  });
}

test("the quote shows its text, and who said it when given", async ({
  page,
}) => {
  const { slides } = v3Slides("quote");
  for (const slide of slides) {
    const block = gallery.content[slide.id].blocks[0];
    if (block.type !== "quote") throw new Error(`${slide.id}: not a quote`);
    await openGallery(page, at(slide.id));
    const quote = page.locator("main:not([aria-hidden]) [data-quote]");
    await expect(quote, slide.id).toBeVisible();
    await expect(quote.locator("blockquote")).toHaveText(block.text[langs[0]]);
    await expect(quote.locator("[data-quote-by]")).toHaveText(
      block.by ? [block.by[langs[0]]] : [],
    );
    await expect(quote.locator("[data-quote-role]")).toHaveText(
      block.role ? [block.role[langs[0]]] : [],
    );
  }
});

test("the agenda numbers its items in order", async ({ page }) => {
  const { slides } = v3Slides("agenda");
  for (const slide of slides) {
    const block = gallery.content[slide.id].blocks[0];
    if (block.type !== "agenda") throw new Error(`${slide.id}: not an agenda`);
    await openGallery(page, at(slide.id));
    const agenda = page.locator("main:not([aria-hidden]) [data-agenda]");
    await expect(agenda, slide.id).toBeVisible();
    const items = agenda.locator("[data-agenda-item]");
    await expect(items).toHaveCount(block.items.length);
    await expect(agenda.locator("[data-agenda-number]")).toHaveText(
      block.items.map((_, i) => String(i + 1).padStart(2, "0")),
    );
    await expect(agenda.locator("[data-agenda-label]")).toHaveText(
      block.items.map((item) => item.label[langs[0]]),
    );
  }
});

test("the compare shows both sides, each with its title and every point", async ({
  page,
}) => {
  const { slides } = v3Slides("compare");
  for (const slide of slides) {
    const block = gallery.content[slide.id].blocks[0];
    if (block.type !== "compare") throw new Error(`${slide.id}: not a compare`);
    await openGallery(page, at(slide.id));
    const compare = page.locator("main:not([aria-hidden]) [data-compare]");
    await expect(compare, slide.id).toBeVisible();
    for (const side of ["left", "right"] as const) {
      const panel = compare.locator(`[data-compare-side="${side}"]`);
      await expect(panel, `${slide.id} ${side}`).toBeVisible();
      await expect(panel.locator("[data-compare-title]")).toHaveText(
        block[side].title[langs[0]],
      );
      await expect(panel.locator("[data-compare-point]")).toHaveText(
        block[side].points.map((p) => p[langs[0]]),
      );
    }
  }
});

/** The images a gallery image block holds. */
const imagesOf = (id: string) => {
  const block = gallery.content[id].blocks[0];
  if (block.type === "image") return [block];
  if (block.type === "imageGrid") return block.images;
  throw new Error(`${id}: not an image block`);
};
const imageKeys = [
  "image + text",
  "full-bleed image",
  "captioned image",
  "image grid",
] as const;

test("an image without src shows the placeholder, named by its alt text", async ({
  page,
}) => {
  for (const key of imageKeys) {
    const { slides } = v3Slides(key);
    for (const slide of slides) {
      const images = imagesOf(slide.id);
      expect(
        images.every((image) => !image.src),
        `${slide.id}: the gallery's images are placeholders`,
      ).toBe(true);
      await openGallery(page, at(slide.id));
      const main = page.locator("main:not([aria-hidden])");
      await expect(main.locator("[data-preset-pending]")).toHaveCount(0);
      await expect(main.locator("img")).toHaveCount(0);
      const placeholders = main.locator("[data-image-placeholder]");
      await expect(placeholders, slide.id).toHaveCount(images.length);
      for (let i = 0; i < images.length; i++) {
        const placeholder = placeholders.nth(i);
        await expect(placeholder).toBeVisible();
        await expect(placeholder).toHaveText("Image");
        await expect(placeholder).toHaveAttribute("role", "img");
        await expect(placeholder).toHaveAccessibleName(images[i].alt[langs[0]]);
      }
      // Each caption, when given, under its image.
      await expect(main.locator("[data-image-caption]")).toHaveText(
        images.flatMap((image) =>
          image.caption ? [image.caption[langs[0]]] : [],
        ),
      );
    }
  }
});

test("the full-bleed image reaches the slide's sides and bottom", async ({
  page,
}) => {
  const { slides } = v3Slides("full-bleed image");
  for (const slide of slides) {
    await openGallery(page, at(slide.id));
    const main = page.locator("main:not([aria-hidden])");
    const [frame, box] = await main.locator("[data-kind]").evaluate((root) => {
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, bottom: r.bottom, top: r.top };
      };
      return [
        rect(root.querySelector("[data-bleed] [data-image-frame]")!),
        rect(root),
      ];
    });
    expect(frame.left, slide.id).toBeCloseTo(box.left, 0);
    expect(frame.right, slide.id).toBeCloseTo(box.right, 0);
    expect(frame.bottom, slide.id).toBeCloseTo(box.bottom, 0);
    // It holds most of the slide under the heading.
    expect(frame.bottom - frame.top, slide.id).toBeGreaterThan(
      (box.bottom - box.top) * 0.4,
    );
  }
});

test("the print view draws every image frame", async ({ page }) => {
  const frames = imageKeys.flatMap((key) =>
    v3Slides(key).slides.flatMap((slide) => imagesOf(slide.id)),
  );
  await page.goto("/print?deck=gallery");
  const drawn = page.locator("[data-image-frame]");
  await expect(drawn).toHaveCount(frames.length);
  for (let i = 0; i < frames.length; i++) {
    const box = await drawn.nth(i).boundingBox();
    expect(box?.width ?? 0, `print image ${i}`).toBeGreaterThan(100);
    expect(box?.height ?? 0, `print image ${i}`).toBeGreaterThan(60);
  }
});
