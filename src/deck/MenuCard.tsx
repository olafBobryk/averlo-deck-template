"use client";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  usePresence,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { HeadingText } from "@/motion/page-header/heading-text";
import {
  useMotionTokens,
  type MotionTokens,
} from "@/motion/motion";
import { Button } from "@/components/ui/primitives/Button";
import { DeckIcon } from "./icon";
import { MenuDropdown } from "./menu-dropdown";
import { morph, type Box } from "@/motion/popup-motion";
import { Downloads, Overview } from "./Overview";
import { langNames, langs, type Lang } from "./langs";
import { ui } from "./model";
import styles from "./menu.module.css";
import controls from "./menu-controls.module.css";
import { SlideList } from "./slide-list";
import { useDeck } from "./version";

/** Contract between the deck and the menu: the props and the html
 *  attributes below.
 *
 *  - Renders the menu button (bottom-right, in the footer's slot) and the card.
 *  - Owns the M, O and Esc keys and outside clicks.
 *  - While open, sets `html[data-menu="popup" | "expanded"]`; while expanded
 *    also `html[data-menu-expanded]`. The deck ignores slide keys while
 *    `data-menu` is set, and deck.module.css sinks the slide and moves the
 *    footer out under `data-menu-expanded`.
 *  - Overview thumbnails render `<SlideView slide lang still />`. */
export type MenuCardProps = {
  index: number;
  lang: Lang;
  fullscreen: boolean;
  onGo: (index: number) => void;
  onLang: (lang: Lang) => void;
  onFullscreen: () => void;
};

type View = "popup" | "expanded";

/** The card's geometry:
 *  - popup: its bottom-right corner on the menu button's, so it opens upward
 *    out of the button; 560 wide and 640 tall at most, 16 from the viewport's
 *    left and 40 from its top at least;
 *  - expanded: inset 40 on every side.
 *  `inner` is the content's width and `offset` its start inside the card's
 *  padding: in the popup the card's inside less an 8 px scrollbar gutter,
 *  flush left; expanded, the inside less 12 a side, centred (the overview's
 *  grid takes all of it). `raise` and `side` are the card's distance from
 *  the viewport's bottom and right edges.
 *
 *  On a portrait screen the popup spans the
 *  viewport less 12 on either side, its bottom still on the button's, and
 *  expanded is inset 12, so it is never narrower than the popup. */
const EDGE = 1 + 24; // border + space-24 padding
const VIEWPORT_INSET = 12; // the viewport's space-12 either side
const SCROLLBAR_GUTTER = 8;
const POPUP = { width: 560, height: 640, side: 16, top: 40 };
const EXPANDED_INSET = 40;
const PHONE_EDGE = 12;
// The phone layout: portrait and narrow.
const PORTRAIT = "(orientation: portrait) and (max-width: 699px)";

function geometry(view: View, home: Box) {
  const portrait = matchMedia(PORTRAIT).matches;
  if (view === "expanded") {
    const inset = portrait ? PHONE_EDGE : EXPANDED_INSET;
    const width = Math.max(0, innerWidth - 2 * inset);
    return {
      width,
      height: Math.max(0, innerHeight - 2 * inset),
      raise: inset,
      side: inset,
      inner: Math.max(0, width - 2 * (EDGE + VIEWPORT_INSET)),
      offset: VIEWPORT_INSET,
    };
  }
  const side = portrait
    ? PHONE_EDGE
    : Math.max(0, innerWidth - home.left - home.width);
  const raise = Math.max(0, innerHeight - home.top - home.height);
  const width = portrait
    ? Math.max(0, innerWidth - 2 * PHONE_EDGE)
    : Math.max(0, Math.min(POPUP.width, innerWidth - side - POPUP.side));
  return {
    width,
    height: Math.max(
      0,
      Math.min(POPUP.height, innerHeight - raise - POPUP.top),
    ),
    raise,
    side,
    inner: Math.max(0, width - 2 * EDGE - SCROLLBAR_GUTTER),
    offset: 0,
  };
}

const boxOf = (element: Element | null): Box => {
  const r = element?.getBoundingClientRect();
  return r
    ? { left: r.left, top: r.top, width: r.width, height: r.height }
    : { left: innerWidth - 50, top: innerHeight - 50, width: 34, height: 34 };
};

export function MenuCard({
  index,
  lang,
  fullscreen,
  onGo,
  onLang,
  onFullscreen,
}: MenuCardProps) {
  // What was asked for; null is closed. The card stays (`present`) until it
  // has gone back into the button, showing the form it closed from.
  const [view, setView] = useState<View | null>(null);
  const [shown, setShown] = useState<View>("popup");
  if (view && view !== shown) setShown(view);
  const [present, setPresent] = useState(false);
  if (view !== null && !present) setPresent(true);
  // The button's box at rest (the footer moves it out while expanded).
  const [home, setHome] = useState<Box | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const open = view !== null;

  // Every open, close, Expand and Minimize goes through here. Opening from
  // closed measures the button where it rests.
  const asked = useRef<View | null>(null);
  const ask = useCallback((next: (current: View | null) => View | null) => {
    const from = asked.current;
    const target = next(from);
    if (target === from) return;
    if (
      from === null &&
      !document.documentElement.hasAttribute("data-menu-expanded")
    )
      setHome(boxOf(button.current));
    asked.current = target;
    setView(target);
  }, []);

  // html[data-menu] and html[data-menu-expanded] (the contract above).
  useLayoutEffect(() => {
    if (view === null) return;
    const root = document.documentElement;
    root.dataset.menu = view;
    if (view === "expanded") root.dataset.menuExpanded = "";
    return () => {
      delete root.dataset.menu;
      delete root.dataset.menuExpanded;
    };
  }, [view]);

  // Focus moves into the card as it opens and back to the button as it closes.
  const was = useRef(open);
  useEffect(() => {
    const before = was.current;
    was.current = open;
    if (!before && open) card.current?.focus({ preventScroll: true });
    if (before && !open) button.current?.focus({ preventScroll: true });
  }, [open]);

  // M toggles the popup; O opens it expanded (from the popup it expands, from
  // expanded it closes); Esc closes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      // The downloads' dropdown has its own keys: Esc closes it first.
      if (
        event.defaultPrevented ||
        target?.closest(
          "input, textarea, select, [contenteditable], [data-menu-downloads]",
        )
      )
        return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === "m") ask((current) => (current === null ? "popup" : null));
      else if (key === "o")
        ask((current) => (current === "expanded" ? null : "expanded"));
      else if (key === "Escape" && document.documentElement.dataset.menu)
        ask(() => null);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask]);

  // A press outside the card closes it. That press does nothing else: its
  // mousedown (focus) and click (the deck's click-to-advance) are swallowed.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (card.current?.contains(target) || button.current?.contains(target))
        return;
      // While the downloads' dropdown is open, a press closes it alone.
      if (document.querySelector("[data-menu-downloads][data-state='open']"))
        return;
      ask(() => null);
      const swallow = (next: Event) => {
        next.preventDefault();
        next.stopPropagation();
      };
      const options = { capture: true, once: true } as const;
      window.addEventListener("mousedown", swallow, options);
      window.addEventListener("click", swallow, options);
      window.setTimeout(() => {
        window.removeEventListener("mousedown", swallow, true);
        window.removeEventListener("click", swallow, true);
      }, 1000);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [open, ask]);

  const go = (target: number) => {
    onGo(target);
    ask(() => null);
  };

  return (
    <>
      <Button
        ref={button}
        variant="outline"
        size="icon-sm"
        aria-label={ui.menu[lang]}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${styles.trigger} ${controls.trigger}`}
        // Out of sight while the card it opens is up; the card fades it back
        // in as it closes.
        data-covered={present || undefined}
        onClick={() => ask((current) => (current === null ? "popup" : null))}
      >
        <DeckIcon name="ellipsis" />
      </Button>
      {present &&
        home &&
        createPortal(
          <Card
            cardRef={card}
            button={button}
            home={home}
            onHome={setHome}
            view={shown}
            open={open}
            onClosed={() => setPresent(false)}
            onView={(next) => ask(() => next)}
            onClose={() => ask(() => null)}
            index={index}
            lang={lang}
            fullscreen={fullscreen}
            onGo={onGo}
            onChoose={go}
            onLang={onLang}
            onFullscreen={onFullscreen}
          />,
          document.body,
        )}
    </>
  );
}

function Card({
  cardRef,
  button,
  home,
  onHome,
  view,
  open,
  onClosed,
  onView,
  onClose,
  index,
  lang,
  fullscreen,
  onGo,
  onChoose,
  onLang,
  onFullscreen,
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  button: RefObject<HTMLButtonElement | null>;
  home: Box;
  onHome: (box: Box) => void;
  view: View;
  open: boolean;
  onClosed: () => void;
  onView: (view: View) => void;
  onClose: () => void;
  index: number;
  lang: Lang;
  fullscreen: boolean;
  onGo: (index: number) => void;
  onChoose: (index: number) => void;
  onLang: (lang: Lang) => void;
  onFullscreen: () => void;
}) {
  const t = useMotionTokens();
  const { slides } = useDeck();
  const reduced = (t.spring.surface as { duration?: number }).duration === 0;
  const row = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const expanded = view === "expanded";
  // No Fullscreen control where the browser cannot do it (iPhone Safari).
  // The card only ever mounts in the browser, after
  // the menu is opened, so this read cannot differ from a server render.
  const [canFullscreen] = useState(() => document.fullscreenEnabled);

  // Expand and Minimize move this one card's bounds on the surface spring;
  // reduced motion jumps. The content does not follow: it takes the new
  // form's width at once and the card's edge clips it while it resizes, so
  // it never re-wraps.
  const start = geometry(view, home);
  const width = useMotionValue(start.width);
  const height = useMotionValue(start.height);
  const raise = useMotionValue(start.raise);
  const side = useMotionValue(start.side);
  // A resize re-renders, so the content's width follows the screen.
  const [, refit] = useReducer((n: number) => n + 1, 0);
  const placed = useRef(view);
  useEffect(() => {
    if (placed.current === view) return;
    placed.current = view;
    const go = geometry(view, home);
    const moves = [
      animate(width, go.width, t.spring.surface),
      animate(height, go.height, t.spring.surface),
      animate(raise, go.raise, t.spring.surface),
      animate(side, go.side, t.spring.surface),
    ];
    return () => moves.forEach((move) => move.stop());
  }, [view, home, t, width, height, raise, side]);
  useEffect(() => {
    const fit = () => {
      let box = home;
      if (!document.documentElement.hasAttribute("data-menu-expanded")) {
        box = boxOf(button.current);
        onHome(box);
      }
      const go = geometry(placed.current, box);
      width.jump(go.width);
      height.jump(go.height);
      raise.jump(go.raise);
      side.jump(go.side);
      refit();
    };
    // Turning the screen re-places it the same way.
    const turn = matchMedia(PORTRAIT);
    window.addEventListener("resize", fit);
    turn.addEventListener("change", fit);
    return () => {
      window.removeEventListener("resize", fit);
      turn.removeEventListener("change", fit);
    };
  }, [home, onHome, button, width, height, raise, side]);

  // Open and close: popup-motion.ts's morph, from the menu button's box. A
  // change of mind mid-way reverses the running
  // clip, and the close's fades (fadeHome), from where they are; the card
  // unmounts once it is back in the button.
  const morphing = useRef<{
    direction: "in" | "out";
    runs: Animation[];
    /** The button's fade in; it outlives the card, so it is not a run. */
    trigger?: Animation;
  }>(null);
  const shut = useRef(!open);
  useLayoutEffect(() => {
    shut.current = !open;
    const el = cardRef.current;
    if (!el || reduced) {
      if (!open) onClosed();
      return;
    }
    const direction = open ? "in" : "out";
    const current = morphing.current;
    if (
      current &&
      current.direction !== direction &&
      current.runs.some((run) => run.playState === "running")
    ) {
      // Closed while it was still opening, the close's fades start here,
      // timed to where the reversed clip will end.
      const fresh = direction === "out" && !current.trigger;
      const clip = current.runs[0]!;
      current.runs.forEach((run) => run.reverse());
      current.trigger?.reverse();
      current.direction = direction;
      if (fresh) {
        const fades = fadeHome(
          el,
          button.current,
          Number(clip.currentTime ?? 0),
          t,
        );
        current.runs.push(...fades.runs);
        current.trigger = fades.trigger;
      }
    } else {
      current?.runs.forEach((run) => run.cancel());
      current?.trigger?.cancel();
      const all = () => [
        ...el.getAnimations(),
        ...(row.current?.getAnimations() ?? []),
      ];
      const before = new Set(all());
      morph(el, row.current, home, direction);
      // The clip first: a reversal reads where it is.
      const runs = all().filter((run) => !before.has(run));
      morphing.current = { direction, runs };
      if (direction === "out") {
        const fades = fadeHome(
          el,
          button.current,
          Number(runs[0]!.effect!.getComputedTiming().endTime),
          t,
        );
        runs.push(...fades.runs);
        morphing.current.trigger = fades.trigger;
      }
    }
    if (open) return;
    const runs = morphing.current!.runs;
    void Promise.all(runs.map((run) => run.finished)).then(
      () => {
        if (shut.current) onClosed();
      },
      () => {},
    );
    // Plays on open and close only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(
    () => () => morphing.current?.runs.forEach((run) => run.cancel()),
    [],
  );

  // Each form arrives on the current slide: the list or grid scrolls to it.
  useLayoutEffect(() => {
    const scroller = viewport.current;
    const current = scroller?.querySelector<HTMLElement>(
      "[data-pane]:not([inert]) [aria-current='true']",
    );
    if (!scroller || !current) return;
    const s = scroller.getBoundingClientRect();
    const c = current.getBoundingClientRect();
    if (c.top < s.top || c.bottom > s.bottom)
      scroller.scrollTop += c.top - s.top - (s.height - c.height) / 2;
    // On each form's arrival only, not as the slide changes under it.
  }, [view]);

  // Panes: the popup's menu and the overview. A swap after opening fades; the
  // one the card opened with is there at once (the clip opens it). Each pane
  // is laid out at its own form's width from its first frame.
  const form = geometry(view, home);
  // The controls' line: the popup's inside, the narrower form's.
  const line = Math.max(0, geometry("popup", home).width - 2 * EDGE);
  const [opened] = useState(view);
  const [swapped, setSwapped] = useState(false);
  if (!swapped && view !== opened) setSwapped(true);

  const header: ReactNode = (
    <header className={styles.header}>
      <HeadingText
        as="h2"
        variant="title-s"
        tone="primary"
        wordings={expanded ? ui.overview[lang] : ui.menu[lang]}
        className={styles.title}
      />
      {/* The language, where the deck has more than one. */}
      {langs.length > 1 && (
        <div className={styles.headerLanguage}>
          <MenuDropdown
            kind="listbox"
            align="end"
            options={langs.map((option) => ({
              key: option,
              value: option,
              selected: option === lang,
              content: langNames[option],
            }))}
            onChoose={(option) => onLang(option.value)}
            trigger={({ isOpen, toggleMenu, caretIcon, ref }) => (
              <Button
                ref={ref}
                variant="outline"
                size="sm"
                aria-label={`${ui.language[lang]}: ${lang.toUpperCase()}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                trailingIcon={caretIcon}
                onClick={toggleMenu}
              >
                {lang.toUpperCase()}
              </Button>
            )}
          />
        </div>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={expanded ? ui.minimize[lang] : ui.expand[lang]}
        onClick={() => onView(expanded ? "popup" : "expanded")}
      >
        <DeckIcon name={expanded ? "minimize" : "maximize"} />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={ui.close[lang]}
        onClick={onClose}
      >
        <DeckIcon name="close" />
      </Button>
    </header>
  );

  return (
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-label={expanded ? ui.overview[lang] : ui.menu[lang]}
      tabIndex={-1}
      lang={lang}
      // One card in both forms: the tests hold this node across Expand.
      data-menu-card=""
      data-view={view}
      className={styles.card}
      style={{ width, height, bottom: raise, right: side }}
    >
      {header}
      <hr className={styles.separator} />
      <div ref={viewport} data-menu-viewport="" className={styles.viewport}>
        <div data-menu-content="" className={styles.content}>
          <AnimatePresence initial={false}>
            <Pane
              key={view}
              fades={swapped}
              width={form.inner}
              offset={form.offset}
            >
              {expanded ? (
                <Overview index={index} lang={lang} onChoose={onChoose} />
              ) : (
                <Menu index={index} lang={lang} onChoose={onChoose} />
              )}
            </Pane>
          </AnimatePresence>
        </div>
      </div>
      {/* The controls row travels out of the button with the clip
          (popup-motion.ts). */}
      <div ref={row} data-menu-footer="" className={styles.controls}>
        {/* One line, never narrower
            than the popup's: while the row travels out of the button at the
            button's width, its controls stand where they will rest and the
            card's edge clips them. */}
        <div
          className={`${styles.line} ${controls.line}`}
          style={{ minWidth: line }}
        >
          {/* At an end, a control keeps its look at a muted opacity instead
            of Button's disabled fill. */}
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<DeckIcon name="chevron-left" />}
            aria-disabled={index === 0 || undefined}
            className={
              index === 0
                ? `${styles.unavailable} ${controls.iconOnly} !shrink`
                : `${controls.iconOnly} !shrink`
            }
            onClick={() => index > 0 && onGo(index - 1)}
          >
            {ui.previous[lang]}
          </Button>
          <Button
            variant="outline"
            size="sm"
            trailingIcon={<DeckIcon name="chevron-right" />}
            aria-disabled={index === slides.length - 1 || undefined}
            className={
              index === slides.length - 1
                ? `${styles.unavailable} ${controls.iconOnly} !shrink`
                : `${controls.iconOnly} !shrink`
            }
            onClick={() => index < slides.length - 1 && onGo(index + 1)}
          >
            {ui.next[lang]}
          </Button>
          {canFullscreen && (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={fullscreen}
              leadingIcon={
                <DeckIcon name="fullscreen" className={controls.phoneIcon} />
              }
              className={controls.iconOnly}
              onClick={onFullscreen}
            >
              {ui.fullscreen[lang]} <kbd className={styles.key}>F</kbd>
            </Button>
          )}
          <Downloads lang={lang} align="end" />
        </div>
      </div>
    </motion.div>
  );
}

/** A duration token (`fade`, `exit`) as Web Animation timing. */
function timing(token: MotionTokens["fade"]) {
  const { duration = 0, ease } = token as {
    duration?: number;
    ease?: readonly number[];
  };
  return {
    duration: duration * 1000,
    easing: ease ? `cubic-bezier(${ease.join(", ")})` : "linear",
  };
}

/** The close's fades around the clip, which ends `end` ms from now: the
 *  card's content fades out on
 *  `exit` at once, so nothing rides inside the shrinking card; in the clip's
 *  last `exit` the card's glass fades out, ending as the clip ends, and the
 *  menu button fades in on `fade`. The content fades item by item down to
 *  the glass it holds (`fadeItems`), and that glass drops its blur as it
 *  goes, so the card's own fade is over no backdrop filter; the card is the
 *  glass element itself. */
function fadeHome(
  card: HTMLElement,
  trigger: HTMLElement | null,
  end: number,
  t: MotionTokens,
) {
  const exit = timing(t.exit);
  const fade = timing(t.fade);
  const last = Math.max(0, end - exit.duration);
  const runs = fadeItems(card).map((item) =>
    item.animate(
      glassy(item) ? { opacity: 0, backdropFilter: "none" } : { opacity: 0 },
      { ...exit, fill: "forwards" },
    ),
  );
  runs.push(
    card.animate({ opacity: 0 }, { ...exit, delay: last, fill: "forwards" }),
  );
  return {
    runs,
    trigger: trigger?.animate([{ opacity: 0 }, { opacity: 1 }], {
      ...fade,
      delay: last,
      fill: "backwards",
    }),
  };
}

/** What a pane fades: its children, or, for a child holding glass, that
 *  child's own children, down to the glass element itself. Opacity never
 *  animates on an ancestor of a backdrop-filter element, and the language
 *  toggle is glass. */
const glassy = (element: Element) => {
  const style = getComputedStyle(element);
  return (
    (style.backdropFilter || "none") !== "none" ||
    (style.getPropertyValue("-webkit-backdrop-filter") || "none") !== "none"
  );
};
function fadeItems(root: Element): Element[] {
  return [...root.children].flatMap((child) =>
    !glassy(child) && [...child.querySelectorAll("*")].some(glassy)
      ? fadeItems(child)
      : [child],
  );
}

/** One of the card's two contents, at its own form's width from its first
 *  frame, so it never re-wraps while the card resizes. Entering after a
 *  swap, it fades in on `fade` where it will rest; leaving, it is pinned
 *  where it stood, at the width it had, and fades on `exit` while the
 *  card's edge clips it. */
function Pane({
  fades,
  width,
  offset,
  children,
}: {
  fades: boolean;
  width: number;
  offset: number;
  children: ReactNode;
}) {
  const t = useMotionTokens();
  const [present, safeToRemove] = usePresence();
  const pane = useRef<HTMLDivElement>(null);
  const items = useRef<Element[]>([]);
  useLayoutEffect(() => {
    if (!fades || !pane.current) return;
    items.current = fadeItems(pane.current);
    items.current.forEach((item) => item.setAttribute("data-pane-item", ""));
    const run = animate(items.current, { opacity: [0, 1] }, t.fade);
    return () => run.stop();
    // On arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (present || !pane.current) return;
    if (!items.current.length) items.current = fadeItems(pane.current);
    const run = animate(items.current, { opacity: 0 }, t.exit);
    void run.then(() => safeToRemove?.());
    return () => run.stop();
  }, [present, safeToRemove, t]);
  return (
    <div
      ref={pane}
      className={present ? styles.pane : `${styles.pane} ${styles.leaving}`}
      style={{ width, marginInlineStart: offset }}
      // Leaving, it is no longer there to use or to read.
      data-pane=""
      inert={!present}
      aria-hidden={!present || undefined}
    >
      {children}
    </div>
  );
}

/** The popup's content: the slides, the current one marked. The language
 *  sits in the header and the PDFs in the footer, so the list scrolls
 *  between the header's line and the footer's, on hard edges. */
function Menu({
  index,
  lang,
  onChoose,
}: {
  index: number;
  lang: Lang;
  onChoose: (index: number) => void;
}) {
  const { slides } = useDeck();
  return (
    <SlideList slides={slides} index={index} lang={lang} onChoose={onChoose} />
  );
}
