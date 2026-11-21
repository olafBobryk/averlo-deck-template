"use client";

import { useEffect } from "react";

/**
 * In development only, reports a slide whose content is too long for its
 * stage: a console warning naming the slide by its position ("3 / 12"), each
 * time the overflow first appears or grows. The slide itself keeps showing
 * what fits. Production builds render nothing and report nothing.
 */
export function OverflowReport() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const reported = new Map<string, number>();
    let frame = 0;
    const check = () => {
      frame = 0;
      const page = document.querySelector<HTMLElement>(
        "main[aria-roledescription='slide']:not([aria-hidden])",
      );
      const slide = page?.querySelector<HTMLElement>("[data-kind]");
      if (!page || !slide) return;
      const label = page.getAttribute("aria-label") ?? "";
      const over = Math.max(
        slide.scrollHeight - slide.clientHeight,
        slide.scrollWidth - slide.clientWidth,
      );
      if (over <= 1) {
        reported.delete(label);
        return;
      }
      if ((reported.get(label) ?? 0) >= over) return;
      reported.set(label, over);
      console.warn(
        `Slide ${label} overflows its stage by ${over} px: it shows what fits.`,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.documentElement);
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return null;
}
