import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { langs } from "../../src/deck/langs";
import { galleryPdfName } from "../../src/deck/pdf-name";
import { slideContent } from "../../src/deck/content";
import { composedExamples, gallery } from "../../src/presets/gallery";
import { registry } from "../../src/presets/registry";
import { expectSplitAcross, expectSplitDown, measureSplit } from "../branching";
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
  // Then a divider and a slide for each composed visual example (T143).
  const composed = composedExamples.length ? 1 + composedExamples.length : 0;
  expect(gallery.slides[0].kind).toBe("title");
  expect(N).toBe(1 + families.size + 2 * registry.length + composed);
  expect(gallery.slides.filter((s) => s.kind === "divider")).toHaveLength(
    families.size + (composed ? 1 : 0),
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

// Compose-per-deck (feature 002, T143; research D3): the template's one
// composed visual is shown in the gallery as "Composed visual (example)",
// drawn from its `custom` block through the gallery's own visuals; it is
// not a preset, so not in the registry.
test("the composed visual example has its gallery slide, drawn and fitting", async ({
  page,
}) => {
  const names = composedExamples.map((example) => example.name);
  expect(names).toEqual(["Composed visual (example)"]);
  expect(registry.map((entry) => entry.name)).not.toContain(names[0]);
  for (const example of composedExamples) {
    const s = gallery.slides.findIndex(
      (slide) => slide.title[langs[0]] === example.name,
    );
    expect(s, example.name).toBeGreaterThan(0);
    expect(gallery.content[gallery.slides[s].id].blocks).toEqual([
      example.block,
    ]);
    await openGallery(page, s + 1);
    const main = page.locator("main:not([aria-hidden])");
    await expect(main.locator('[data-block="custom"]')).toBeVisible();
    await expect(main.locator("[data-composed-example]")).toBeVisible();
    await expect(main.locator("[data-visual-missing]")).toHaveCount(0);
    await expectFits(page, example.name);
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
      // T051 (owner on T050: "for the bar chart isnt that trippling titling
      // bad?"): no caption line over the plot. The unit is on the value
      // axis of a bar or line chart, and with each value in a donut's key.
      await expect(chart.locator("[data-unit]")).toHaveCount(0);
      if (block.unit) {
        const unit = block.unit[langs[0]];
        if (kind === "donut") {
          await expect(chart.locator("[data-key-value]")).toHaveText(
            block.series[0].values.map((v) => `${v} ${unit}`),
          );
        } else {
          await expect(chart.locator("svg [data-axis-unit]")).toHaveText(unit);
        }
      } else {
        await expect(chart.locator("[data-axis-unit]")).toHaveCount(0);
      }
      // Nothing but a legend stands between the slide's headline and the
      // plot: the plot is the figure's first row, or follows the legend.
      const above = await chart.evaluate((figure) => {
        const first = figure.firstElementChild!;
        return first.querySelector("svg") || first.hasAttribute("data-legend")
          ? "plot or legend"
          : (first.textContent ?? "");
      });
      expect(above, slide.id).toBe("plot or legend");
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
    const block = shown(slide.id);
    if (block.type !== "stat") throw new Error(`${slide.id}: not a stat`);
    await openGallery(page, at(slide.id));
    const main = page.locator("main:not([aria-hidden])");
    await expect(main.locator("[data-preset-pending]")).toHaveCount(0);
    const values = main.locator("[data-stat-value]");
    await expect(values, slide.id).toHaveText(block.items.map((i) => i.value));
    // T051 (owner on T050: "the stat is too crammed"): each card breathes.
    // Measured in slide units (--u) on a landscape stage, in px on a phone.
    const cards = await main.locator("[data-stat]").evaluateAll((cards) =>
      cards.map((card) => {
        const u =
          parseFloat(getComputedStyle(card).getPropertyValue("--u")) ||
          Math.min(
            document.documentElement.clientWidth / 100,
            (document.documentElement.clientHeight * 1.7778) / 100,
          );
        const s = getComputedStyle(card);
        const value = card.querySelector("[data-stat-value]")!;
        const label = card.querySelector("[data-stat-label]")!;
        return {
          u,
          pad: Math.min(parseFloat(s.paddingTop), parseFloat(s.paddingLeft)),
          gap:
            label.getBoundingClientRect().top -
            value.getBoundingClientRect().bottom,
          size: parseFloat(getComputedStyle(value).fontSize),
        };
      }),
    );
    expect(cards, slide.id).toHaveLength(block.items.length);
    const phone = (page.viewportSize()?.width ?? 0) < 700;
    for (const card of cards) {
      if (phone) {
        expect(card.pad, `${slide.id}: padding`).toBeGreaterThanOrEqual(20);
        expect(card.gap, `${slide.id}: value to label`).toBeGreaterThanOrEqual(
          8,
        );
      } else {
        expect(
          card.pad / card.u,
          `${slide.id}: padding`,
        ).toBeGreaterThanOrEqual(3);
        expect(
          card.gap / card.u,
          `${slide.id}: value to label`,
        ).toBeGreaterThanOrEqual(1.2);
        expect(
          card.size / card.u,
          `${slide.id}: value size`,
        ).toBeLessThanOrEqual(5);
      }
    }
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
    // Each number is the muted step label, above its label (spec 001, after
    // the final build: "No circles, muted step labels").
    const muted = await tokenColour(agenda, "--color-muted");
    const numbers = await items.evaluateAll((items) =>
      items.map((item) => {
        const number = item.querySelector("[data-agenda-number]")!;
        const label = item.querySelector("[data-agenda-label]")!;
        const s = getComputedStyle(number);
        return {
          step: number.hasAttribute("data-step-label"),
          look: [s.color, s.fontWeight, s.fontVariantNumeric],
          above:
            number.getBoundingClientRect().bottom <=
            label.getBoundingClientRect().top + 1,
        };
      }),
    );
    for (const number of numbers)
      expect(number, slide.id).toEqual({
        step: true,
        look: [muted, "400", "tabular-nums"],
        above: true,
      });
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

// Phase V2 (T120): the diagrams. Each of flow, timeline, cycle, org chart,
// table and matrix has a registry entry in the diagrams family; its example
// and alternate draw the diagram itself (not the pending stub), with every
// step, event and stage in the given order, and every table cell in its row
// and column. Step, event and stage labels are the navigator's muted step
// label (feature 001, P8); connectors and arrows are the border token;
// flows and timelines turn vertical on phones. The print view draws each.
// Fit, contrast and the PDF are the gallery-wide tests above.
const diagramBlocks = [
  "flow",
  "timeline",
  "cycle",
  "orgchart",
  "table",
  "matrix",
] as const;
type DiagramBlock = (typeof diagramBlocks)[number];
const diagramEntry = (block: DiagramBlock) =>
  registry.find((entry) => entry.block === block);
/** A diagram entry's example and alternate slides, with their blocks. */
function diagramSlides<T extends DiagramBlock>(block: T) {
  const entry = diagramEntry(block);
  expect(entry, block).toBeTruthy();
  const { example, alternate } = gallery.presetSlides(entry!.name);
  return [example!, alternate!].map((slide) => {
    const b = gallery.content[slide.id].blocks[0];
    if (b.type !== block) throw new Error(`${slide.id}: not a ${block}`);
    return { slide, block: b as Extract<typeof b, { type: T }> };
  });
}
const en = (t: { [lang: string]: string }) => t[langs[0]];

/** Opens a diagram slide and returns its diagram, checked drawn. */
async function openDiagram(page: Page, id: string, block: DiagramBlock) {
  await openGallery(page, at(id));
  const main = page.locator("main:not([aria-hidden])");
  await expect(main.locator("[data-preset-pending]")).toHaveCount(0);
  const diagram = main.locator(`[data-diagram="${block}"]`);
  await expect(diagram, id).toBeVisible();
  return diagram;
}

/** The colour a token resolves to, in the diagram's context. */
const tokenColour = (root: Locator, token: string) =>
  root.evaluate((el, token) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${token})`;
    el.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, token);

/** Every step label is the navigator's muted step label: the muted token,
 *  the regular weight, tabular figures. */
async function expectStepLabels(diagram: Locator, texts: string[]) {
  const labels = diagram.locator("[data-step-label]");
  await expect(labels).toHaveText(texts);
  const muted = await tokenColour(diagram, "--color-muted");
  const styles = await labels.evaluateAll((nodes) =>
    nodes.map((n) => {
      const s = getComputedStyle(n);
      return [s.color, s.fontWeight, s.fontVariantNumeric];
    }),
  );
  for (const style of styles)
    expect(style).toEqual([muted, "400", "tabular-nums"]);
}

/** Every connector line and arrow is the border token. */
async function expectConnectors(diagram: Locator, arrows: number) {
  const border = await tokenColour(diagram, "--color-border");
  await expect(diagram.locator("[data-arrow]")).toHaveCount(arrows);
  const colours = await diagram.evaluate((root) => {
    const found: string[] = [];
    for (const el of root.querySelectorAll("[data-line]")) {
      const s = getComputedStyle(el);
      if (s.backgroundColor !== "rgba(0, 0, 0, 0)")
        found.push(s.backgroundColor);
      for (const side of ["Top", "Right", "Bottom", "Left"] as const)
        if (parseFloat(s[`border${side}Width`]) > 0)
          found.push(s[`border${side}Color`]);
    }
    for (const el of root.querySelectorAll("[data-arrow]"))
      found.push(getComputedStyle(el).color);
    // A branching line is drawn in its split's and items' ::before and
    // ::after (T123).
    for (const el of root.querySelectorAll("[data-split], [data-split-item]"))
      for (const which of ["::before", "::after"]) {
        const s = getComputedStyle(el, which);
        if (s.content === "none" || s.display === "none") continue;
        if (s.backgroundColor !== "rgba(0, 0, 0, 0)")
          found.push(s.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const)
          if (parseFloat(s[`border${side}Width`]) > 0)
            found.push(s[`border${side}Color`]);
      }
    return found;
  });
  expect(colours.length).toBeGreaterThan(0);
  for (const colour of colours) expect(colour).toBe(border);
}

/** The boxes of `items`, in order. */
const boxes = (items: Locator) =>
  items.evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }),
  );

/** Items run in order: across at 1440, down on a phone. */
async function expectRuns(items: Locator, vertical: boolean, at: string) {
  const b = await boxes(items);
  for (let i = 1; i < b.length; i++) {
    if (vertical) {
      expect(b[i].top, `${at}: item ${i + 1} under ${i}`).toBeGreaterThan(
        b[i - 1].bottom - 1,
      );
      expect(b[i].left, `${at}: item ${i + 1} in line`).toBeCloseTo(
        b[0].left,
        0,
      );
    } else {
      expect(b[i].left, `${at}: item ${i + 1} after ${i}`).toBeGreaterThan(
        b[i - 1].right - 1,
      );
      expect(b[i].top, `${at}: item ${i + 1} in line`).toBeCloseTo(b[0].top, 0);
    }
  }
}

const numbers = (n: number) =>
  Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0"));
const phone = () => test.info().project.name === "mobile";

test("the diagrams family has the flow, timeline, cycle, org chart, table and matrix", () => {
  for (const block of diagramBlocks) {
    const entry = diagramEntry(block);
    expect(entry, block).toBeTruthy();
    expect(entry!.family, block).toBe("diagrams");
  }
});

test("the flow draws its steps in order, numbered, with an arrow to each next step", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("flow")) {
    const flow = await openDiagram(page, slide.id, "flow");
    const steps = flow.locator("[data-flow-step]");
    await expect(steps).toHaveCount(block.steps.length);
    await expect(flow.locator("[data-flow-label]")).toHaveText(
      block.steps.map((s) => en(s.label)),
    );
    await expect(flow.locator("[data-flow-text]")).toHaveText(
      block.steps.flatMap((s) => (s.text ? [en(s.text)] : [])),
    );
    await expectStepLabels(flow, numbers(block.steps.length));
    await expectConnectors(flow, block.steps.length - 1);
    await expectRuns(steps, phone(), slide.id);
  }
});

test("the timeline draws its events in order, each led by its date", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("timeline")) {
    const timeline = await openDiagram(page, slide.id, "timeline");
    const events = timeline.locator("[data-timeline-event]");
    await expect(events).toHaveCount(block.events.length);
    await expect(timeline.locator("[data-timeline-label]")).toHaveText(
      block.events.map((e) => en(e.label)),
    );
    await expect(timeline.locator("[data-timeline-text]")).toHaveText(
      block.events.flatMap((e) => (e.text ? [en(e.text)] : [])),
    );
    await expectStepLabels(
      timeline,
      block.events.map((e) => en(e.when)),
    );
    // One axis, its arrow pointing on in time.
    await expectConnectors(timeline, 1);
    await expectRuns(events, phone(), slide.id);
  }
});

test("the cycle draws its stages in order, each arrow to the next, and the last back to the first", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("cycle")) {
    const cycle = await openDiagram(page, slide.id, "cycle");
    const stages = cycle.locator("[data-cycle-stage]");
    await expect(stages).toHaveCount(block.stages.length);
    await expect(cycle.locator("[data-cycle-label]")).toHaveText(
      block.stages.map((s) => en(s.label)),
    );
    await expect(cycle.locator("[data-cycle-text]")).toHaveText(
      block.stages.flatMap((s) => (s.text ? [en(s.text)] : [])),
    );
    await expectStepLabels(cycle, numbers(block.stages.length));
    await expectConnectors(cycle, block.stages.length);
    await expectRuns(stages, phone(), slide.id);
  }
});

test("the org chart draws its root over its nodes, each over its own nodes, in order", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("orgchart")) {
    const org = await openDiagram(page, slide.id, "orgchart");
    await expect(org.locator("[data-org-root] [data-org-label]")).toHaveText(
      en(block.root.label),
    );
    const branches = org.locator("[data-org-branch]");
    await expect(branches).toHaveCount(block.children.length);
    for (let i = 0; i < block.children.length; i++) {
      const child = block.children[i];
      const branch = branches.nth(i);
      await expect(
        branch.locator("[data-org-node] [data-org-label]"),
      ).toHaveText(en(child.node.label));
      await expect(
        branch.locator("[data-org-leaf] [data-org-label]"),
      ).toHaveText((child.children ?? []).map((leaf) => en(leaf.label)));
    }
    const [root] = await boxes(org.locator("[data-org-root]"));
    const nodes = await boxes(org.locator("[data-org-node]"));
    for (const node of nodes)
      expect(node.top, slide.id).toBeGreaterThan(root.bottom - 1);
    // Reporting lines, no arrows.
    await expectConnectors(org, 0);
  }
});

// T123 (the owner's review of the diagram presets): the org chart's lines
// split downward from each parent, the outer branches curving left and
// right with rounded corners and a middle branch going straight down, in
// the border token as before. On a slide, a node's own nodes split under it
// the same way while they fit (at most six leaf columns across the chart:
// the nodes times the most nodes any of them has), and are listed under it
// otherwise. On a phone the nodes split across while two or fewer fit
// beside each other; otherwise, and for a node's own nodes, they are listed
// one under another, still below the node they report to.
test("the org chart splits its lines downward from each parent, curving out, the middle straight", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("orgchart")) {
    const org = await openDiagram(page, slide.id, "orgchart");
    const border = await tokenColour(org, "--color-border");
    const n = block.children.length;
    const most = Math.max(
      ...block.children.map((c) => c.children?.length ?? 0),
    );
    const top = await measureSplit(org.locator("[data-split]").first());
    expect(top.items).toHaveLength(n);
    if (!phone() || n <= 2) expectSplitAcross(top, border, `${slide.id} root`);
    else expectSplitDown(top, border, `${slide.id} root`);
    const branches = org.locator("[data-org-branch]");
    for (let i = 0; i < n; i++) {
      const leaves = block.children[i].children ?? [];
      if (!leaves.length) continue;
      const split = await measureSplit(
        branches.nth(i).locator("[data-split]").first(),
      );
      expect(split.items).toHaveLength(leaves.length);
      const at = `${slide.id} node ${i + 1}`;
      if (!phone() && n * most <= 6) expectSplitAcross(split, border, at);
      else expectSplitDown(split, border, at);
    }
  }
});

test("the gallery's org chart shows a three-way split, its middle straight", () => {
  // The example covers the owner's case: one parent over three.
  const [{ block }] = diagramSlides("orgchart");
  expect(block.children).toHaveLength(3);
});

test("the table draws each cell in its row and column, its header muted", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("table")) {
    const table = await openDiagram(page, slide.id, "table");
    await expect(table.locator("[data-table-column]")).toHaveText(
      block.columns.map(en),
    );
    const rows = table.locator("[data-table-row]");
    await expect(rows).toHaveCount(block.rows.length);
    for (let r = 0; r < block.rows.length; r++) {
      const row = rows.nth(r);
      await expect(row.locator("[data-table-label]")).toHaveText(
        en(block.rows[r].label),
      );
      await expect(row.locator("[data-table-cell]")).toHaveText(
        block.rows[r].cells.map(en),
      );
      // Each cell names its column.
      const columns = await row
        .locator("[data-table-cell]")
        .evaluateAll((cells) =>
          cells.map((c) =>
            c.closest("[data-column]")?.getAttribute("data-column"),
          ),
        );
      expect(columns).toEqual(block.columns.map((_, i) => String(i)));
    }
    if (!phone()) {
      // On a slide, a cell sits under its column's header.
      const heads = await boxes(table.locator("[data-table-column]"));
      const cells = await boxes(rows.first().locator("[data-table-cell]"));
      cells.forEach((cell, i) => {
        expect(cell.left, `${slide.id} cell ${i}`).toBeGreaterThanOrEqual(
          heads[i].left - 1,
        );
        expect(cell.right, `${slide.id} cell ${i}`).toBeLessThanOrEqual(
          heads[i].right + 1,
        );
      });
      const muted = await tokenColour(table, "--color-muted");
      const colours = await table
        .locator("[data-table-column]")
        .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).color));
      for (const colour of colours) expect(colour).toBe(muted);
    }
  }
});

test("the matrix draws its two axes, four quadrants and each item at its x and y", async ({
  page,
}) => {
  for (const { slide, block } of diagramSlides("matrix")) {
    const matrix = await openDiagram(page, slide.id, "matrix");
    await expect(matrix.locator('[data-matrix-axis="x"]')).toHaveText(
      en(block.x),
    );
    await expect(matrix.locator('[data-matrix-axis="y"]')).toHaveText(
      en(block.y),
    );
    const quadrants = matrix.locator("[data-matrix-quadrant]");
    await expect(quadrants).toHaveCount(4);
    await expect(
      matrix.locator("[data-matrix-quadrant] [data-matrix-label]"),
    ).toHaveText(block.quadrants.map((q) => en(q.label)));
    const items = block.items ?? [];
    await expect(matrix.locator("[data-matrix-item-label]")).toHaveText(
      items.map((item) => en(item.label)),
    );
    const [plot] = await boxes(matrix.locator("[data-matrix-plot]"));
    const dots = await boxes(matrix.locator("[data-matrix-dot]"));
    expect(dots).toHaveLength(items.length);
    items.forEach((item, i) => {
      const cx = (dots[i].left + dots[i].right) / 2;
      const cy = (dots[i].top + dots[i].bottom) / 2;
      const w = plot.right - plot.left;
      const h = plot.bottom - plot.top;
      expect((cx - plot.left) / w, `${slide.id} item ${i} x`).toBeCloseTo(
        item.x,
        1,
      );
      expect((plot.bottom - cy) / h, `${slide.id} item ${i} y`).toBeCloseTo(
        item.y,
        1,
      );
    });
    // Each axis runs to its arrow, from low to high.
    await expectConnectors(matrix, 2);
  }
});

test("the print view draws every diagram", async ({ page }) => {
  await page.goto("/print?deck=gallery");
  const diagrams = page.locator("[data-diagram]");
  await expect(diagrams).toHaveCount(2 * diagramBlocks.length);
  for (let i = 0; i < 2 * diagramBlocks.length; i++) {
    const box = await diagrams.nth(i).boundingBox();
    expect(box?.width ?? 0, `print diagram ${i}`).toBeGreaterThan(200);
    expect(box?.height ?? 0, `print diagram ${i}`).toBeGreaterThan(60);
  }
});
