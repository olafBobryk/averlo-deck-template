"use client";

import {
	AnimatePresence,
	motion,
	type TargetAndTransition,
	type Transition,
} from "motion/react";
import type * as React from "react";
import { useMotionDisableOverride } from "@/components/ui/foundations/motionDisableOverride";
import {
	instantTransition,
	motionTiming,
} from "@/components/ui/foundations/motionTiming";
import { spring } from "@/components/ui/foundations/spring";
import { useMotionAllowed } from "@/hooks/useMotionAllowed";

/**
 * - `together`: height and opacity move at once and nothing is ever clipped
 *   (overflow stays visible). For small one- or two-line messages: field
 *   errors, limits, step-level errors. `FieldMessage` uses it.
 * - `sequenced`: height first, then fade. The content fades in once the
 *   height has started opening, and on close fades out before the height
 *   collapses, so it is only clipped while it is transparent. For larger
 *   content: follow-up questions, conditional fields, accordions, sections.
 */
export type CollapseMode = "together" | "sequenced";

/** Sequenced open: the fade starts this long after the height. */
const SEQUENCED_FADE_DELAY = 0.12;

export type CollapseAxis = "height" | "width";

type CollapseMotion = {
	initial: TargetAndTransition;
	animate: TargetAndTransition;
	exit: TargetAndTransition;
};

/**
 * Collapse's open/close targets, for motion elements that cannot be a
 * `Collapse` themselves (a keyed `motion.li` inside a list's own
 * `AnimatePresence`). Spread the result onto the element.
 */
export function useCollapseMotion({
	axis = "height",
	mode = "sequenced",
}: {
	axis?: CollapseAxis;
	mode?: CollapseMode;
} = {}): CollapseMotion {
	const motionAllowed = useMotionAllowed(true);
	const motionDisabledByUrl = useMotionDisableOverride();
	const animated = motionAllowed && !motionDisabledByUrl;
	const sequenced = mode === "sequenced";
	const size: Transition = animated ? spring.disclosure : instantTransition;
	const fade: Transition = animated ? motionTiming.feedback : instantTransition;
	const fadeDuration =
		typeof fade.duration === "number" && animated ? fade.duration : 0;
	// Sequenced content is clipped only while it moves, so focus rings and
	// shadows stay visible at rest.
	const clip = sequenced ? { overflow: "hidden" as const } : {};

	return {
		initial: { [axis]: 0, opacity: 0, ...clip },
		animate: {
			[axis]: "auto",
			opacity: 1,
			...(sequenced ? { transitionEnd: { overflow: "visible" } } : {}),
			transition: {
				[axis]: size,
				opacity: {
					...fade,
					delay: animated && sequenced ? SEQUENCED_FADE_DELAY : 0,
				},
			},
		},
		exit: {
			[axis]: 0,
			opacity: 0,
			...clip,
			transition: {
				[axis]: { ...size, delay: sequenced ? fadeDuration : 0 },
				opacity: fade,
			},
		},
	};
}

type CollapseProps = Pick<
	React.HTMLAttributes<HTMLDivElement>,
	"aria-atomic" | "aria-live" | "className" | "id" | "role"
> & {
	/** `width` for inline content beside a flexible sibling (e.g. a row's remove button). */
	axis?: CollapseAxis;
	children: React.ReactNode;
	mode?: CollapseMode;
	open: boolean;
};

/**
 * Animated-size show/hide on the site's disclosure spring (height by
 * default). Content mounts when `open` turns true and stays rendered with its
 * last props while it closes. Own the spacing inside `children` (e.g.
 * `pt-8`, or `pl-3` on the width axis), not on siblings, so the gap opens and
 * closes with the box. Snaps under reduced motion or `?motion=off`.
 */
export function Collapse({
	axis = "height",
	children,
	mode = "sequenced",
	open,
	...rest
}: CollapseProps) {
	const motionProps = useCollapseMotion({ axis, mode });
	return (
		<AnimatePresence initial={false}>
			{open ? (
				<motion.div key="collapse" {...rest} {...motionProps}>
					{children}
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
