import type { MotionTokens } from "./motion";

/**
 * The one enter and exit for menus and pickers that drop from a trigger
 * (DropdownMenu, Select; the presence recipe, as the dropdown
 * implements it): from above by the nudge at the presence
 * scale, on the control spring with its opacity on `fade`; out on `exit`.
 * Spread onto the surface's motion element; reduced motion comes from the
 * tokens (useMotionTokens), so it is instant there. A submenu opens from the
 * side, `from: "side"`: the same scale and fade with no nudge.
 */
export function popoverMotion(
  t: MotionTokens,
  open: boolean,
  from: "above" | "side" = "above",
) {
  const hidden = {
    opacity: 0,
    scale: t.scale.presence,
    y: from === "side" ? 0 : -t.distance.nudge,
  };
  const leave = { ...hidden, transition: t.exit };
  return {
    initial: hidden,
    animate: open
      ? {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { ...t.spring.control, opacity: t.fade },
        }
      : leave,
    exit: leave,
  };
}
