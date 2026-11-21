import type { Browser, BrowserContextOptions, Page } from "@playwright/test";

// Per-frame motion strips: the in-page sampler, the resampling onto a fixed
// grid, the aggregation of recorded runs into a baseline, and the diff of a
// replay against it (research R8). Shared by tests/baseline/record.spec.ts,
// which records the baseline, and tests/motion/strips.spec.ts, which replays
// it. The scripted inputs of each strip live in ./strips.ts.

/** The resampling grid, ms. */
export const FRAME = 16.7;

/** Values are stored in units where the evidence writer's 0.1 rounding
 *  keeps the precision: positions in per mille of a length, opacity and
 *  scale in percent, times in ms. */
export type Unit = "permille" | "opacity" | "scale" | "ms";

export const unitNames: Record<Unit, string> = {
  permille: "per mille (1000 = the reference length)",
  opacity: "opacity in percent (0-100)",
  scale: "scale in percent (100 = 1)",
  ms: "ms",
};

/** The fixed part of each tolerance: 0.005 of the normalised unit, 0.02
 *  opacity, or one frame for timing values (R8). */
export const base: Record<Unit, number> = {
  permille: 5,
  opacity: 2,
  scale: 0.5,
  ms: FRAME,
};

export type Values = Record<string, number | null>;
/** A drawn frame: `t` the frame's own time (document.timeline, the clock
 *  of Web Animations and CSS transitions), `p` when its animation-frame
 *  callbacks ran (performance.now(), the clock of script-driven springs,
 *  later than `t` when the main thread was busy as the frame began). */
export type Sample = { t: number; p?: number; values: Values };

/** One sampled run. Times are ms from the triggering input (t = 0). */
export type Run = {
  /** The first frame that showed the input (a frame it landed in can have
   *  begun just before it). */
  zero: number;
  frames: Sample[];
  /** Motion starts the page reported, per group. */
  anchors: Record<string, number | null>;
  events: Record<string, number | null>;
};

/**
 * A group of values that one motion drives. Its onset (when that motion
 * starts, ms from the input) places it on the grid; its latency (from the
 * first frame that showed the input to the onset) is a timing value; its
 * values are compared frame by frame from the onset on.
 * - `reported`: the page reports the start: a Web Animation's start time,
 *   or the time of the commit that starts a script-driven spring.
 * - `change`: the motion starts between the last still frame and the
 *   first frame whose values moved (a script-driven spring).
 * - `appear`: the same, for the first frame its element is there.
 * A `reported` group whose run reports nothing (a jump with no animation)
 * starts where it changes. On the frame clock a change starts on the frame
 * that draws it.
 */
export type Group = {
  values: Record<string, Unit>;
  /** Which clock drives the motion: Web Animations and CSS (`frame`) or a
   *  script's springs (`script`). */
  clock: "frame" | "script";
  anchor: "reported" | "change" | "appear";
};

export type ProbeKind =
  "step" | "swipe" | "menu" | "bounds" | "overview" | "intro";

export type ProbeConfig = {
  kind: ProbeKind;
  /** The input whose time is t = 0; none for the intro, which starts its own
   *  clock (t = 0 is the first frame of the intro's clock). */
  trigger: "keydown" | "click" | "touchend" | null;
  /** How long to sample after t = 0, ms. */
  duration: number;
  /** Slide indexes (0-based) and counts the probe needs. */
  target?: number;
  other?: number;
  count?: number;
};

type Probed = {
  e: number;
  /** The first frame that showed the input: the frame it landed in, or the
   *  next one. */
  zero: number;
  done: boolean;
  frames: { t: number; p: number; v: Values }[];
  anchors: Record<string, number | null>;
  events: Record<string, number | null>;
};

/**
 * The in-page sampler. A requestAnimationFrame loop posts a task each frame;
 * the task reads the values once the frame has been drawn, stamped with the
 * frame's own time (document.timeline) and with when its callbacks ran, so
 * Web Animations and script-driven springs are both read as that frame
 * showed them, each on its own clock. Runs in the page: it must not
 * reference anything outside itself.
 */
export function probe(cfg: ProbeConfig) {
  const w = window as unknown as { __strip?: Probed };
  const state: Probed = {
    e: -1,
    zero: -1,
    done: false,
    frames: [],
    anchors: {},
    events: {},
  };
  w.__strip = state;
  /** The frame whose callbacks ran last: its own time and when they ran. */
  let frame = { t: -1, p: -1 };
  if (cfg.trigger)
    addEventListener(
      cfg.trigger,
      () => {
        if (state.e >= 0) return;
        state.e = performance.now();
        // Inside a frame (input aligned to frames), the frame it landed in.
        const now = Number(document.timeline.currentTime);
        if (now > frame.t) state.zero = now;
      },
      { capture: true },
    );

  const pm = (value: number, of: number) => (of ? (value / of) * 1000 : null);
  const pc = (value: number) => value * 100;
  const matrix = (el: Element) => {
    const t = getComputedStyle(el).transform;
    return !t || t === "none"
      ? new DOMMatrixReadOnly()
      : new DOMMatrixReadOnly(t);
  };
  const opacity = (el: Element) => Number(getComputedStyle(el).opacity);
  /** Opacity as drawn: its own and every ancestor's, below `top`. */
  const seen = (el: Element, top: Element | null) => {
    let o = 1;
    for (let n: Element | null = el; n && n !== top; n = n.parentElement)
      o *= opacity(n);
    return o;
  };
  /** Its x as drawn: every transform and translate from it up to the root. */
  const xOf = (el: Element) => {
    let x = 0;
    for (let n: Element | null = el; n; n = n.parentElement) {
      const style = getComputedStyle(n);
      if (style.transform !== "none")
        x += new DOMMatrixReadOnly(style.transform).m41;
      if (style.translate && style.translate !== "none")
        x += parseFloat(style.translate.split(" ")[0]);
    }
    return x;
  };
  const scaleOf = (el: Element) => {
    const s = getComputedStyle(el).scale;
    const own = !s || s === "none" ? 1 : parseFloat(s);
    const m = matrix(el);
    return own * Math.hypot(m.a, m.b);
  };
  const insets = (clip: string) => {
    if (!clip || clip === "none") return [0, 0, 0, 0];
    const match = /^inset\(([^)]*?)(?: round [^)]*)?\)$/.exec(clip);
    if (!match) return null;
    const v = match[1].trim().split(/\s+/).map(parseFloat);
    const [top, right = top, bottom = top, left = right] = v;
    return [top, right, bottom, left];
  };
  const anchor = (group: string, at: CSSNumberish | null | undefined) => {
    if (at === null || at === undefined || state.e < 0) return;
    const time = Number(at);
    // A frame-clock start may be the time of the frame the input landed in.
    if (time < state.e - 17) return;
    const was = state.anchors[group];
    if (was === undefined || was === null || time < was)
      state.anchors[group] = time;
  };
  const event = (name: string, t: number, now: boolean) => {
    if (now && state.events[name] === undefined) state.events[name] = t;
  };
  const clipRun = (el: Element) =>
    el
      .getAnimations()
      .find((a) =>
        (a.effect as KeyframeEffect | null)
          ?.getKeyframes()
          .some((frame) => "clipPath" in frame),
      );
  const slide = (i: number | undefined) =>
    document.querySelector<HTMLElement>(
      `main[aria-roledescription="slide"][data-slide-index="${i}"]`,
    );

  const stage = document.querySelector<HTMLElement>(
    '[aria-roledescription="slide deck"]',
  );
  const sw = stage?.offsetWidth ?? innerWidth;
  const sh = stage?.offsetHeight ?? innerHeight;
  let box: DOMRect | null = null;
  const cardBox = (card: Element | null) => {
    if (card && !box) box = card.getBoundingClientRect();
    return box;
  };
  if (cfg.kind === "bounds" || cfg.kind === "menu")
    cardBox(document.querySelector("[data-menu-card]"));
  // Expand and Minimize start their springs in the commit that changes the
  // card's form: that commit's time is the springs' start.
  const form = document.querySelector("[data-menu-card]");
  if (form && cfg.kind === "bounds")
    new MutationObserver(() => anchor("card", performance.now())).observe(
      form,
      { attributes: true, attributeFilter: ["data-view"] },
    );

  const measure = (t: number): Values => {
    if (cfg.kind === "step") {
      const section = slide(cfg.target)?.querySelector("[data-page-section]");
      const v: Values = {
        enterX: null,
        enterOpacity: null,
        leaveX: null,
        leaveOpacity: null,
      };
      if (section) {
        v.enterX = pm(matrix(section).m41, sw);
        v.enterOpacity = pc(opacity(section));
        for (const a of section.getAnimations()) anchor("enter", a.startTime);
      }
      const old = document
        .getAnimations()
        .find((a) =>
          (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
            "::view-transition-old",
          ),
        );
      if (old) {
        const style = getComputedStyle(
          document.documentElement,
          (old.effect as KeyframeEffect).pseudoElement,
        );
        v.leaveX = pm(
          style.transform === "none"
            ? 0
            : new DOMMatrixReadOnly(style.transform).m41,
          sw,
        );
        v.leaveOpacity = pc(Number(style.opacity));
        anchor("leave", old.startTime);
      }
      return v;
    }
    if (cfg.kind === "swipe") {
      const rest = slide(cfg.target);
      const other = slide(cfg.other);
      return {
        x: rest ? pm(xOf(rest), sw) : null,
        opacity: rest ? pc(seen(rest, null)) : null,
        otherX: other ? pm(xOf(other), sw) : null,
        otherOpacity: other ? pc(seen(other, null)) : null,
      };
    }
    if (cfg.kind === "menu") {
      const card = document.querySelector<HTMLElement>("[data-menu-card]");
      const trigger = document.querySelector('button[aria-haspopup="dialog"]');
      const v: Values = {
        clipTop: null,
        clipRight: null,
        clipBottom: null,
        clipLeft: null,
        rowX: null,
        rowY: null,
        rowWidth: null,
        rowOpacity: null,
        cardOpacity: null,
        triggerOpacity: trigger ? pc(opacity(trigger)) : null,
      };
      const b = cardBox(card);
      if (card && b) {
        const clip = insets(getComputedStyle(card).clipPath);
        if (clip) {
          v.clipTop = pm(clip[0], b.height);
          v.clipRight = pm(clip[1], b.width);
          v.clipBottom = pm(clip[2], b.height);
          v.clipLeft = pm(clip[3], b.width);
        }
        const row = card.querySelector("[data-menu-footer]");
        if (row) {
          const m = matrix(row);
          v.rowX = pm(m.m41, b.width);
          v.rowY = pm(m.m42, b.height);
          v.rowWidth = pm(row.getBoundingClientRect().width, b.width);
          v.rowOpacity = pc(seen(row, card));
        }
        v.cardOpacity = pc(opacity(card));
        anchor("card", clipRun(card)?.startTime);
        // The button's fade back in, where it has one.
        for (const a of trigger?.getAnimations() ?? [])
          if (a.startTime !== null)
            anchor(
              "trigger",
              Number(a.startTime) + Number(a.effect?.getTiming().delay ?? 0),
            );
      }
      return v;
    }
    if (cfg.kind === "bounds") {
      const card = document.querySelector("[data-menu-card]");
      const b = box;
      if (!card || !b) return { width: null, height: null, x: null, y: null };
      const r = card.getBoundingClientRect();
      return {
        width: pm(r.width - b.width, sw),
        height: pm(r.height - b.height, sh),
        x: pm(r.left - b.left, sw),
        y: pm(r.top - b.top, sh),
      };
    }
    if (cfg.kind === "overview") {
      // Each thumbnail's own fade, which starts after its stagger delay,
      // and the fade of the content that holds them.
      const card = document.querySelector("[data-menu-card]");
      const thumbs = card ? [...card.querySelectorAll("[data-thumb]")] : [];
      const items = thumbs.map((t) => t.closest("li") ?? t.parentElement);
      const v: Values = {};
      for (let i = 0; i < (cfg.count ?? 0); i++) {
        const item = items[i];
        v[`thumb${i}`] = item ? pc(opacity(item)) : null;
        for (const a of item?.getAnimations() ?? [])
          if (a.startTime !== null)
            anchor(
              `thumb${i}`,
              Number(a.startTime) + Number(a.effect?.getTiming().delay ?? 0),
            );
      }
      const content = items[0]?.parentElement ?? null;
      v.content = content ? pc(seen(content, card)) : null;
      for (let n = content; n && n !== card; n = n.parentElement)
        for (const a of n.getAnimations()) anchor("content", a.startTime);
      return v;
    }
    // The intro: its mark (the element in the mark's place in the stage),
    // the lock and the intro layer, with its timeline.
    const stageEl = document.querySelector("[data-gate-stage]");
    const gate = document.querySelector("[data-gate]");
    const mark = stageEl?.querySelector(
      ":scope > :not(canvas):not(svg):not([data-lock-state])",
    );
    const lock = document.querySelector("[data-lock-state]");
    const started = state.e >= 0;
    event("lockShown", t, started && Boolean(lock));
    event(
      "lockOpen",
      t,
      started && lock?.getAttribute("data-lock-state") === "open",
    );
    event("ready", t, started && Boolean(gate?.hasAttribute("data-ready")));
    event("gone", t, started && !gate);
    event(
      "introEnd",
      t,
      started && !document.documentElement.hasAttribute("data-intro"),
    );
    if (mark) for (const a of mark.getAnimations()) anchor("mark", a.startTime);
    if (gate) for (const a of gate.getAnimations()) anchor("gate", a.startTime);
    return {
      markOpacity: mark ? pc(opacity(mark)) : null,
      markScale: mark ? pc(scaleOf(mark)) : null,
      lockOpacity: lock ? pc(opacity(lock)) : null,
      lockScale: lock ? pc(scaleOf(lock)) : null,
      gateOpacity: gate ? pc(opacity(gate)) : null,
    };
  };

  // The read runs as a task after the frame, so it sees what the frame drew.
  // Should a later frame come first, the read belongs to that frame.
  const channel = new MessageChannel();
  let last = -1;
  channel.port1.onmessage = () => {
    if (state.done) return;
    const { t, p } = frame;
    if (t === last || Number(document.timeline.currentTime) !== t) return;
    last = t;
    state.frames.push({ t, p, v: measure(t) });
    if (state.e >= 0 && t - state.e > cfg.duration) state.done = true;
  };
  const loop = (time: number) => {
    if (state.done) return;
    frame = { t: Number(document.timeline.currentTime), p: performance.now() };
    if (state.e >= 0 && state.zero < 0) state.zero = frame.t;
    // The intro's clock starts on its first frame with a motion mode.
    if (
      !cfg.trigger &&
      state.e < 0 &&
      document.querySelector("[data-gate-stage][data-motion]")
    )
      state.zero = state.e = time;
    channel.port2.postMessage(0);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const round = (value: number) => Math.round(value * 10) / 10;
const roundOrNull = (value: number | null | undefined) =>
  value === null || value === undefined ? null : round(value);

/** Waits for the probe to finish and returns its run, times from t = 0,
 *  every number rounded to 0.1 (as the evidence writer stores it). */
export async function collect(page: Page, cfg: ProbeConfig): Promise<Run> {
  await page.waitForFunction(
    () => (window as unknown as { __strip?: Probed }).__strip?.done === true,
    undefined,
    { timeout: cfg.duration + 15_000, polling: 100 },
  );
  const probed = await page.evaluate(
    () => (window as unknown as { __strip: Probed }).__strip,
  );
  const e = probed.e;
  const relative = (time: number | null | undefined) =>
    time === null || time === undefined ? null : round(time - e);
  return {
    zero: round(probed.zero - e),
    frames: probed.frames.map((f) => ({
      t: round(f.t - e),
      p: round(f.p - e),
      values: Object.fromEntries(
        Object.entries(f.v).map(([k, v]) => [k, roundOrNull(v)]),
      ),
    })),
    anchors: Object.fromEntries(
      Object.entries(probed.anchors).map(([k, v]) => [k, relative(v)]),
    ),
    events: Object.fromEntries(
      Object.entries(probed.events).map(([k, v]) => [k, relative(v)]),
    ),
  };
}

/** The scripted inputs of one strip (./strips.ts). */
export type Strip = {
  name: string;
  groups: Record<string, Group>;
  /** Timeline events the run reports (ms from t = 0). */
  events?: string[];
  /** How long after t = 0 the strip is compared, ms. */
  duration: number;
  /** Context options the strip needs beyond the viewport. */
  context?: BrowserContextOptions;
  /** Under reduced motion nothing at all changes (a drag that does not
   *  step: with no tracking, the slide never moves). */
  stillWhenReduced?: boolean;
  /** Opens the page, starts the probe and gives the input. */
  play: (page: Page, url: string) => Promise<ProbeConfig>;
};

/** The project's device options, for a fresh context per run. */
export function deviceOptions(
  use: BrowserContextOptions,
): BrowserContextOptions {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, screen } =
    use;
  return { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, screen };
}

/** Plays one strip in a fresh context and returns its run. */
export async function runStrip(
  browser: Browser,
  strip: Strip,
  url: string,
  device: BrowserContextOptions,
  reducedMotion: "reduce" | "no-preference" = "no-preference",
): Promise<Run> {
  const context = await browser.newContext({
    ...device,
    ...strip.context,
    reducedMotion,
  });
  try {
    const page = await context.newPage();
    const cfg = await strip.play(page, url);
    return await collect(page, cfg);
  } finally {
    await context.close();
  }
}

// Resampling and alignment.

/** `run` on the clock that drives `group`. */
function clocked(run: Run, group: Group): Run {
  if (group.clock === "frame") return run;
  return {
    ...run,
    frames: run.frames.map((f) => ({ t: f.p ?? f.t, values: f.values })),
  };
}

/** The value of `key` at time `at`, between the frames around it on a
 *  monotone cubic (Fritsch–Carlson), so a frame the browser dropped from a
 *  smooth curve costs little; null where the element is not there on
 *  either side. */
function valueAt(frames: Sample[], key: string, at: number): number | null {
  let lo = 0;
  let hi = frames.length - 1;
  if (hi < 0 || at < frames[0].t || at > frames[hi].t) return null;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= at) lo = mid;
    else hi = mid;
  }
  const value = (i: number) => frames[i]?.values[key] ?? null;
  const va = value(lo);
  const vb = value(hi);
  if (at === frames[lo].t) return va;
  if (at === frames[hi].t) return vb;
  if (va === null || vb === null) return null;
  const h = frames[hi].t - frames[lo].t;
  const d = (vb - va) / h;
  /** The secant from frame i to frame j, if both are there. */
  const secant = (i: number, j: number) => {
    const vi = value(i);
    const vj = value(j);
    if (vi === null || vj === null || !frames[i] || !frames[j]) return null;
    const dt = frames[j].t - frames[i].t;
    return dt > 0 ? { d: (vj - vi) / dt, h: dt } : null;
  };
  const slope = (side: { d: number; h: number } | null, left: boolean) => {
    if (!side) return d;
    if (side.d * d <= 0) return 0;
    const [h0, h1] = left ? [side.h, h] : [h, side.h];
    const [d0, d1] = left ? [side.d, d] : [d, side.d];
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    return (w1 + w2) / (w1 / d0 + w2 / d1);
  };
  const ma = slope(secant(lo - 1, lo), true);
  const mb = slope(secant(hi, hi + 1), false);
  const x = (at - frames[lo].t) / h;
  const x2 = x * x;
  const x3 = x2 * x;
  return (
    (2 * x3 - 3 * x2 + 1) * va +
    (x3 - 2 * x2 + x) * h * ma +
    (-2 * x3 + 3 * x2) * vb +
    (x3 - x2) * h * mb
  );
}

const grid = (duration: number) =>
  Array.from({ length: Math.floor(duration / FRAME) + 1 }, (_, k) =>
    round(k * FRAME),
  );

const changed = (a: Values, b: Values, keys: string[]) =>
  keys.some((k) => {
    const x = a[k];
    const y = b[k];
    if (x === null || y === null || x === undefined || y === undefined)
      return (x ?? null) !== (y ?? null);
    return Math.abs(x - y) > 0.15;
  });

/** Where the motion of `group` may start in `run`: the earliest and latest
 *  start, ms, and the first guess. */
export function startWindow(run: Run, name: string, group: Group) {
  const reported = run.anchors[name];
  if (group.anchor === "reported" && reported !== undefined) {
    const at = reported;
    if (at === null) return null;
    // A Web Animation's start is exact; a commit only bounds a spring's.
    return group.clock === "frame"
      ? { lo: at, hi: at, guess: at }
      : { lo: at - FRAME, hi: at + FRAME, guess: at };
  }
  const keys = Object.keys(group.values);
  const before = run.frames.filter((f) => f.t <= 0).at(-1);
  const after = run.frames.filter((f) => f.t > 0);
  for (let i = 0; i < after.length; i++) {
    const f = after[i];
    const hit =
      group.anchor === "appear"
        ? keys.some((k) => f.values[k] !== null && f.values[k] !== undefined)
        : before !== undefined && changed(before.values, f.values, keys);
    if (!hit) continue;
    // It started after the last frame that still stood (a spring leaves
    // rest slowly, so up to a frame before it), by the first that moved.
    const prior = i > 0 ? after[i - 1].t : 0;
    // On the frame clock a change is drawn by the frame that shows it.
    if (group.clock === "frame") return { lo: f.t, hi: f.t, guess: f.t };
    return {
      lo: Math.max(0, prior - FRAME),
      hi: f.t,
      guess: Math.max(0, prior),
    };
  }
  return null;
}

/** A value on the grid: a number, null where its element is not there,
 *  undefined where it is not known (before its motion's onset, or, on the
 *  frame clock, where no frame was drawn: the browser dropped it). */
type Point = number | null | undefined;
type Curve = Record<string, Point[]>;

/** A grid time between two drawn frames further apart than this many
 *  frame intervals fell where the browser dropped frames: it is not read
 *  off them. */
const DROPPED = 1.5;

/** `run`'s values of `keys` on the grid, the run's onset `at` placed on the
 *  grid's `onset`. A motion starts from where its values stood: at its onset
 *  they still hold the last frame's before it. A grid time
 *  that falls in frames the browser dropped is not known. */
export function resample(
  run: Run,
  keys: string[],
  times: number[],
  onset: number,
  at: number,
  clock: Group["clock"],
): Curve {
  const before = run.frames.filter((f) => f.t < at);
  const still = before.at(-1);
  const frames =
    still && !run.frames.some((f) => f.t === at)
      ? [
          ...before,
          { t: at, values: still.values },
          ...run.frames.slice(before.length),
        ]
      : run.frames;
  const gaps = run.frames
    .filter((f) => f.t > 0)
    .map((f, i, all) => (i ? f.t - all[i - 1].t : 0))
    .slice(1)
    .sort((a, b) => a - b);
  const usual = gaps.length ? gaps[gaps.length >> 1] : FRAME;
  /** Whether `time` lies on a drawn frame or between two frames the
   *  browser drew at its usual pace. */
  const drawn = (time: number) => {
    const i = frames.findIndex((f) => f.t >= time);
    if (i < 0) return false;
    if (Math.abs(frames[i].t - time) < 0.5 || i === 0) return true;
    // A curve on the frame clock (a Web Animation's easing) is read only
    // between frames a frame apart; a script's spring is smooth enough to
    // read between frames at the run's own pace.
    const pace = clock === "frame" ? FRAME : usual;
    return frames[i].t - frames[i - 1].t <= DROPPED * pace;
  };
  const curve: Curve = {};
  for (const k of keys)
    curve[k] = times.map((t) => {
      const time = t - onset + at;
      if (t < onset || !drawn(time)) return undefined;
      return valueAt(frames, k, time);
    });
  return curve;
}

/** The reference's value at `time` from the grid, linear between grid
 *  points; undefined where either side is not known. */
function referenceAt(curve: Point[], times: number[], time: number): Point {
  const i = Math.floor(time / FRAME + 1e-9);
  const a = curve[i];
  if (Math.abs(times[i] - time) < 1e-6 || i + 1 >= times.length) return a;
  const b = curve[i + 1];
  if (a === undefined || b === undefined) return undefined;
  if (a === null || b === null) return a === b ? null : undefined;
  return a + ((b - a) * (time - times[i])) / (times[i + 1] - times[i]);
}

/**
 * The onset of `run` in [lo, hi] that best fits `reference` (on the grid,
 * its own onset at `onset`): each frame the run really drew is compared
 * with the reference at the same time from the onset, and each frame it
 * drew after the input but before the onset with where it stood, in
 * tolerance bases (mean square). Frames are compared as drawn, so a frame
 * the browser dropped does not move the fit.
 */
export function fit(
  run: Run,
  units: Record<string, Unit>,
  reference: Curve,
  times: number[],
  onset: number,
  { lo, hi }: { lo: number; hi: number },
) {
  const keys = Object.keys(units);
  const end = times.at(-1)!;
  const still = run.frames.filter((f) => f.t <= 0).at(-1)?.values ?? {};
  const after = run.frames.filter((f) => f.t > 0);
  let best = lo;
  let error = Infinity;
  for (let at = lo; at <= hi + 1e-9; at += 0.25) {
    let sum = 0;
    let n = 0;
    for (const f of after) {
      const time = f.t - at + onset;
      if (time > end) break;
      for (const k of keys) {
        const v = f.values[k] ?? null;
        // Before the onset it stands where it stood before the input (if it
        // was there; an element that mounts for the motion is not held to it).
        if (f.t < at && (still[k] ?? null) === null) continue;
        const r =
          f.t < at
            ? (still[k] ?? null)
            : time < onset
              ? undefined
              : referenceAt(reference[k], times, time);
        if (r === undefined || (r === null && v === null)) continue;
        n++;
        sum += r === null || v === null ? 4 : ((v - r) / base[units[k]]) ** 2;
      }
    }
    const e = n ? sum / n : Infinity;
    if (e < error - 1e-9) {
      error = e;
      best = at;
    }
  }
  return round(best);
}

/** The runs' points at one grid time, as one: their mean where every run
 *  that knows it has a number; null where all of them have none; undefined
 *  where none knows it or they disagree on whether it is there. */
function combine(points: Point[]): Point {
  const known = points.filter((v) => v !== undefined);
  if (!known.length) return undefined;
  if (known.every((v) => v === null)) return null;
  if (known.some((v) => v === null)) return undefined;
  return mean(known as number[]);
}

// The baseline.

export type Baseline = {
  strip: string;
  viewport: { width: number; height: number };
  runs: number;
  recorded: string;
  units: Record<string, string>;
  grid: number;
  groups: Record<string, string[]>;
  events: Record<string, number | null>;
  tolerance: Record<string, number>;
  frames: { t: number; values: Values }[];
};

const spreadOf = (values: number[]) =>
  values.length ? Math.max(...values) - Math.min(...values) : 0;
const mean = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;

/** Aggregates recorded runs: each group's runs are aligned on their onsets,
 *  then averaged frame by frame. A frame's `t` is ms from each group's own
 *  onset (the motion's start; so the grid falls on the frames a Web
 *  Animation draws), and the onset's time from the input is
 *  `events["onset.<group>"]`. In a frame, a value is null where no run
 *  had its element, and left out where it is not part of the motion yet,
 *  where no run drew that frame, or where the runs disagree on whether its
 *  element was there (it is not compared there). */
export function aggregate(
  strip: Strip,
  runs: Run[],
  viewport: { width: number; height: number },
): Baseline {
  const times = grid(strip.duration);
  const tolerance: Record<string, number> = {};
  const events: Record<string, number | null> = {};
  const units: Record<string, string> = { t: unitNames.ms };
  const perRun: Curve[] = runs.map(() => ({}));
  for (const [name, group] of Object.entries(strip.groups)) {
    const keys = Object.keys(group.values);
    const clockedRuns = runs.map((run) => clocked(run, group));
    const spans = clockedRuns.map((run, r) => {
      const span = startWindow(run, name, group);
      if (!span)
        throw new Error(`${strip.name}: run ${r + 1} shows no ${name} motion`);
      return span;
    });
    // First against the first run at the end of its window, then twice
    // against the mean of all runs.
    let onsets = spans.map((span) => span.guess);
    let onset = onsets[0];
    let reference = resample(
      clockedRuns[0],
      keys,
      times,
      0,
      onsets[0],
      group.clock,
    );
    for (let pass = 0; pass < 3; pass++) {
      onsets = clockedRuns.map((run, r) =>
        fit(run, group.values, reference, times, 0, spans[r]),
      );
      onset = round(mean(onsets));
      const curves = clockedRuns.map((run, r) =>
        resample(run, keys, times, 0, onsets[r], group.clock),
      );
      reference = {};
      for (const k of keys)
        reference[k] = times.map((_, i) => combine(curves.map((c) => c[k][i])));
      curves.forEach((c, r) => Object.assign(perRun[r], c));
    }
    // Where the motion sits on the grid (ms from the input), and its
    // latency, the timing value: from the first frame that showed the input
    // to the motion's start.
    events[`onset.${name}`] = onset;
    units[`onset.${name}`] = unitNames.ms;
    const latency = onsets.map((at, r) => at - runs[r].zero);
    events[`latency.${name}`] = round(mean(latency));
    tolerance[`latency.${name}`] = round(spreadOf(latency) + base.ms);
    units[`latency.${name}`] = unitNames.ms;
    for (const [k, unit] of Object.entries(group.values)) {
      units[k] = unitNames[unit];
      const spread = Math.max(
        0,
        ...times.map((_, i) => {
          const at = perRun.map((c) => c[k][i]);
          const numbers = at.filter((v) => typeof v === "number");
          return combine(at) === undefined ? 0 : spreadOf(numbers);
        }),
      );
      tolerance[k] = round(spread + base[unit]);
    }
  }
  for (const name of [
    ...(strip.events ?? []),
    ...Object.keys(runs[0].events).filter((k) => !strip.events?.includes(k)),
  ]) {
    const at = runs.map((run) => run.events[name] ?? null);
    units[name] = unitNames.ms;
    if (at.every((v) => v !== null)) {
      events[name] = round(mean(at as number[]));
      tolerance[name] = round(spreadOf(at as number[]) + base.ms);
    } else if (at.every((v) => v === null)) events[name] = null;
  }
  const groups = Object.fromEntries(
    Object.entries(strip.groups).map(([g, group]) => [
      g,
      Object.keys(group.values),
    ]),
  );
  const frames = times.map((t, i) => {
    const values: Values = {};
    for (const keys of Object.values(groups))
      for (const k of keys) {
        const point = combine(perRun.map((c) => c[k][i]));
        if (point !== undefined) values[k] = roundOrNull(point);
      }
    return { t, values };
  });
  return {
    strip: strip.name,
    viewport,
    runs: runs.length,
    recorded: new Date().toISOString().slice(0, 10),
    units,
    grid: FRAME,
    groups,
    events,
    tolerance,
    frames,
  };
}

/** The baseline as a file: one line per frame. */
export function formatBaseline(baseline: Baseline) {
  const { frames, ...head } = baseline;
  const top = JSON.stringify(head, null, 1).replace(/\n}$/, "");
  const lines = frames.map((f) => ` ${JSON.stringify(f)}`).join(",\n");
  return `${top},\n "frames": [\n${lines}\n ]\n}\n`;
}

/** The run in the evidence writer's form: columns, no repeated keys. */
export function compactRun(run: Run) {
  const keys = Object.keys(run.frames[0]?.values ?? {});
  return {
    columns: ["t", "p", ...keys],
    frames: run.frames.map((f) => [
      f.t,
      f.p ?? null,
      ...keys.map((k) => f.values[k]),
    ]),
    zero: run.zero,
    anchors: run.anchors,
    events: run.events,
  };
}

/** A run back from its evidence form. */
export function expandRun(compact: ReturnType<typeof compactRun>): Run {
  const keys = compact.columns.slice(2);
  return {
    frames: compact.frames.map(([t, p, ...values]) => ({
      t: t as number,
      p: p ?? undefined,
      values: Object.fromEntries(keys.map((k, i) => [k, values[i]])),
    })),
    zero: compact.zero,
    anchors: compact.anchors,
    events: compact.events,
  };
}

// The diff.

/** Every drift of `run` beyond the baseline's tolerance, named by strip,
 *  viewport, value and frame. */
export function diff(strip: Strip, baseline: Baseline, drawn: Run): string[] {
  const where = `${baseline.strip} at ${baseline.viewport.width}`;
  const failures: string[] = [];
  const times = baseline.frames.map((f) => f.t);
  // Timing tolerance: the recorded spread plus one frame of this replay,
  // the larger of 16.7 ms and the run's median frame interval (its drawn
  // frames after the input), since a timing value is read off frames.
  const intervals = drawn.frames
    .filter((f) => f.t > 0)
    .map((f, i, all) => (i ? f.t - all[i - 1].t : 0))
    .slice(1)
    .sort((a, b) => a - b);
  const frame = round(
    Math.max(FRAME, intervals.length ? intervals[intervals.length >> 1] : 0),
  );
  const timing = (recorded: number) => round(recorded - base.ms + frame);
  const timingRule = (recorded: number) =>
    `± ${timing(recorded)} ms (spread ${round(recorded - base.ms)} + this run's frame ${frame})`;
  let first:
    | { name: string; latency: number; expected: number; recorded: number }
    | undefined;
  for (const [name, group] of Object.entries(strip.groups)) {
    const keys = Object.keys(group.values);
    const onset = baseline.events[`onset.${name}`];
    if (onset === null || onset === undefined) {
      failures.push(`${where}: the baseline has no onset for ${name}`);
      continue;
    }
    const run = clocked(drawn, group);
    const span = startWindow(run, name, group);
    if (!span) {
      failures.push(`${where}: no ${name} motion (${keys.join(", ")})`);
      continue;
    }
    const reference: Curve = {};
    for (const k of keys)
      reference[k] = baseline.frames.map((f) =>
        k in f.values ? f.values[k] : undefined,
      );
    const at = fit(run, group.values, reference, times, 0, span);
    // The time from the input to a motion's first frame follows the deck's
    // content, so it is not compared (owner, 2026-11-21). Each group's start
    // relative to the strip's first group is: that keeps the stagger and the
    // order between a strip's parts.
    const latency = round(at - drawn.zero);
    const expected = baseline.events[`latency.${name}`]!;
    const recorded = baseline.tolerance[`latency.${name}`];
    if (!first) first = { name, latency, expected, recorded };
    else {
      const shift = round(latency - first.latency);
      const want = round(expected - first.expected);
      const allowed = round(timing(recorded) + (first.recorded - base.ms));
      if (round(Math.abs(shift - want)) > allowed)
        failures.push(
          `${where}: ${name} starts ${shift} ms after ${first.name}, baseline ${want} ± ${allowed} ms`,
        );
    }
    const curve = resample(run, keys, times, 0, at, group.clock);
    for (const [k, unit] of Object.entries(group.values)) {
      const tolerance = baseline.tolerance[k];
      baseline.frames.forEach((frame, i) => {
        if (!(k in frame.values)) return;
        const b = frame.values[k];
        const r = curve[k][i];
        if (r === undefined) return;
        const label = `${where}: ${k} at frame ${i} (t ${frame.t} ms)`;
        if (b !== null && r !== null) {
          if (round(Math.abs(r - b)) > tolerance)
            failures.push(
              `${label}: ${round(r)}, baseline ${b} ± ${tolerance} (${unit})`,
            );
          return;
        }
        if (b === r) return;
        // Appearing or vanishing a frame early or late is within timing; the
        // onset's own frame borders the time before the motion.
        const near =
          i === 0 ||
          [i - 1, i + 1].some((j) => {
            const f = baseline.frames[j];
            return (
              f && (!(k in f.values) || (f.values[k] === null) !== (b === null))
            );
          });
        if (!near)
          failures.push(
            `${label}: ${r === null ? "absent" : round(r)}, baseline ${b === null ? "absent" : b}`,
          );
      });
    }
  }
  for (const [name, b] of Object.entries(baseline.events)) {
    if (name.startsWith("onset.") || name.startsWith("latency.")) continue;
    const r = drawn.events[name] ?? null;
    if (b === null || r === null) {
      if (b !== r)
        failures.push(
          `${where}: event ${name} ${r ?? "missing"}, baseline ${b ?? "missing"}`,
        );
      continue;
    }
    const recorded = baseline.tolerance[name];
    if (round(Math.abs(r - b)) > timing(recorded))
      failures.push(
        `${where}: event ${name} ${r} ms, baseline ${b} ${timingRule(recorded)}`,
      );
  }
  return failures;
}

/** Under reduced motion: every value, over every frame sampled (the input
 *  and what led up to it), only ever shows its first or its last state (no
 *  intermediate frame), and something did change, unless the strip stays
 *  still under reduced motion. */
export function jumps(strip: Strip, run: Run, width: number): string[] {
  const where = `${strip.name} at ${width}, reduced motion`;
  const failures: string[] = [];
  const frames = run.frames;
  if (frames.length < 5)
    return [`${where}: only ${frames.length} frames sampled`];
  let moved = false;
  for (const group of Object.values(strip.groups))
    for (const k of Object.keys(group.values)) {
      const all = frames.map((f) => f.values[k] ?? null);
      const shown = all.filter((v): v is number => v !== null);
      if (new Set(all.map((v) => v === null)).size > 1) moved = true;
      if (!shown.length) continue;
      const first = shown[0];
      const last = shown.at(-1)!;
      if (Math.abs(first - last) > 0.5) moved = true;
      frames.forEach((f, i) => {
        const v = f.values[k];
        if (v === null || v === undefined) return;
        if (Math.abs(v - first) > 0.5 && Math.abs(v - last) > 0.5)
          failures.push(
            `${where}: ${k} at frame ${i} (t ${f.t} ms) is ${v}, between ${first} and ${last}`,
          );
      });
    }
  if (strip.stillWhenReduced && moved)
    failures.push(`${where}: something moved`);
  if (!strip.stillWhenReduced && !moved)
    failures.push(`${where}: nothing changed`);
  return failures;
}
