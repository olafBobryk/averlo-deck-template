"use client";
import { useEffect, useMemo, useRef } from "react";
import { config } from "@/brand/config";
import { ProgressNavigator } from "@/questionnaire/progress-navigator";
import { InterfaceCopyContext } from "@/questionnaire/wording-context";
import { englishCopy, type InterfaceCopy } from "@/questionnaire/wording";
import type { Lang } from "./langs";
import { ui } from "./model";
import { theme } from "./TopBar";
import styles from "./navigator.module.css";

// The questionnaire's progress navigator, ported unchanged under
// src/questionnaire/, at the bottom edge of the deck in place of the
// footer's thin progress line (owner, after reviewing the merged build: "the
// bottom track becomes this track. We simply just invert the direction in
// which the mound goes"). This file reproduces the questionnaire's
// composition of it (its src/react.tsx, lines 1141–1142 at the pinned
// commit: `.inline-progress` around `ProgressNavigator`, inside `.aq` with
// its theme), and turns it upside down with template-owned CSS
// (navigator.module.css), so its mound rises from the bottom edge.
//
// The navigator raises its mound for a pointer that comes within reach of
// its track on the side the mound grows toward. It reads that side from the
// pointer's position below its own top edge, which, turned upside down, is
// the far side of the mound. So while it is turned, each mouse or pen move
// it hears is also handed to it mirrored about its own box: a pointer d
// pixels above the track reaches it as one d pixels below, exactly as the
// turned drawing shows it. Its own listener is on `window`, added when it
// mounts; the mirror's is added after it (a parent's effect runs after its
// child's), so the mirrored move is the last it hears and the one it acts
// on. The mirrored move goes to that listener alone: every listener added
// later (a press held on a control, for one) never sees it. Over the menu
// button, or while the menu is open, the mirrored move lies out of reach, so
// the mound stays down there. Touch needs no mirror: the navigator's touch
// zone reads only the finger's x.

/** Marks the mirrored moves, so the mirror never mirrors its own. */
const mirrored = new WeakSet<Event>();

/** The navigator, upside down at the bottom edge. `index` is the live slide
 *  (0-based); `onNavigate(step)` goes to slide `step` (1-based). Without
 *  `onNavigate` (print) it only shows the progress. */
export function Navigator({
  index,
  total,
  lang,
  onNavigate,
}: {
  index: number;
  total: number;
  lang: Lang;
  onNavigate?: (step: number) => void;
}) {
  const step = index + 1;
  const copy = useMemo<InterfaceCopy>(
    () => ({
      ...englishCopy,
      progress: ui.slideProgress[lang],
      goSlide: ui.goSlide[lang],
      goQuestion: ui.goSlide[lang],
      slideNumber: ui.slideNumber[lang],
      questionNumber: ui.slideNumber[lang],
    }),
    [lang],
  );

  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mirror = (event: PointerEvent) => {
      if (mirrored.has(event)) {
        // Heard by the navigator already: no listener after it hears it.
        event.stopImmediatePropagation();
        return;
      }
      if (event.pointerType === "touch") return;
      const navigator = root.current?.querySelector(".progress-navigator");
      if (!navigator) return;
      const box = navigator.getBoundingClientRect();
      if (box.height === 0) return;
      // Over the menu button, or with the menu open, the mound stays down:
      // the move reaches the navigator as one far out of its reach.
      const target = event.target instanceof Element ? event.target : null;
      const away =
        document.documentElement.dataset.menu !== undefined ||
        !!target?.closest("[data-footer-menu]");
      const copy = new PointerEvent("pointermove", {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: away
          ? box.top - 1000
          : box.top + box.bottom - event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        buttons: event.buttons,
      });
      mirrored.add(copy);
      window.dispatchEvent(copy);
    };
    window.addEventListener("pointermove", mirror, { passive: true });
    return () => window.removeEventListener("pointermove", mirror);
  }, []);

  return (
    <InterfaceCopyContext.Provider value={copy}>
      <div
        ref={root}
        className={`aq ${styles.navigator}`}
        lang={lang}
        style={theme(config.accent)}
      >
        <div className="inline-progress">
          <ProgressNavigator
            currentStep={step}
            totalSteps={total}
            includesSections
            progress={(step / total) * 100}
            disabled={!onNavigate}
            onNavigate={(to) => onNavigate?.(to)}
          />
        </div>
      </div>
    </InterfaceCopyContext.Provider>
  );
}
