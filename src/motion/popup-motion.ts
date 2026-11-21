import {
  motionTokens,
  springCss,
} from "./motion";

/**
 * How a popup card grows out of a bar and goes back into it
 * (it expands out of the composer, which is shared and layout
 * animated). The card is at its
 * final place and size the whole time; its edge, a clip, opens from the bar's
 * box to the card's, so nothing stretches and the content never reflows. The
 * card's own composer travels from the bar's place to its own on the same
 * spring, as the bar it stands for is hidden: one composer, moving.
 */
export type Box = { left: number; top: number; width: number; height: number };

/** The surface spring as Web Animation timing, the curve motion.css runs. */
function surface() {
  const [, ms, easing] = /^([\d.]+)ms ([\s\S]+)$/.exec(
    springCss(motionTokens.spring.surface),
  )!;
  return { duration: Number(ms), easing };
}

/**
 * Opens (`in`) or closes (`out`) the card between `from`, the bar's box, and its
 * own. `composer` is the card's own bar. Resolves when it has finished.
 */
export function morph(
  card: HTMLElement,
  composer: HTMLElement | null,
  from: Box,
  direction: "in" | "out",
  delay = 0,
) {
  const c = card.getBoundingClientRect();
  // The card may still be entering as a whole (its layer scales from 0.96): the
  // clip and the composer are in its own, unscaled, units.
  const s = c.width / card.offsetWidth || 1;
  const local = (value: number) => value / s;
  const shut = `inset(${local(from.top - c.top)}px ${local(c.right - from.left - from.width)}px ${local(c.bottom - from.top - from.height)}px ${local(from.left - c.left)}px round ${local(from.height / 2)}px)`;
  const open = `inset(0px round ${getComputedStyle(card).borderRadius})`;
  const timing = {
    ...surface(),
    delay,
    fill: (direction === "in" ? "backwards" : "forwards") as FillMode,
  };
  const order = <T>(shutFrame: T, openFrame: T) =>
    direction === "in" ? [shutFrame, openFrame] : [openFrame, shutFrame];
  const animations: Animation[] = [
    card.animate(
      order({ clipPath: shut }, { clipPath: open }) as Keyframe[],
      timing,
    ),
  ];
  // The bar is still entering: nothing of the card shows until it has.
  if (delay > 0 && direction === "in")
    animations.push(
      card.animate([{ opacity: 0 }, { opacity: 0 }], { duration: delay }),
    );
  if (composer) {
    const f = composer.getBoundingClientRect();
    animations.push(
      composer.animate(
        order(
          {
            // Centred in the card's inside, so a narrower start sits half the
            // difference in from the edge.
            transform: `translate(${local(from.left - (f.left + (f.width - from.width) / 2))}px, ${local(from.top - f.top)}px)`,
            width: `${local(from.width)}px`,
            maxWidth: "none",
          },
          {
            transform: "none",
            width: `${local(f.width)}px`,
            maxWidth: "none",
          },
        ) as Keyframe[],
        timing,
      ),
    );
  }
  return {
    // A cancelled animation rejects its promise: it simply ends here.
    finished: Promise.all(animations.map((a) => a.finished)).then(
      () => {},
      () => {},
    ),
    cancel: () => animations.forEach((a) => a.cancel()),
  };
}
