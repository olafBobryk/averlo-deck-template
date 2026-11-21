"use client";
import { motion, useReducedMotion } from "motion/react";

// AnimatedLock's structure and motion from averlo-questionnaire-template 7ffd671
// src/animated-lock.tsx (a static body, a shackle turning -35° about its left
// leg, opening spring 28/12/1.3, closing 480/24/0.7, initial={false}, instant
// under reduced motion), drawn from the deck's icon pack instead of Lucide:
// Material Symbols Rounded `lock` (@material-symbols/svg-400 0.48.2), whose one
// contour is split by hand at y = −634, where the shackle meets the body.
// Keep the closed lock identical to lock.svg.

/** The body: the outline below y = −634 (its `h70 … h70` across the shackle
 *  becomes one `h520`), with the glyph's own hole, keyhole and empty tail. */
const body =
  "M220-80q-24.75 0-42.37-17.63Q160-115.25 160-140v-434q0-24.75 17.63-42.38Q195.25-634 220-634h520q24.75 0 42.38 17.62Q800-598.75 800-574v434q0 24.75-17.62 42.37Q764.75-80 740-80H220Zm0-60h520v-434H220v434Zm314.5-162.03Q557-324.06 557-355q0-30-22.67-54.5t-54.5-24.5q-31.83 0-54.33 24.5t-22.5 55q0 30.5 22.67 52.5t54.5 22q31.83 0 54.33-22.03ZM220-140v-434 434Z";

/** The shackle ring: the outline's `v-96 … v96` above y = −634, with the
 *  glyph's own inner contour as the hole, and both legs carried on 60 units
 *  down to y = −584, into the body's solid top band. Shut, the extra length
 *  lies inside the band, so the lock still draws exactly lock.svg (and no seam
 *  shows on the fractional row at −634). Open, it turns about the foot of the
 *  longer left leg, (290, −584), so the leg stays set into the body instead of
 *  lifting off it at one corner, with no gap as it opens. */
const shackle =
  "M290-584v-146q0-78.85 55.61-134.42Q401.21-920 480.11-920q78.89 0 134.39 55.58Q670-808.85 670-730v146ZM350-584h260v-146q0-54.17-37.88-92.08-37.88-37.92-92-37.92T388-822.08q-38 37.91-38 92.08v146Z";

export function AnimatedLock({
  open = false,
  size = 28,
}: {
  open?: boolean;
  size?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      <path d={body} />
      <motion.path
        d={shackle}
        initial={false}
        animate={{ rotate: open ? -35 : 0 }}
        style={{
          transformBox: "view-box",
          originX: "290px",
          originY: "-584px",
          overflow: "visible",
        }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: open ? 28 : 480,
                damping: open ? 12 : 24,
                mass: open ? 1.3 : 0.7,
              }
        }
      />
    </svg>
  );
}
