import { expect, test, type Page } from "@playwright/test";
import { slideContent } from "../src/deck/content";
import { langs } from "../src/deck/langs";
import { slides } from "../src/deck/slides";

// Phone layout: on a portrait phone no slide text
// sits under the footer's counter or menu button at any scroll position, the
// document itself never scrolls (only a slide does), and the overview's
// thumbnails draw the 16:9 layout, as on a desktop. Each test sets its own
// viewport, so both projects run the same checks.

const TOTAL = slides.length;
/** The placeholders all fit, so the first slide with a headline is made long
 *  by adding placeholder lines to its body in the page. */
const LONG = slides.findIndex((slide) => slideContent(slide.id).headline) + 1;
const pad = (n: number) => String(n).padStart(2, "0");

async function openDeck(page: Page, query: string) {
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(`/${query}`);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 10_000 },
  );
}

/** Scrolls the live slide to `at`, then lists every line of visible slide
 *  text (clipped to the slide's own box) that overlaps the footer's counter
 *  or its menu button. */
const textUnderFooter = (page: Page, at: "top" | "bottom") =>
  page.evaluate((at) => {
    const slide = document.querySelector<HTMLElement>(
      "main:not([aria-hidden]) [data-kind]",
    )!;
    slide.scrollTop = at === "top" ? 0 : slide.scrollHeight;
    const footer = document.querySelector("footer")!;
    const counter = [...footer.querySelectorAll<HTMLElement>("*")].find(
      (el) =>
        el.children.length === 0 &&
        /^\d\d \/ \d\d$/.test(el.textContent?.trim() ?? ""),
    )!;
    const button = footer.querySelector("[data-footer-menu] button")!;
    const targets = [
      ["counter", counter.getBoundingClientRect()],
      ["menu", button.getBoundingClientRect()],
    ] as const;
    const clip = slide.getBoundingClientRect();
    const hits: string[] = [];
    const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const parent = node.parentElement;
      if (!text || !parent) continue;
      if (
        !parent.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        })
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        const top = Math.max(r.top, clip.top);
        const bottom = Math.min(r.bottom, clip.bottom);
        const left = Math.max(r.left, clip.left);
        const right = Math.min(r.right, clip.right);
        if (bottom - top < 1 || right - left < 1) continue; // clipped away
        for (const [name, t] of targets) {
          const overlapY = Math.min(bottom, t.bottom) - Math.max(top, t.top);
          const overlapX = Math.min(right, t.right) - Math.max(left, t.left);
          if (overlapY > 0.5 && overlapX > 0.5)
            hits.push(`"${text.slice(0, 40)}" under the ${name}`);
        }
      }
    }
    return hits;
  }, at);

test.describe("phone: no slide text under the footer", () => {
  test.use({ reducedMotion: "reduce" });

  for (const [width, height] of [
    [390, 844], // iPhone 13
    [390, 664], // iPhone 13, Safari's toolbars showing
    [412, 915], // Pixel 7
  ] as const) {
    test(`${width}×${height}: every slide, scrolled to its top and its end`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      for (const lang of langs) {
        await openDeck(page, `?s=1&lang=${lang}`);
        for (let s = 1; s <= TOTAL; s++) {
          await expect(page).toHaveURL(new RegExp(`s=${s}(?!\\d)`));
          await expect(page.locator("footer")).toContainText(
            `${pad(s)} / ${pad(TOTAL)}`,
          );
          for (const at of ["top", "bottom"] as const)
            expect(
              await textUnderFooter(page, at),
              `${lang} slide ${s}, ${at}`,
            ).toEqual([]);
          await page.keyboard.press("ArrowRight");
        }
      }
    });
  }

  test("390×664: a long slide still scrolls to its last line", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    expect(LONG, "a slide with a headline").toBeGreaterThan(0);
    await openDeck(page, `?s=${LONG}`);
    const m = await page
      .locator("main:not([aria-hidden]) [data-kind]")
      .evaluate((slide) => {
        const body = slide.querySelector("[data-slide-body]") ?? slide;
        for (let i = 0; i < 40; i++) {
          const line = document.createElement("p");
          line.textContent = "Placeholder text";
          body.append(line);
        }
        slide.scrollTop = slide.scrollHeight;
        const box = slide.getBoundingClientRect();
        const last = [...slide.querySelectorAll("p, span, li")]
          .filter((el) => el.textContent?.trim())
          .map((el) => el.getBoundingClientRect().bottom)
          .reduce((a, b) => Math.max(a, b), 0);
        const footer = document
          .querySelector("footer [data-footer-menu]")!
          .getBoundingClientRect();
        return {
          scrolls: slide.scrollHeight > slide.clientHeight,
          last,
          bottom: box.bottom,
          footerTop: footer.top,
        };
      });
    expect(m.scrolls).toBe(true);
    // The last line is inside the slide's box, and the box ends above the
    // footer row.
    expect(m.last).toBeLessThanOrEqual(m.bottom + 0.5);
    expect(m.bottom).toBeLessThanOrEqual(m.footerTop + 0.5);
  });
});

test.describe("phone: the document never scrolls, only a slide does", () => {
  test("390×844: no page scroll, even with content taller than the screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDeck(page, "?s=3");
    const m = await page.evaluate(() => {
      const root = document.scrollingElement!;
      const fits = root.scrollHeight <= root.clientHeight;
      window.scrollTo(0, 500);
      const y1 = window.scrollY;
      // A browser toolbar collapsing makes 100vh taller than the screen:
      // stand in for it with something taller than the viewport.
      const tall = document.createElement("div");
      tall.style.height = "3000px";
      document.body.append(tall);
      window.scrollTo(0, 500);
      const y2 = window.scrollY;
      tall.remove();
      const style = (el: Element) => {
        const s = getComputedStyle(el);
        return [s.overflowY, s.overscrollBehaviorY];
      };
      return {
        fits,
        y1,
        y2,
        html: style(document.documentElement),
        body: style(document.body),
      };
    });
    expect(m.fits).toBe(true);
    expect(m.y1).toBe(0);
    expect(m.y2).toBe(0);
    expect(m.html).toEqual(["hidden", "none"]);
    expect(m.body).toEqual(["hidden", "none"]);
  });

  test("/print still scrolls page by page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/print");
    const y = await page.evaluate(() => {
      window.scrollTo(0, 1200);
      return window.scrollY;
    });
    expect(y).toBe(1200);
  });
});

test.describe("phone: overview thumbnails stay 16:9", () => {
  test.use({ reducedMotion: "reduce" });

  /** Every thumbnail's display text, its size and box relative to the
   *  thumbnail's own width. */
  const thumbLayout = async (page: Page, width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await openDeck(page, "?s=4");
    await page.keyboard.press("o");
    const overview = page.getByRole("dialog", { name: "Overview" });
    await expect(overview).toBeVisible();
    await expect(overview.locator("[data-thumb]")).toHaveCount(TOTAL);
    return overview.locator("[data-thumb]").evaluateAll((thumbs) =>
      thumbs.map((thumb) => {
        const stage = thumb.firstElementChild!.getBoundingClientRect();
        const unit = (n: number) => Math.round((n / stage.width) * 1000) / 1000;
        return [...thumb.querySelectorAll<HTMLElement>("[data-variant]")]
          .filter((el) => el.closest("[data-kind]"))
          .map((el) => {
            const r = el.getBoundingClientRect();
            // Centred text is compared by its centre: its left moves with
            // glyph rounding at thumbnail scale.
            const centred = getComputedStyle(el).textAlign === "center";
            return {
              size: unit(parseFloat(getComputedStyle(el).fontSize)),
              left: unit(
                (centred ? r.left + r.width / 2 : r.left) - stage.left,
              ),
              top: unit(r.top - stage.top),
              width: unit(r.width),
            };
          });
      }),
    );
  };

  test("390×844: thumbnails draw the desktop layout, scaled", async ({
    page,
  }) => {
    const desktop = await thumbLayout(page, 1440, 900);
    const phone = await thumbLayout(page, 390, 844);
    expect(phone).toHaveLength(desktop.length);
    phone.forEach((texts, i) => {
      expect(texts, `thumbnail ${i + 1}`).toHaveLength(desktop[i].length);
      texts.forEach((text, j) => {
        const at = `thumbnail ${i + 1}, text ${j + 1}: phone ${JSON.stringify(text)}, desktop ${JSON.stringify(desktop[i][j])}`;
        expect(Math.abs(text.size - desktop[i][j].size), at).toBeLessThan(
          0.002,
        );
        expect(Math.abs(text.left - desktop[i][j].left), at).toBeLessThan(0.01);
      });
    });
  });
});
