import type { Page } from "@playwright/test";
import { probe, type Group, type ProbeConfig, type Strip } from "./sampler";

// The strips of research R8 and their scripted inputs, the same for the
// recording (tests/baseline/record.spec.ts) and the replay
// (tests/motion/strips.spec.ts). Every element is found by its role, its
// ARIA or a generic data attribute, so the same selectors hold in the origin
// build and in the template.

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Opens slide `s` (1-based) with the intro off, once the hard-load screen
 *  has lifted, the page has arrived and its entrance has finished. */
async function openDeck(page: Page, url: string, s: number) {
  await page.goto(`${url}/?s=${s}&intro=off`);
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('[id$="-boot"]')?.dataset.state ===
        "done" && !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 15_000, polling: 100 },
  );
  await sleep(800);
}

async function start(page: Page, cfg: ProbeConfig) {
  await page.evaluate(probe, cfg);
  // One drawn frame before the input, so a change has a still frame to
  // count from.
  await sleep(100);
  return cfg;
}

const card = (page: Page) => page.locator("[data-menu-card]");

/** The menu card's open or close clip has ended. */
const clipped = (page: Page) =>
  page.waitForFunction(
    () =>
      !document
        .querySelector("[data-menu-card]")
        ?.getAnimations()
        .some((a) =>
          (a.effect as KeyframeEffect | null)
            ?.getKeyframes()
            .some((frame) => "clipPath" in frame),
        ),
    undefined,
    { polling: 100 },
  );

type Point = [number, number];

/** One finger, through Chromium's own touch input (CDP), along `path`:
 *  keyframes [ms, dx] from the touch, linear between them, a move every
 *  16 ms, then up. */
async function drag(page: Page, from: Point, path: [number, number][]) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (
    type: "touchStart" | "touchMove" | "touchEnd",
    points: Point[],
  ) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map(([x, y], i) => ({
        x,
        y,
        id: i + 1,
        radiusX: 1,
        radiusY: 1,
        force: 1,
      })),
    });
  const at = (t: number) => {
    let i = 1;
    while (i < path.length - 1 && path[i][0] < t) i++;
    const [ta, xa] = path[i - 1];
    const [tb, xb] = path[i];
    const k = tb === ta ? 1 : Math.min(1, Math.max(0, (t - ta) / (tb - ta)));
    return xa + (xb - xa) * k;
  };
  const [x0, y0] = from;
  await touch("touchStart", [[x0, y0]]);
  const t0 = Date.now();
  const last = path.at(-1)![0];
  for (;;) {
    await sleep(16);
    const t = Math.min(Date.now() - t0, last);
    await touch("touchMove", [[x0 + at(t), y0]]);
    if (t >= last) break;
  }
  await touch("touchEnd", []);
  await cdp.detach();
}

const step = (name: string, from: number, key: string): Strip => ({
  name,
  groups: {
    enter: {
      values: { enterX: "permille", enterOpacity: "opacity" },
      clock: "frame",
      anchor: "reported",
    },
    leave: {
      values: { leaveX: "permille", leaveOpacity: "opacity" },
      clock: "frame",
      anchor: "reported",
    },
  },
  duration: 1000,
  async play(page, url) {
    await openDeck(page, url, from);
    const cfg = await start(page, {
      kind: "step",
      trigger: "keydown",
      duration: 1000,
      target: key === "ArrowRight" ? from : from - 2,
    });
    await page.keyboard.press(key);
    return cfg;
  },
});

/** A slow drag of `share` of the width toward the next slide, held still
 *  200 ms (so it lets go with no speed), then let go. */
const swipe = (name: string, share: number, settles: boolean): Strip => ({
  name,
  groups: {
    slide: {
      values: {
        x: "permille",
        opacity: "opacity",
        otherX: "permille",
        otherOpacity: "opacity",
      },
      clock: "script",
      anchor: "change",
    },
  },
  duration: 1100,
  context: { hasTouch: true },
  stillWhenReduced: !settles,
  async play(page, url) {
    await openDeck(page, url, 2);
    const { width, height } = page.viewportSize()!;
    // Slide 2 is index 1; the next is index 2. `target` is where it rests.
    const cfg = await start(page, {
      kind: "swipe",
      trigger: "touchend",
      duration: 1100,
      target: settles ? 2 : 1,
      other: settles ? 1 : 2,
    });
    const travel = settles ? 600 : 700;
    await drag(
      page,
      [width * 0.8, height * 0.5],
      [
        [0, 0],
        [travel, -width * share],
        [travel + 200, -width * share],
      ],
    );
    return cfg;
  },
});

const menuGroups: Strip["groups"] = {
  card: {
    values: {
      clipTop: "permille",
      clipRight: "permille",
      clipBottom: "permille",
      clipLeft: "permille",
      rowX: "permille",
      rowY: "permille",
      rowWidth: "permille",
      rowOpacity: "opacity",
      cardOpacity: "opacity",
    },
    clock: "frame",
    anchor: "reported",
  },
  // The menu button: hidden at once as the card opens, faded back in as it
  // closes.
  trigger: {
    values: { triggerOpacity: "opacity" },
    clock: "frame",
    anchor: "reported",
  },
};

const boundsGroups: Strip["groups"] = {
  card: {
    values: {
      width: "permille",
      height: "permille",
      x: "permille",
      y: "permille",
    },
    clock: "script",
    anchor: "reported",
  },
};

const THUMBS = 6;

export const strips: Strip[] = [
  step("page-step-forward", 2, "ArrowRight"),
  step("page-step-back", 3, "ArrowLeft"),
  swipe("swipe-settle", 0.6, true),
  swipe("swipe-springback", 0.4, false),
  {
    name: "menu-open",
    groups: menuGroups,
    duration: 1000,
    async play(page, url) {
      await openDeck(page, url, 3);
      const cfg = await start(page, {
        kind: "menu",
        trigger: "keydown",
        duration: 1000,
      });
      await page.keyboard.press("m");
      return cfg;
    },
  },
  {
    name: "menu-close",
    groups: menuGroups,
    duration: 1000,
    async play(page, url) {
      await openDeck(page, url, 3);
      await page.keyboard.press("m");
      await card(page).waitFor();
      await clipped(page);
      await sleep(700);
      const cfg = await start(page, {
        kind: "menu",
        trigger: "keydown",
        duration: 1000,
      });
      await page.keyboard.press("Escape");
      return cfg;
    },
  },
  {
    name: "menu-expand",
    groups: boundsGroups,
    duration: 1000,
    async play(page, url) {
      await openDeck(page, url, 3);
      await page.keyboard.press("m");
      await card(page).waitFor();
      await clipped(page);
      await sleep(700);
      const cfg = await start(page, {
        kind: "bounds",
        trigger: "click",
        duration: 1000,
      });
      await card(page)
        .getByRole("button", { name: "Expand", exact: true })
        .click();
      return cfg;
    },
  },
  {
    name: "menu-minimize",
    groups: boundsGroups,
    duration: 1000,
    async play(page, url) {
      await openDeck(page, url, 3);
      await page.keyboard.press("m");
      await card(page).waitFor();
      await clipped(page);
      await sleep(700);
      await card(page)
        .getByRole("button", { name: "Expand", exact: true })
        .click();
      await sleep(1200);
      const cfg = await start(page, {
        kind: "bounds",
        trigger: "click",
        duration: 1000,
      });
      await card(page)
        .getByRole("button", { name: "Minimize", exact: true })
        .click();
      return cfg;
    },
  },
  {
    name: "overview",
    groups: {
      ...Object.fromEntries(
        Array.from({ length: THUMBS }, (_, i) => [
          `thumb${i}`,
          {
            values: { [`thumb${i}`]: "opacity" },
            clock: "frame",
            anchor: "reported",
          } satisfies Group,
        ]),
      ),
      content: {
        values: { content: "opacity" },
        clock: "frame",
        anchor: "reported",
      },
    },
    duration: 900,
    // Expanded from the popup: the overview's thumbnails enter with their
    // stagger (opened straight into the overview, they show at once).
    async play(page, url) {
      await openDeck(page, url, 3);
      await page.keyboard.press("m");
      await card(page).waitFor();
      await clipped(page);
      await sleep(700);
      const cfg = await start(page, {
        kind: "overview",
        trigger: "click",
        duration: 900,
        count: THUMBS,
      });
      await card(page)
        .getByRole("button", { name: "Expand", exact: true })
        .click();
      return cfg;
    },
  },
  {
    name: "intro",
    groups: {
      mark: {
        values: { markOpacity: "opacity", markScale: "scale" },
        clock: "frame",
        anchor: "reported",
      },
      lock: {
        values: { lockOpacity: "opacity", lockScale: "scale" },
        clock: "script",
        anchor: "appear",
      },
      gate: {
        values: { gateOpacity: "opacity" },
        clock: "frame",
        anchor: "reported",
      },
    },
    events: ["lockShown", "lockOpen", "ready", "gone", "introEnd"],
    duration: 5400,
    async play(page, url) {
      // A fresh session: the intro plays once per session.
      const cfg: ProbeConfig = { kind: "intro", trigger: null, duration: 5400 };
      await page.addInitScript(probe, cfg);
      await page.goto(`${url}/?s=3`);
      return cfg;
    },
  },
];
