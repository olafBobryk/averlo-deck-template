"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { animate } from "motion/react";

type Registry = {
  elements: Set<HTMLElement>;
  listen: (listener: () => void) => () => void;
  register: (element: HTMLElement) => () => void;
};
const ShimmerContext = createContext<Registry | null>(null);

/** Internal registration shared by canonical skeleton owners, including React portals. */
export function useShimmerRegistration() {
  return useContext(ShimmerContext)?.register;
}

function createRegistry(): Registry {
  let changed = () => {};
  const registry: Registry = {
    elements: new Set(),
    listen(listener) {
      changed = listener;
      return () => {
        changed = () => {};
      };
    },
    register(element) {
      registry.elements.add(element);
      changed();
      return () => {
        registry.elements.delete(element);
        changed();
      };
    },
  };
  return registry;
}

const rootProperties = [
  "--deck-shimmer-x",
  "--deck-shimmer-width",
  "--deck-shimmer-height",
  "--deck-shimmer-opacity",
] as const;
const setProperty = (element: HTMLElement, name: string, value: string) => {
  if (element.style.getPropertyValue(name) !== value)
    element.style.setProperty(name, value);
};

/** Mount once at the application root. This coordinates visuals, never busy semantics. */
export function ShimmerRoot({
  children,
  animation = "shimmer",
}: {
  children: ReactNode;
  animation?: "shimmer" | "static";
}) {
  const inherited = useContext(ShimmerContext);
  return inherited ? (
    children
  ) : (
    <ShimmerOwner animation={animation}>{children}</ShimmerOwner>
  );
}

function ShimmerOwner({
  children,
  animation,
}: {
  children: ReactNode;
  animation: "shimmer" | "static";
}) {
  const [registry] = useState(createRegistry);
  useEffect(() => {
    const root = document.documentElement;
    const previous = rootProperties.map(
      (property) =>
        [
          property,
          root.style.getPropertyValue(property),
          root.style.getPropertyPriority(property),
        ] as const,
    );
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | undefined;
    let viewportWidth = window.innerWidth;
    let controls: ReturnType<typeof animate> | undefined;
    const measure = () => {
      frame = undefined;
      viewportWidth = window.innerWidth;
      setProperty(root, "--deck-shimmer-width", `${viewportWidth}px`);
      setProperty(root, "--deck-shimmer-height", `${window.innerHeight}px`);
      let visible = false;
      for (const element of registry.elements) {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        const localWidth = parseFloat(computed.width) || element.offsetWidth;
        const localHeight = parseFloat(computed.height) || element.offsetHeight;
        const scaleX = localWidth ? rect.width / localWidth : 1;
        const scaleY = localHeight ? rect.height / localHeight : 1;
        setProperty(element, "--deck-skeleton-x", `${rect.left}px`);
        setProperty(element, "--deck-skeleton-y", `${rect.top}px`);
        setProperty(element, "--deck-skeleton-scale-x", `${scaleX || 1}`);
        setProperty(element, "--deck-skeleton-scale-y", `${scaleY || 1}`);
        setProperty(element, "--deck-skeleton-ready", "1");
        if (
          rect.width &&
          rect.height &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < viewportWidth &&
          !element.closest("[inert], [hidden]") &&
          computed.visibility !== "hidden"
        )
          visible = true;
      }
      const active =
        animation === "shimmer" &&
        !media.matches &&
        !document.hidden &&
        visible;
      setProperty(root, "--deck-shimmer-opacity", active ? "1" : "0");
      if (active) {
        controls ??= animate(0, 1, {
          duration: 2.4,
          ease: "easeInOut",
          repeat: Infinity,
          onUpdate: (phase) =>
            setProperty(
              root,
              "--deck-shimmer-x",
              `${-viewportWidth + phase * viewportWidth * 2}px`,
            ),
        });
        controls.play();
      } else controls?.pause();
    };
    const queueMeasure = () => {
      frame ??= requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(queueMeasure);
    const observeElements = () => {
      resize.disconnect();
      registry.elements.forEach((element) => resize.observe(element));
      queueMeasure();
    };
    const unlisten = registry.listen(observeElements);
    // Transform-driven modal movement does not trigger ResizeObserver. Geometry
    // changes are batched; the root's per-frame phase write is deliberately ignored.
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => record.target !== root)) {
        if (frame !== undefined) cancelAnimationFrame(frame);
        measure();
      }
    });
    mutations.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "inert"],
    });
    window.addEventListener("resize", queueMeasure);
    window.addEventListener("scroll", queueMeasure, true);
    document.addEventListener("visibilitychange", queueMeasure);
    media.addEventListener("change", queueMeasure);
    document.fonts?.addEventListener("loadingdone", queueMeasure);
    setProperty(root, "--deck-shimmer-x", `${-viewportWidth}px`);
    observeElements();
    return () => {
      controls?.stop();
      if (frame !== undefined) cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", queueMeasure);
      window.removeEventListener("scroll", queueMeasure, true);
      document.removeEventListener("visibilitychange", queueMeasure);
      media.removeEventListener("change", queueMeasure);
      document.fonts?.removeEventListener("loadingdone", queueMeasure);
      unlisten();
      previous.forEach(([property, value, priority]) =>
        value
          ? root.style.setProperty(property, value, priority)
          : root.style.removeProperty(property),
      );
    };
  }, [animation, registry]);
  return <ShimmerContext value={registry}>{children}</ShimmerContext>;
}
