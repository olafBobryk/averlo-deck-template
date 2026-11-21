"use client";

import { CaretDown } from "@phosphor-icons/react";
import clsx from "clsx";
import {
	AnimatePresence,
	motion,
	type TargetAndTransition,
} from "motion/react";
import * as React from "react";
import { useMotionTransition } from "@/components/ui/foundations/MotionProvider";
import { useMotionDisableOverride } from "@/components/ui/foundations/motionDisableOverride";
import Portal from "@/components/ui/overlays/Portal";
import { useMotionAllowed } from "@/hooks/useMotionAllowed";

const DROPDOWN_TRANSITION_OPTIONS = {
	distance: "near",
	intensity: "subtle",
} as const;

/* Portalled menus use z-[100]: above the fixed site header (z-70) and bottom
 * CTA (z-90), below modals (z-120). */
/** Space kept between a viewport-placed menu and the screen edges. */
const COLLISION_PADDING = 16;
/** Below this much room on either side, the menu centres on the screen. */
const MIN_SIDE_ROOM = 200;

export type DropdownTriggerRenderProps = {
	isOpen: boolean;
	openMenu: () => void;
	closeMenu: () => void;
	toggleMenu: () => void;
	caretIcon: React.ReactNode;
};

type DropdownMenuRenderProps = DropdownTriggerRenderProps;

/** Per-instance entrance, e.g. a bottom sheet that slides up on phones. */
export type DropdownMenuMotion = {
	initial: TargetAndTransition;
	animate: TargetAndTransition;
	exit: TargetAndTransition;
};

/**
 * - `local` (default): absolute, in the trigger's own layout context.
 * - `viewport`: portalled and fixed to the trigger. Opens below, flips above
 *   when below is short, shifts to stay inside the screen and caps its height
 *   (the panel scrolls) when neither side fits, so it never leaves the
 *   viewport or gets clipped by an ancestor's overflow.
 * - `sheet`: portalled bottom sheet across the viewport, capped at 85svh.
 */
export type DropdownPlacement = "local" | "viewport" | "sheet";

type DropdownProps = {
	/** `viewport` only: which trigger edge the menu lines up with. */
	align?: "start" | "end";
	children:
		| React.ReactNode
		| ((props: DropdownMenuRenderProps) => React.ReactNode);
	className?: string;
	menuClassName?: string;
	/** Overrides the default drop-down nudge for this menu. */
	menuMotion?: DropdownMenuMotion;
	/** `viewport` only: gap between trigger and menu, in px. */
	offset?: number;
	placement?: DropdownPlacement;
	renderTrigger: (props: DropdownTriggerRenderProps) => React.ReactNode;
};

type ViewportPosition = {
	left: number;
	maxHeight: number;
	maxWidth: number;
	side: "top" | "bottom";
	top: number;
};

function resolveViewportPosition(
	anchor: DOMRect,
	size: { height: number; width: number },
	align: "start" | "end",
	offset: number,
): ViewportPosition {
	const pad = COLLISION_PADDING;
	const viewportWidth = document.documentElement.clientWidth;
	const viewportHeight = window.innerHeight;
	const maxWidth = viewportWidth - pad * 2;
	const width = Math.min(size.width, maxWidth);
	const below = viewportHeight - anchor.bottom - offset - pad;
	const above = anchor.top - offset - pad;
	const preferred = align === "end" ? anchor.right - width : anchor.left;
	const left = Math.min(
		Math.max(preferred, pad),
		Math.max(pad, viewportWidth - pad - width),
	);

	if (Math.max(below, above) < Math.min(size.height, MIN_SIDE_ROOM)) {
		// No usable room beside the trigger: fit the screen instead.
		const maxHeight = viewportHeight - pad * 2;
		const height = Math.min(size.height, maxHeight);
		return {
			left,
			maxHeight,
			maxWidth,
			side: "bottom",
			top: Math.max(pad, (viewportHeight - height) / 2),
		};
	}

	const side = size.height <= below || below >= above ? "bottom" : "top";
	const maxHeight = Math.max(0, side === "bottom" ? below : above);
	const height = Math.min(size.height, maxHeight);
	return {
		left,
		maxHeight,
		maxWidth,
		side,
		top:
			side === "bottom" ? anchor.bottom + offset : anchor.top - offset - height,
	};
}

export function Dropdown({
	align = "start",
	children,
	className,
	menuClassName,
	menuMotion,
	offset = 8,
	placement = "local",
	renderTrigger,
}: DropdownProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const panelRef = React.useRef<HTMLDivElement | null>(null);
	const contentRef = React.useRef<HTMLDivElement | null>(null);
	const [position, setPosition] = React.useState<ViewportPosition | null>(null);
	const motionAllowed = useMotionAllowed(true);
	const motionDisabledByUrl = useMotionDisableOverride();
	const transition = useMotionTransition(
		"disclosure",
		DROPDOWN_TRANSITION_OPTIONS,
	);
	const isPortalled = placement !== "local";
	const menuProps = {
		isOpen,
		openMenu: () => setIsOpen(true),
		closeMenu: () => setIsOpen(false),
		toggleMenu: () => setIsOpen((current) => !current),
		caretIcon: (
			<CaretDown
				aria-hidden
				data-is-open={isOpen}
				className="shrink-0 transition-transform motion-micro data-[is-open=true]:rotate-180"
				size={12}
			/>
		),
	};
	const menuContent =
		typeof children === "function" ? children(menuProps) : children;

	const place = React.useCallback(() => {
		const anchor = rootRef.current;
		const content = contentRef.current;
		const panel = panelRef.current;
		if (!anchor || !content || !panel) return;
		// The content box is never capped, so it reports the natural height; the
		// panel's own padding and border sit around it, so a menu placed above
		// keeps the same gap to the trigger as one placed below.
		const panelStyle = getComputedStyle(panel);
		const chrome =
			Number.parseFloat(panelStyle.paddingTop) +
			Number.parseFloat(panelStyle.paddingBottom) +
			Number.parseFloat(panelStyle.borderTopWidth) +
			Number.parseFloat(panelStyle.borderBottomWidth);
		setPosition(
			resolveViewportPosition(
				anchor.getBoundingClientRect(),
				{ height: content.offsetHeight + chrome, width: panel.offsetWidth },
				align,
				offset,
			),
		);
	}, [align, offset]);

	// Measure before paint so the menu never shows at a wrong spot first.
	React.useLayoutEffect(() => {
		if (placement !== "viewport") return;
		if (!isOpen) {
			setPosition(null);
			return;
		}
		place();
		const content = contentRef.current;
		const observer = new ResizeObserver(place);
		if (content) observer.observe(content);
		window.addEventListener("resize", place);
		window.addEventListener("scroll", place, true);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", place);
			window.removeEventListener("scroll", place, true);
		};
	}, [isOpen, place, placement]);

	const animated = motionAllowed && !motionDisabledByUrl;
	const fromAbove = placement === "viewport" && position?.side === "top";
	const defaultMotion: DropdownMenuMotion =
		placement === "sheet"
			? {
					initial: { opacity: 1, y: "100%" },
					animate: { opacity: 1, y: 0 },
					exit: { opacity: 1, y: "100%" },
				}
			: placement === "viewport"
				? {
						// Scales from the trigger edge (transformOrigin below), so it
						// reads right whichever side the menu resolves to.
						initial: { opacity: 0, scale: 0.97 },
						animate: { opacity: 1, scale: 1 },
						exit: { opacity: 0, scale: 0.97 },
					}
				: {
						initial: { opacity: 0, y: -6 },
						animate: { opacity: 1, y: 0 },
						exit: { opacity: 0, y: -6 },
					};
	const motionConfig = menuMotion ?? defaultMotion;
	const menuClassNames = clsx(
		placement === "local" && "absolute right-0 z-50 mt-2 min-w-48",
		placement === "viewport" &&
			"fixed z-[100] overflow-y-auto overscroll-contain",
		placement === "sheet" &&
			"fixed inset-x-0 bottom-0 z-[100] max-h-[85svh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]",
		menuClassName,
	);
	const menuStyle: React.CSSProperties | undefined =
		placement === "viewport"
			? position
				? {
						transformOrigin: `${align === "end" ? "right" : "left"} ${position.side === "top" ? "bottom" : "top"}`,
						left: position.left,
						maxHeight: position.maxHeight,
						maxWidth: position.maxWidth,
						top: position.top,
					}
				: { left: 0, top: 0, visibility: "hidden" }
			: undefined;
	const body = isPortalled ? (
		<div ref={contentRef} className="shrink-0">
			{menuContent}
		</div>
	) : (
		menuContent
	);
	const menu = animated ? (
		<AnimatePresence>
			{isOpen ? (
				<motion.div
					ref={panelRef}
					data-dropdown-panel=""
					data-side={fromAbove ? "top" : "bottom"}
					initial={motionConfig.initial}
					animate={motionConfig.animate}
					exit={motionConfig.exit}
					transition={transition}
					className={menuClassNames}
					style={menuStyle}
				>
					{body}
				</motion.div>
			) : null}
		</AnimatePresence>
	) : isOpen ? (
		<div
			ref={panelRef}
			data-dropdown-panel=""
			data-side={fromAbove ? "top" : "bottom"}
			className={menuClassNames}
			style={menuStyle}
		>
			{body}
		</div>
	) : null;

	React.useEffect(() => {
		if (!isOpen) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (
				!rootRef.current?.contains(target) &&
				!panelRef.current?.contains(target)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [isOpen]);

	// Escape closes. React key events bubble through the portal to this root,
	// so this covers portalled panels too. Focus inside the panel returns to
	// the trigger; focus already on the trigger (a combobox input) stays.
	function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key !== "Escape" || !isOpen || event.defaultPrevented) return;
		event.preventDefault();
		const focusInPanel = panelRef.current?.contains(document.activeElement);
		setIsOpen(false);
		if (focusInPanel) {
			rootRef.current
				?.querySelector<HTMLElement>(
					"button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
				)
				?.focus({ preventScroll: true });
		}
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: delegates Escape from the trigger and panel; the root itself is not interactive.
		<div
			ref={rootRef}
			className={clsx("relative inline-block", className)}
			onKeyDown={onKeyDown}
		>
			{renderTrigger(menuProps)}
			{isPortalled ? <Portal>{menu}</Portal> : menu}
		</div>
	);
}
