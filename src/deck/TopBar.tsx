"use client";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { config } from "@/brand/config";
import { brandName, logoSrc } from "@/brand/name";
import { placeholderMark } from "@/brand/placeholder/mark";
import Logo from "@/questionnaire/primitives/Logo";
import {
  ProgressNavigator,
  StepProgressLabel,
} from "@/questionnaire/progress-navigator";
import { SharedHeader } from "@/questionnaire/shared-header";
import { InterfaceCopyContext } from "@/questionnaire/wording-context";
import { englishCopy, type InterfaceCopy } from "@/questionnaire/wording";
import type { Lang } from "./langs";
import { ui } from "./model";
import { slides } from "./slides";
import styles from "./topbar.module.css";

// The top bar (FR-012; research R4): the questionnaire's whole top, its
// header band and its progress navigator, ported unchanged under
// src/questionnaire/. This file reproduces only the questionnaire's
// composition of them (its src/react.tsx, lines 1119–1142 at the pinned
// commit, listed in docs/design-source.md), without the save chip, the
// language switcher and the Review button and caption, which are children
// there (owner: "Remove it, adjust parity"). The theme's derivation is
// react.tsx's too (lines 246–257, 823–827). On phones the bar is hidden
// (topbar.module.css), and the slides take the whole stage.

/** The text colour on `accent`, as the questionnaire picks it. */
function foreground(accent: string) {
  const hex = accent.slice(1);
  const rgb =
    hex.length === 3
      ? [...hex].map((digit) => digit + digit)
      : hex.match(/../g);
  if (!rgb || rgb.length !== 3) return "#fff";
  const linear = rgb.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 > 0.179
    ? "#000"
    : "#fff";
}

/** The `--aq-*` variables the questionnaire sets inline on `.aq`, from the
 *  deck's accent, plus two overrides: the font (the SF Pro files are not
 *  redistributable, so the bar is set in the deck's Inter; R4) and the
 *  muted grey (for contrast). */
function theme(accent: string) {
  const hex =
    accent.length === 4
      ? "#" +
        accent
          .slice(1)
          .split("")
          .map((char) => char + char)
          .join("")
      : accent;
  const rgb = [1, 3, 5]
    .map((index) => parseInt(hex.slice(index, index + 2), 16))
    .join(" ");
  return {
    "--aq-accent": accent,
    "--aq-accent-text": foreground(accent),
    "--aq-accent-rgb": rgb,
    "--aq-hover-rgb": accent === "#ff3200" ? "255 105 0" : rgb,
    "--aq-active-rgb": accent === "#ff3200" ? "230 45 0" : rgb,
    "--font-sf-pro": "var(--font-inter)",
    // The shell's muted text (#777777, the step label) is 4.47:1 on its
    // white page; the template needs 4.5:1 (constitution, Principle VIII).
    // The nearest grey that reaches it.
    "--muted": "#767676",
  } as CSSProperties;
}

/** The brand slot: the ported Logo for Averlo; for another brand its logo,
 *  or the "your logo" placeholder with the name as text. The deck's title
 *  is the sub-label. A press goes to the first slide. */
function Brand({ lang, onHome }: { lang: Lang; onHome: () => void }) {
  const name = brandName(config.brand);
  const link = {
    href: "?s=1",
    className: "brand-logo",
    "aria-label": `${name}: ${ui.firstSlide[lang]}`,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onHome();
    },
  };
  const logo = logoSrc(config.brand);
  return (
    <>
      {config.brand.kind === "averlo" ? (
        <Logo {...link} />
      ) : logo ? (
        <a {...link}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static file under public/brand/ */}
          <img className={styles.logo} src={logo} alt="" />
        </a>
      ) : (
        <>
          <a {...link}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the placeholder's served file */}
            <img
              className={`${styles.logo} ${styles.placeholder}`}
              src={placeholderMark}
              alt=""
            />
          </a>
          <span className="brand-mark">{name}</span>
        </>
      )}
      <div className="brand-divider" />
      <div className="brand-sub">{config.deckTitle}</div>
    </>
  );
}

/** The bar, full-bleed across the top of the stage. `index` is the live
 *  slide (0-based); `onNavigate(step)` goes to slide `step` (1-based).
 *  `onMeasure` gets the bottom of the navigator's track, where the slides
 *  begin. */
export function TopBar({
  index,
  lang,
  onNavigate,
  onMeasure,
}: {
  index: number;
  lang: Lang;
  onNavigate: (step: number) => void;
  onMeasure: (bottom: number) => void;
}) {
  const total = slides.length;
  const step = index + 1;
  const copy = useMemo<InterfaceCopy>(
    () => ({
      ...englishCopy,
      introLink: `${brandName(config.brand)}: ${ui.firstSlide[lang]}`,
      progress: ui.slideProgress[lang],
      goSlide: ui.goSlide[lang],
      goQuestion: ui.goSlide[lang],
      slideNumber: ui.slideNumber[lang],
      questionNumber: ui.slideNumber[lang],
    }),
    [lang],
  );

  // The slides start below the track, rounded up to a whole pixel so the
  // bar's white page takes the track's last row, as on the questionnaire's
  // page. It moves only with the viewport (the shell's breakpoints), so a
  // resize re-measures it.
  const root = useRef<HTMLDivElement>(null);
  const measure = useRef(onMeasure);
  useLayoutEffect(() => {
    measure.current = onMeasure;
  });
  useLayoutEffect(() => {
    const update = () => {
      const track = root.current?.querySelector(
        ".inline-progress .progress-track",
      );
      if (track)
        measure.current(Math.ceil(track.getBoundingClientRect().bottom));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <InterfaceCopyContext.Provider value={copy}>
      <div
        ref={root}
        className={`aq ${styles.bar}`}
        lang={lang}
        style={theme(config.accent)}
      >
        <div className="application">
          <SharedHeader
            brand={<Brand lang={lang} onHome={() => onNavigate(1)} />}
          >
            {null}
          </SharedHeader>
          <div className="shell">
            <div className="topline">
              <div className="progress-caption">
                <span className="progress-caption-step">
                  <StepProgressLabel
                    currentStep={step}
                    totalSteps={total}
                    includesSections
                    onNavigate={onNavigate}
                  />
                </span>
              </div>
            </div>
            <div className="inline-progress">
              <ProgressNavigator
                currentStep={step}
                totalSteps={total}
                includesSections
                progress={(step / total) * 100}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </div>
      </div>
    </InterfaceCopyContext.Provider>
  );
}
