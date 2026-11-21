"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ViewTransition,
  addTransitionType,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type ViewTransitionInstance,
} from "react";
import { endArrival, watchArrival } from "./arrival";
import { PanelDirection } from "./panel-switch";
import { holdPresses } from "./press-hold";
import {
  motionTokens,
  springCss,
  staggerDelay,
  useMotionTokens,
} from "./motion";
import {
  createRouteHistory,
  routeAxisBetween,
  type RouteIntent,
} from "./route-map";

export type { RouteIntent };

// Route transitions.
// The leaving page is a View Transition snapshot that moves out toward the
// departing side; the entering page has no snapshot, and each of its top-level
// sections enters by itself, so glass blur stays live.

export type RouteDirection = "forward" | "back";
/** Transition types for `<Link transitionTypes>` and `router.push`. */
export const routeTransitionTypes = {
  forward: "deck-forward",
  back: "deck-back",
} as const satisfies Record<RouteDirection, string>;

// The direction of the navigation in flight. Sections read it as they mount;
// the browser's own back and forward buttons carry no transition type.
let direction: RouteDirection = "forward";
// Sideways, except between Settings pages (up and down) and to or from a page
// that opens on top (in depth; route-map.ts). Read with `direction`.
let axis: "x" | "y" | "depth" = "x";
const translate = (offset: number) =>
  `translate${axis === "y" ? "Y" : "X"}(${offset}px)`;
/** In depth, whichever page arrives rises into place and whichever leaves
    sinks, a little and fading (if one rises the other
    sinks): the nudge down and the presence scale, so the direction never
    matters. */
const sunk = (t: {
  distance: { nudge: number };
  scale: { presence: number };
}) => `translateY(${t.distance.nudge}px) scale(${t.scale.presence})`;
let navigated = false;
// The entrance a navigation has armed, for its destination (null: in-page steps,
// which name none), and when it started: the entering page's first painted frame
// (one entrance clock).
let armed: { path: string | null; at: number } | null = null;
let entranceStart: number | null = null;
function arm(path: string | null) {
  armed = { path, at: performance.now() };
  entranceStart = null;
}
/** Past this, a navigation's destination never showed a section: forget it, so a
    section mounting much later (a tab panel, a list item) takes no entrance. */
const ARMED_MS = 15_000;
/** Whether a section mounting on `path` now is part of the page's entrance. */
function entering(path: string | null) {
  if (!armed) return false;
  if (performance.now() - armed.at > ARMED_MS) armed = null;
  else if (!armed.path || !path || armed.path === path) return true;
  return false;
}
/** About how long `spring.surface` takes to settle, so how long a page is still
    arriving after its last skeleton (arrival.ts, ListPop). */
export const ENTRY_WINDOW_MS = 600;
// An intent a RouteLink, Button or useRouteNavigate declared for the next
// navigation; it wins over the route map for that one navigation.
let chosen: RouteIntent | null = null;

/** The direction of the route change in flight. */
export function routeDirection() {
  return direction;
}

// Every route change's direction is taken here, so returning mirrors it.
const history = createRouteHistory();
// A link click takes its direction before a RouteLink's own click handler
// may name one; that handler then corrects it.
let clicked = false;
// The path a click or useRouteNavigate already took a direction for, so its
// `navigate` event (fired only once Next commits the new page) is not taken
// twice.
let taken: string | null = null;
// The path before the current navigation, for popstate without the API.
let here = "";
// Browser back and forward keep their own scroll; a new page starts at top.
let traversing = false;

/** Declares what the next route change does:
    `complete` (forward) or `close` (back), over the route map. */
export function setRouteIntent(intent: RouteIntent) {
  endArrival();
  navigated = true;
  if (!armed) arm(null);
  if (clicked) {
    // The link's click was already taken by the capture; correct it.
    clicked = false;
    direction = history.retake(intent);
    return;
  }
  chosen = intent;
}

/** Takes the direction for a navigation from `from` to `href`. */
function take(from: string, href: string, traverse = false) {
  const to = new URL(href, location.href);
  const intent = chosen ?? undefined;
  chosen = null;
  if (to.origin !== location.origin) return;
  here = to.pathname;
  taken = to.pathname;
  const next = history.take(from, to.pathname + to.search, {
    intent,
    traverse,
  });
  if (!next) return;
  endArrival();
  direction = next;
  axis = routeAxisBetween(from, to.pathname);
  navigated = true;
  arm(to.pathname);
}

/** A route change outside Next's router (Storybook, in-page steps). */
export function startRouteTransition(next: RouteDirection, update: () => void) {
  // In-page steps fire no navigation, so nothing is left chosen for the next.
  endArrival();
  direction = next;
  axis = "x";
  navigated = true;
  arm(null);
  startTransition(() => {
    addTransitionType(routeTransitionTypes[next]);
    update();
  });
}

type NavigateEvent = Event & {
  navigationType: string;
  destination: { url: string; index: number };
};
type NavigationLike = EventTarget & { currentEntry: { index: number } | null };

/**
 * Every navigation takes its direction from the
 * direction rules (route-map.ts): browser back and forward mirror the way
 * there; a declared intent wins (complete forward, close back); else the
 * map: opening a page on top is forward, deeper is forward, up is back, and
 * destinations go by menu order. Mounted once in the root layout.
 */
export function RouteDirectionTracker() {
  useEffect(() => watchArrival(ENTRY_WINDOW_MS), []);
  useEffect(holdPresses, []);
  useEffect(() => {
    here = location.pathname;
    const navigation = (window as Window & { navigation?: NavigationLike })
      .navigation;
    // Sections read the direction as they first render, and Next renders a
    // pushed page before it updates the URL, so a link's direction is taken
    // from its click. Capture runs before a RouteLink's own click.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link =
        event.target instanceof Element &&
        event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || (link.target && link.target !== "_self")) return;
      chosen = null;
      traversing = false;
      take(location.pathname, link.href);
      clicked = true;
      setTimeout(() => {
        clicked = false;
      });
    };
    // Back and forward fire `navigate` before the page renders; a push no
    // click or useRouteNavigate took is taken late, as well as it can be.
    const onNavigate = (event: Event) => {
      const { navigationType, destination } = event as NavigateEvent;
      const to = new URL(destination.url).pathname;
      if (navigationType !== "traverse" && taken === to) {
        taken = null;
        return;
      }
      if (navigationType === "traverse") chosen = null;
      traversing = navigationType === "traverse";
      take(location.pathname, destination.url, traversing);
      taken = null;
    };
    // Without the Navigation API, traversals once the URL has changed.
    const onPopState = () => {
      if (!navigation) take(here, location.href, true);
    };
    navigation?.addEventListener("navigate", onNavigate);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);
    return () => {
      navigation?.removeEventListener("navigate", onNavigate);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}

/** A Link that may declare its intent: `complete` (e.g. a link at
    the end of a flow) or `close`. Without one the route map decides. */
export function RouteLink({
  intent,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  intent?: RouteIntent;
}) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (intent) setRouteIntent(intent);
        onClick?.(event);
      }}
    />
  );
}

/** `router.push` that may declare its intent (`complete` after a flow ends,
    `close` for a page's ×); without one the route map decides. */
export function useRouteNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string, { intent }: { intent?: RouteIntent } = {}) => {
      if (intent) chosen = intent;
      take(location.pathname, href);
      router.push(href, { transitionTypes: [routeTransitionTypes[direction]] });
    },
    [router],
  );
}

/**
 * Back through the browser's history to the page you came from, as its own Back
 * does: that page keeps its address and scroll, and the
 * way back mirrors the way there. Loaded directly, there is no such page, so it
 * closes to `fallback` instead.
 */
export function useRouteBack(fallback: string) {
  const router = useRouter();
  const navigate = useRouteNavigate();
  return useCallback(() => {
    const { navigation } = window as Window & {
      navigation?: { canGoBack: boolean };
    };
    if (navigation?.canGoBack ?? navigated) router.back();
    else navigate(fallback, { intent: "close" });
  }, [fallback, navigate, router]);
}

type Pseudo = { animate: Element["animate"] };
type Instance = ViewTransitionInstance & { old: Pseudo };
const cubicBezier = (ease: readonly number[]) =>
  `cubic-bezier(${ease.join(", ")})`;

/**
 * Wraps a page's content. When the route changes, the leaving page's snapshot
 * moves `distance.page` toward the departing side and fades on `exit`. It
 * never animates on enter or update: the page's PageSections enter instead.
 * A part of a page that swaps inside a layout (a layout's sections) keys one on its
 * path, and `startAt` says where its content starts.
 */
export function PageTransition({
  startAt,
  children,
}: {
  startAt?: () => number;
  children: ReactNode;
}) {
  const t = useMotionTokens();
  // A page opened from a scrolled one starts at the top,
  // in the commit, before anything measures it. Next otherwise scrolls the
  // new segment's top into view after the commit, and that late scroll
  // retargeted anything that follows the scroll position.
  useLayoutEffect(() => {
    if (!navigated || traversing) return;
    const top = startAt?.() ?? 0;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
    // Runs once, as the part mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const exit = t.exit as { duration: number; ease?: readonly number[] };
  return (
    <ViewTransition
      default="none"
      exit="deck-page"
      onExit={(instance, types) => {
        const back = types.includes(routeTransitionTypes.back)
          ? true
          : types.includes(routeTransitionTypes.forward)
            ? false
            : direction === "back";
        const animation = (instance as Instance).old.animate(
          [
            { opacity: 1, transform: "none" },
            {
              opacity: 0,
              transform:
                axis === "depth"
                  ? sunk(t)
                  : translate((back ? 1 : -1) * t.distance.page),
            },
          ],
          {
            duration: exit.duration * 1000,
            easing: exit.ease ? cubicBezier(exit.ease) : "linear",
            fill: "forwards",
          },
        );
        return () => animation.cancel();
      }}
    >
      {children}
    </ViewTransition>
  );
}

/** A token spring as WAAPI timing, the same curve motion.css runs. */
const [, surfaceMs, surfaceEase] = /^([\d.]+)ms ([\s\S]+)$/.exec(
  springCss(motionTokens.spring.surface),
)!;

/** What fades with a section: itself, or each outermost blurred element. */
function outermostGlass(section: HTMLElement) {
  const blurred = [...section.querySelectorAll<HTMLElement>("*")].filter(
    (node) => getComputedStyle(node).backdropFilter !== "none",
  );
  // The outermost ones: a blur inside another fades with it.
  return blurred.filter(
    (node) => !blurred.some((outer) => outer !== node && outer.contains(node)),
  );
}

/**
 * A top-level section of a page (a card, a header, a list). After a route
 * change it enters from the side opposite the leaving page on
 * `spring.surface`, its fade on `fade`, `index` places it in the stagger.
 * The slide is a transform, which is safe above glass; the fade is not.
 * By default the fade is on this element, so it must be the
 * glass itself or hold no glass. With `fade="glass"` (glass composites such
 * as a row of glass tiles or a glass list) the section only slides, and each
 * outermost descendant with a backdrop blur fades itself instead. The first
 * page load does not animate, and nothing around it does until it has arrived
 * (arrival.ts).
 *
 * One entrance clock: one clock per entrance, started
 * on the entering page's first painted frame. Every section's slide and fade is
 * a Web Animation seeked to that clock, so one mounting late (content replacing
 * its skeleton) joins at the x and fade it would already have reached, with the
 * curve's velocity. Past its own end it simply is in place. A page whose first
 * frame comes late (Settings' took 250ms after mounting) still shows it all.
 */
export function PageSection({
  index = 0,
  fade = "self",
  ...props
}: ComponentProps<typeof motion.div> & {
  index?: number;
  fade?: "self" | "glass";
}) {
  const t = useMotionTokens();
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const delay = staggerDelay(index, t) * 1000;
  const duration = Number(surfaceMs);
  // Decided in the render, so a child inside sees it from its own first
  // effect, which runs before this section's. Reduced motion starts in place.
  // A section's card switches its pages by its own slide (SectionCard):
  // a section arriving in it after a switch does not enter
  // a second time.
  const switched = useContext(PanelDirection) !== 0;
  const [moving, setMoving] = useState(() => {
    if (switched || !t.distance.page || !entering(path)) return false;
    return (
      entranceStart === null ||
      performance.now() - entranceStart < delay + duration
    );
  });
  useLayoutEffect(() => {
    const section = ref.current;
    if (!section || !moving) return;
    const from =
      axis === "depth"
        ? sunk(t)
        : translate((direction === "back" ? -1 : 1) * t.distance.page);
    const fadeTiming = t.fade as {
      duration: number;
      ease?: readonly number[];
    };
    const animations = [
      section.animate([{ transform: from }, { transform: "none" }], {
        duration,
        delay,
        easing: surfaceEase,
        fill: "backwards",
      }),
      // To the node's own opacity (an implicit end), so a muted card
      // (mute.css) fades in to its muted look, not to 1 and then a jump.
      ...(fade === "glass" ? outermostGlass(section) : [section]).map((node) =>
        node.animate([{ opacity: 0, offset: 0 }], {
          duration: fadeTiming.duration * 1000,
          delay,
          easing: fadeTiming.ease ? cubicBezier(fadeTiming.ease) : "linear",
          fill: "backwards",
        }),
      ),
    ];
    const seek = () =>
      animations.forEach((animation) => {
        animation.currentTime = performance.now() - entranceStart!;
      });
    let frame = 0;
    if (entranceStart !== null) seek();
    else {
      // Held at the start until the page's first frame.
      animations.forEach((animation) => animation.pause());
      frame = requestAnimationFrame(() => {
        entranceStart ??= performance.now();
        seek();
        animations.forEach((animation) => animation.play());
      });
    }
    let live = true;
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => live && setMoving(false))
      .catch(() => {});
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
    };
    // Runs once, on the section's first layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      {...props}
      ref={ref}
      data-page-section=""
      data-page-entering={moving ? "" : undefined}
    />
  );
}
