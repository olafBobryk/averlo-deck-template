"use client";
import { cubicBezier } from "motion";
import { motion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { preload } from "react-dom";
import { placeholderMark } from "@/brand/placeholder/mark";
import type { Lang } from "@/deck/langs";
import { parseLang } from "@/deck/model";
import { AnimatedLock } from "./AnimatedLock";
import { fogFlatHoldMs, fogTravelMs, prepareFogVolume } from "./fog-volume";
import { endIntro, finishIntro } from "./intro-state";
import styles from "./gate.module.css";

// The deck's intro: the Averlo questionnaire's keyless form
// (averlo-questionnaire-template b24db42, src/startup-loader.tsx) over the
// deck, once per browser session. The mark rises through the dark fog volume
// while the accent arc grows, the lock pops in, holds, and opens on its own
// as the arc fills; then the intro fades and the slide enters.

/** The questionnaire's timings, verbatim, the one recorded exception to the
 *  deck's motion tokens. */
const timing = {
  /** The arc starts as a dot of the stroke's width and fades in over this long. */
  dotFadeMs: 240,
  /** 0° to 180°: exactly the orb's approach. */
  growMs: fogTravelMs,
  /** One turn of the arc while the lock holds. */
  turnMs: 1_000,
  /** The lock holds this long once the orb is in. */
  minCheckMs: fogFlatHoldMs,
  /** 180° to 360° while the spin slows to rest and the shackle swings open. */
  openMs: 1_000,
  /** Then the intro fades to the deck (300 ms, gate.module.css). */
  openHoldMs: 200,
  fadeMs: 300,
} as const;
const settle = cubicBezier(0.16, 1, 0.3, 1);
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp = (value: number) => Math.min(1, Math.max(0, value));

const loading: Record<Lang, string> = { en: "Loading" };

type Phase = "intro" | "checking" | "opening";
type Arc = {
  mode: "grow" | "fill";
  t0: number;
  rotation: number;
  sweep: number;
  from: number;
  opacity: number;
};

const noSubscription = () => () => {};
/** The pre-paint script (intro-state.ts) sets html[data-intro] when the
 *  intro plays: a first visit this session, motion allowed, no ?intro=off. */
const playing = () => document.documentElement.hasAttribute("data-intro");

export function Intro() {
  const lang = useSyncExternalStore<Lang>(
    noSubscription,
    () => parseLang(new URLSearchParams(window.location.search).get("lang")),
    () => "en",
  );
  const active = useSyncExternalStore(noSubscription, playing, () => true);
  // The mark is the intro's first frame: fetch it before anything.
  preload(placeholderMark, { as: "image", fetchPriority: "high" });
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof prepareFogVolume>>(null);
  const [motionMode, setMotion] = useState<"volume" | "fallback">();
  const [phase, setPhaseState] = useState<Phase>("intro");
  const [revealed, setRevealed] = useState(false);
  const [gone, setGone] = useState(false);
  const arcSvg = useRef<SVGSVGElement>(null);
  const arcCircle = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = surface.current;
    if (!canvas) return;
    let live = true;
    const volume = prepareFogVolume(canvas, placeholderMark);
    renderer.current = volume;
    const fallback = () => {
      if (live) setMotion("fallback");
    };
    canvas.addEventListener("webglcontextlost", fallback);
    if (volume) {
      void volume.ready.then(() => {
        if (!live) return;
        volume.draw(0);
        setMotion("volume");
      }, fallback);
    } else fallback();
    return () => {
      live = false;
      canvas.removeEventListener("webglcontextlost", fallback);
      renderer.current = null;
      volume?.dispose();
    };
  }, [active]);

  // One clock drives the orb's approach, the arc and each step, so the arc
  // and the orb stay together.
  useLayoutEffect(() => {
    if (!active || !motionMode) return;
    const volume = motionMode === "volume" ? renderer.current : null;
    const arc: Arc = {
      mode: "grow",
      t0: Number.NaN,
      rotation: 0,
      sweep: 0,
      from: 0,
      opacity: 0,
    };
    let current: Phase = "intro";
    let at = 0;
    let started: number | undefined;
    let last: number | undefined;
    let frame = 0;
    const set = (next: Phase, time: number) => {
      current = next;
      at = time;
      setPhaseState(next);
    };

    const tick = (time: number) => {
      started ??= time;
      const dt = last === undefined ? 0 : time - last;
      last = time;
      const since = time - at;
      if (volume && current === "intro")
        volume.draw(Math.min(time - started, timing.growMs));
      if (current === "intro" && time - started >= timing.growMs)
        set("checking", time);
      else if (current === "checking" && since >= timing.minCheckMs) {
        arc.mode = "fill";
        arc.t0 = time;
        arc.from = arc.sweep;
        set("opening", time);
      } else if (
        current === "opening" &&
        since >= timing.openMs + timing.openHoldMs
      ) {
        setRevealed(true);
        return;
      }

      let speed = 360 / timing.turnMs;
      if (arc.mode === "grow") {
        if (Number.isNaN(arc.t0)) arc.t0 = time;
        arc.sweep = 180 * smoothstep(clamp((time - arc.t0) / timing.growMs));
        arc.opacity = clamp((time - arc.t0) / timing.dotFadeMs);
      } else {
        const eased = settle(clamp((time - arc.t0) / timing.openMs));
        arc.sweep = arc.from + (360 - arc.from) * eased;
        speed *= 1 - eased;
      }
      arc.rotation = (arc.rotation + speed * dt) % 360;
      const circle = arcCircle.current;
      const svg = arcSvg.current;
      if (circle && svg) {
        circle.style.strokeDasharray = `${Math.max(0.001, arc.sweep)} 360`;
        svg.style.transform = `rotate(${arc.rotation}deg)`;
        svg.style.opacity = String(arc.opacity);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, motionMode]);

  // The hand-off: the intro fades over 300 ms while the slide plays its
  // forward page step underneath, a transition from the loading screen to
  // the first slide.
  useEffect(() => {
    if (!revealed) return;
    finishIntro();
    const timer = setTimeout(() => {
      endIntro();
      setGone(true);
    }, timing.fadeMs);
    return () => clearTimeout(timer);
  }, [revealed]);

  if (!active || gone) return null;
  const lockShown = phase !== "intro";
  return (
    <div
      ref={root}
      className={styles.gate}
      lang={lang}
      data-gate={phase}
      data-ready={revealed || undefined}
      aria-hidden={revealed || undefined}
    >
      {!revealed && (
        <span className="visually-hidden" role="status">
          {loading[lang]}
        </span>
      )}
      <div className={styles.body}>
        <div
          className={styles.stage}
          aria-hidden="true"
          data-gate-stage=""
          data-motion={motionMode}
          data-lock={lockShown || undefined}
        >
          <canvas ref={surface} className={styles.volume} />
          <div
            className={styles.mark}
            style={{ backgroundImage: `url(${placeholderMark})` }}
          />
          <svg
            ref={arcSvg}
            className={styles.arc}
            data-gate-arc=""
            viewBox="0 0 96 96"
            style={{ opacity: 0 }}
          >
            <circle
              ref={arcCircle}
              cx="48"
              cy="48"
              r="40"
              pathLength={360}
              transform="rotate(-90 48 48)"
              style={{ strokeDasharray: "0.001 360" }}
            />
          </svg>
          {lockShown && (
            <motion.div
              className={styles.lock}
              data-lock-state={phase === "opening" ? "open" : "shut"}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                scale: {
                  type: "spring",
                  stiffness: 480,
                  damping: 24,
                  mass: 0.7,
                },
                opacity: { duration: 0.16 },
              }}
            >
              <AnimatedLock open={phase === "opening"} size={28} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
