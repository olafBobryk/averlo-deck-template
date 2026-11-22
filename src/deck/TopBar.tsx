"use client";
import { useMemo, type CSSProperties, type MouseEvent } from "react";
import { config } from "@/brand/config";
import { brandName, logoSrc } from "@/brand/name";
import { placeholderMark } from "@/brand/placeholder/mark";
import Logo from "@/questionnaire/primitives/Logo";
import { SharedHeader } from "@/questionnaire/shared-header";
import { InterfaceCopyContext } from "@/questionnaire/wording-context";
import { englishCopy, type InterfaceCopy } from "@/questionnaire/wording";
import type { Lang } from "./langs";
import { ui } from "./model";
import styles from "./topbar.module.css";

// The top bar (FR-012; research R4): the questionnaire's header band,
// ported unchanged under src/questionnaire/. This file reproduces only the
// questionnaire's composition of it (its src/react.tsx, lines 1119–1130 at
// the pinned commit, listed in docs/design-source.md), without the save chip
// and the language switcher, which are children there. After reviewing the
// merged build the owner made it an overlay ("keep the top bar as overlay"):
// the brand and the deck's title float over the slides on the deck's own
// dark background, with no white band, the title muted (topbar.module.css).
// Its step label and step track left it: the navigator is the footer's,
// at the bottom edge (navigator.tsx). The theme's derivation is react.tsx's
// (lines 246–257, 823–827). On phones the bar is hidden, and the slides take
// the whole stage.

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
 *  deck's accent, plus the font: the SF Pro files are not redistributable,
 *  so the questionnaire's parts are set in the deck's Inter (R4). Shared by
 *  the top bar and the navigator (navigator.tsx). */
export function theme(accent: string) {
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
            <img className={styles.logo} src={placeholderMark} alt="" />
          </a>
          <span className="brand-mark">{name}</span>
        </>
      )}
      <div className="brand-divider" />
      <div className="brand-sub">{config.deckTitle}</div>
    </>
  );
}

/** The bar, an overlay across the top of the stage: the brand and the
 *  deck's title. `onNavigate(step)` goes to slide `step` (1-based); the
 *  brand goes to the first. */
export function TopBar({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (step: number) => void;
}) {
  const copy = useMemo<InterfaceCopy>(
    () => ({
      ...englishCopy,
      introLink: `${brandName(config.brand)}: ${ui.firstSlide[lang]}`,
    }),
    [lang],
  );

  return (
    <InterfaceCopyContext.Provider value={copy}>
      <div
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
        </div>
      </div>
    </InterfaceCopyContext.Provider>
  );
}
