"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  PageTransition,
  startRouteTransition,
} from "@/motion/route-transition";
import { Footer } from "./Footer";
import { MenuCard } from "./MenuCard";
import { OverflowReport } from "./OverflowReport";
import { SlideView } from "./SlideView";
import type { Lang } from "./langs";
import { slides } from "./slides";
import { useSwipe } from "./swipe";
import { DeckContext } from "./version";
import { onIntroFinish } from "@/gate/intro-state";
import styles from "./deck.module.css";
import swipeStyles from "./swipe.module.css";

// boot-bootstrap.ts's handle, as the deck reads it.
type BootWindow = Window & {
  __deckBoot?: { ready: (land: () => void) => void; finish: () => void };
};

const noSubscription = () => () => {};
const clamp = (n: number, count: number) => Math.max(0, Math.min(count - 1, n));
/** MenuCard sets `html[data-menu]` while it is open (MenuCard.tsx). */
const menuOpen = () => document.documentElement.dataset.menu !== undefined;

/** The full-screen deck. URL: `/?s=<1-based slide>&lang=<language>`. M, O
 *  and Esc are MenuCard's. */
export function Deck({
  initialIndex,
  initialLang,
}: {
  initialIndex: number;
  initialLang: Lang;
}) {
  const count = slides.length;
  // While the intro plays the slides wait unmounted, so the first slide
  // mounts once, at the hand-off, and enters with the forward page step
  // under the fading intro.
  const introAtLoad = useSyncExternalStore(
    noSubscription,
    () => document.documentElement.hasAttribute("data-intro"),
    () => false,
  );
  const [released, setReleased] = useState(false);
  const holding = introAtLoad && !released;
  useEffect(
    () =>
      onIntroFinish(() =>
        startRouteTransition("forward", () => setReleased(true)),
      ),
    [],
  );
  const [index, setIndex] = useState(clamp(initialIndex, count));
  const [lang, setLang] = useState<Lang>(initialLang);
  const [fullscreen, setFullscreen] = useState(false);
  // The slide asked for last, so rapid presses land on the right one even
  // while a page step has not committed yet.
  const wanted = useRef(index);

  // A swipe scrubs the page step and, finished, hands its preview over as
  // the slide: no second page step.
  const { area, preview, control } = useSwipe({
    index,
    count,
    wanted,
    onCommit: (next) => {
      wanted.current = next;
      setIndex(next);
    },
  });

  // A slide change is the in-page page step.
  const go = useCallback(
    (target: number) => {
      if (control.dragging()) return;
      control.finish(); // a swipe still settling lands first
      const next = clamp(target, count);
      if (next === wanted.current) return;
      const back = next < wanted.current;
      wanted.current = next;
      startRouteTransition(back ? "back" : "forward", () => setIndex(next));
    },
    [control, count],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keep the URL in step, so a refresh or a shared link lands on this slide.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("s", String(index + 1));
    if (lang === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    window.history.replaceState(window.history.state, "", url);
    document.documentElement.lang = lang;
  }, [index, lang]);

  // Lift the hard-load screen once the deck is drawn.
  useEffect(() => {
    const boot = (window as BootWindow).__deckBoot;
    boot?.ready(() => boot.finish());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const key = event.key;
      if (key === "f" || key === "F") {
        toggleFullscreen();
        return;
      }
      if (menuOpen()) return;
      // Space on a focused button presses it; don't also step.
      if (key === " " && target?.closest("button, a")) return;
      // A swipe still settling lands first, so the step counts from it.
      control.finish();
      const at = wanted.current;
      if (
        key === "ArrowRight" ||
        key === "ArrowDown" ||
        key === "PageDown" ||
        (key === " " && !event.shiftKey)
      ) {
        event.preventDefault();
        go(at + 1);
      } else if (
        key === "ArrowLeft" ||
        key === "ArrowUp" ||
        key === "PageUp" ||
        (key === " " && event.shiftKey)
      ) {
        event.preventDefault();
        go(at - 1);
      } else if (key === "Home") {
        event.preventDefault();
        go(0);
      } else if (key === "End") {
        event.preventDefault();
        go(count - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [control, count, go, toggleFullscreen]);

  // A click that closes the menu (MenuCard's outside press) is not a step:
  // remember whether the menu was open when the press began, before any
  // other listener can close it (window capture runs first).
  const pressedInMenu = useRef(false);
  useEffect(() => {
    const onPointerDown = () => {
      pressedInMenu.current = menuOpen();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);
  // Click the left quarter to go back, the right three quarters to go on.
  // A drag ends in no step of its own; the click after it is swallowed. On a
  // touch screen neither steps the tap that stops or follows a scroll, nor a
  // second tap close after one (useSwipe's consumeClick).
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (control.consumeClick()) return;
    if (pressedInMenu.current || menuOpen()) return;
    control.finish();
    const box = event.currentTarget.getBoundingClientRect();
    go(
      event.clientX - box.left < box.width / 4
        ? wanted.current - 1
        : wanted.current + 1,
    );
  };

  const slide = slides[index];
  // While a finger drags, the neighbour it drags toward is a live slide
  // too, keyed as it will be once it is the slide, so finishing the step
  // keeps the same element: no remount, no entrance, no retype. In slide
  // order, so handing the slide over at the release moves neither element.
  const layers = holding
    ? []
    : preview === null || preview === index
      ? [index]
      : [Math.min(index, preview), Math.max(index, preview)];
  return (
    <DeckContext.Provider value={{ slides }}>
      <OverflowReport />
      <div className={styles.stage} aria-roledescription="slide deck">
        <div
          ref={area}
          className={`${styles.slides} ${swipeStyles.area}`}
          onClick={onClick}
        >
          {layers.map((i) => (
            <PageTransition key={slides[i].id}>
              <main
                className={styles.page}
                data-slide-index={i}
                aria-hidden={i === index ? undefined : true}
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${count}`}
              >
                <SlideView slide={slides[i]} lang={lang} />
              </main>
            </PageTransition>
          ))}
        </div>
        <Footer
          index={index}
          lang={lang}
          menu={
            <MenuCard
              index={index}
              lang={lang}
              fullscreen={fullscreen}
              onGo={go}
              onLang={setLang}
              onFullscreen={toggleFullscreen}
            />
          }
        />
        <p className="visually-hidden" aria-live="polite">
          {slide.title[lang]}
        </p>
      </div>
    </DeckContext.Provider>
  );
}
