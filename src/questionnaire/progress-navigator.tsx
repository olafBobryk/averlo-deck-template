"use client";

import { message } from './wording.js';
import { useInterfaceCopy } from './wording-context.js';

// Source: private Averlo Client 2 questionnaire, 83a4c72b00ed08f916cb6125da99958045d3e9c0, components/ui/ProgressNavigator.tsx.
// Seam correction: Client 1 questionnaire, f6e170c513c23d082e435a87e57390d7cb9f4128, same path.

import { animate as animateFill, useMotionValue, useMotionValueEvent } from "motion/react";
import {
	PROGRESS_MOUND_MAX_HEIGHT,
	progressMoundHeight,
	progressFillPosition,
	progressMoundLayout,
	progressMoundPath,
	stepFromProgressPosition,
	progressFillPercent,
} from "./progress-model.js";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type ProgressNavigatorProps = {
	currentStep: number;
	disabled?: boolean;
	onNavigate: (step: number) => void;
	progress: number;
	totalSteps: number;
	includesSections?: boolean;
};

type SpringValue = { position: number; velocity: number };

const settle = (value: SpringValue, target: number, elapsed: number, stiffness: number, damping: number) => {
	const acceleration = stiffness * (target - value.position) - damping * value.velocity;
	value.velocity += acceleration * elapsed;
	value.position += value.velocity * elapsed;
};

export function ProgressNavigator({
	currentStep,
	disabled = false,
	onNavigate,
	progress,
	totalSteps, includesSections,
}: ProgressNavigatorProps) {
  const copy = useInterfaceCopy();
	const root = useRef<HTMLDivElement>(null);
	const frame = useRef<number | null>(null);
	const lastTime = useRef(0);
	const reducedMotion = useRef(false);
	const [motionReduced, setMotionReduced] = useState(false);
	const [measuredWidth, setMeasuredWidth] = useState(0);
	const fillMotion = useMotionValue(0);
	const fillInitialized = useRef(false);
	const [animatedFillX, setAnimatedFillX] = useState(0);
	useMotionValueEvent(fillMotion, "change", setAnimatedFillX);
	const target = useRef({ x: 0, height: 0 });
	const trackWidth = useRef(1);
	const gradientId = useId().replace(/:/g, "");
	const spring = useRef({
		x: { position: 0, velocity: 0 },
		height: { position: 0, velocity: 0 },
	});
	const [pressed, setPressed] = useState(false);
	const pressStarted = useRef(0);
	const pressRelease = useRef<ReturnType<typeof setTimeout> | null>(null);
	const beginPress = () => {
		if (pressRelease.current !== null) clearTimeout(pressRelease.current);
		pressStarted.current = performance.now();
		setPressed(true);
	};
	const endPress = () => {
		if (pressRelease.current !== null) clearTimeout(pressRelease.current);
		const remaining = reducedMotion.current ? 0 : Math.max(0, 240 - (performance.now() - pressStarted.current));
		pressRelease.current = setTimeout(() => {
			setPressed(false);
			pressRelease.current = null;
		}, remaining);
	};
	const [visual, setVisual] = useState({ x: 0, height: 0 });
	const [selectedStep, setSelectedStep] = useState(currentStep);
	const selectedStepRef = useRef(currentStep);
	const touchActive = useRef(false);

	const updateTarget = (clientX: number, distance: number, forceHeight = false) => {
		const bounds = root.current?.getBoundingClientRect();
		if (!bounds || disabled) return;
		const x = Math.min(bounds.width, Math.max(0, clientX - bounds.left));
		trackWidth.current = bounds.width;
		target.current.x = x;
		target.current.height = forceHeight ? PROGRESS_MOUND_MAX_HEIGHT : progressMoundHeight(distance);
		const step = stepFromProgressPosition(x, bounds.width, totalSteps);
		selectedStepRef.current = step;
		setSelectedStep(step);
		if (reducedMotion.current) {
			spring.current.x.position = target.current.x;
			spring.current.height.position = target.current.height;
			setVisual({ x: target.current.x, height: target.current.height });
			return;
		}
		startSpring();
	};

	const startSpring = () => {
		if (frame.current !== null) return;
		lastTime.current = performance.now();
		frame.current = requestAnimationFrame(animate);
	};

	const animate = (time: number) => {
		const elapsed = Math.min((time - lastTime.current) / 1000, 0.032);
		lastTime.current = time;
		settle(spring.current.x, target.current.x, elapsed, 420, 34);
		settle(spring.current.height, target.current.height, elapsed, 520, 38);
		const next = {
			x: spring.current.x.position,
			height: Math.max(0, spring.current.height.position),
		};
		setVisual(next);
		const moving =
			Math.abs(target.current.x - next.x) > 0.05 ||
			Math.abs(spring.current.x.velocity) > 0.05 ||
			Math.abs(target.current.height - next.height) > 0.05 ||
			Math.abs(spring.current.height.velocity) > 0.05;
		if (moving) frame.current = requestAnimationFrame(animate);
		else {
			spring.current.x.position = target.current.x;
			spring.current.height.position = target.current.height;
			setVisual({ x: target.current.x, height: target.current.height });
			frame.current = null;
		}
	};

	const collapse = () => {
		target.current.height = 0;
		if (reducedMotion.current) {
			spring.current.height.position = 0;
			setVisual((current) => ({ ...current, height: 0 }));
		} else startSpring();
	};

	useEffect(() => {
		const element = root.current;
		if (!element) return;
		const resize = () => {
			const width = element.getBoundingClientRect().width;
			setMeasuredWidth(width);
			if (width === trackWidth.current) return;
			trackWidth.current = width;
			const x = Math.min(width, Math.max(0, target.current.x));
			target.current = { x, height: 0 };
			spring.current = { x: { position: x, velocity: 0 }, height: { position: 0, velocity: 0 } };
			setVisual({ x, height: 0 });
		};
		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const readMotion = () => { reducedMotion.current = motion.matches; setMotionReduced(motion.matches); };
		readMotion();
		motion.addEventListener("change", readMotion);
		return () => motion.removeEventListener("change", readMotion);
	}, []);

	useEffect(() => {
		if (measuredWidth <= 0) return;
		const destination = progressFillPosition(progress, measuredWidth, totalSteps);
		if (!fillInitialized.current || motionReduced) {
			fillInitialized.current = true;
			fillMotion.set(destination);
			return;
		}
		// The rail, mound gradient, and number use this one animated coordinate.
		// Preserve the accepted rail timing without a separate CSS interpolation.
		const animation = animateFill(fillMotion, destination, {
			duration: 0.65,
			ease: [0.22, 1, 0.36, 1],
		});
		return () => animation.stop();
	}, [fillMotion, measuredWidth, motionReduced, progress, totalSteps]);

	useEffect(() => {
		if (disabled) {
			collapse();
			return;
		}
		const pointerMove = (event: PointerEvent) => {
			if (event.pointerType === "touch" || touchActive.current) return;
			const bounds = root.current?.getBoundingClientRect();
			if (!bounds) return;
			const distance = event.clientY - bounds.top;
			if (distance < 0 || distance > 100 || event.clientX < bounds.left || event.clientX > bounds.right) collapse();
			else updateTarget(event.clientX, distance);
		};
		const pointerLeave = () => collapse();
		window.addEventListener("pointermove", pointerMove, { passive: true });
		document.documentElement.addEventListener("mouseleave", pointerLeave);
		window.addEventListener("blur", pointerLeave);
		return () => {
			window.removeEventListener("pointermove", pointerMove);
			document.documentElement.removeEventListener("mouseleave", pointerLeave);
			window.removeEventListener("blur", pointerLeave);
		};
	}, [disabled, totalSteps]);

	useEffect(() => {
		selectedStepRef.current = currentStep;
		setSelectedStep(currentStep);
	}, [currentStep]);

	useEffect(() => () => {
		if (frame.current !== null) cancelAnimationFrame(frame.current);
		if (pressRelease.current !== null) clearTimeout(pressRelease.current);
	}, []);

	const activate = () => {
		if (disabled || visual.height < 16) return;
		onNavigate(selectedStepRef.current);
	};

	const mound = progressMoundLayout(visual.x, visual.height, trackWidth.current);
	const path = progressMoundPath(mound.center, mound.height, trackWidth.current);
	// Overlap the 3px rail by 1 CSS pixel to avoid an antialiased seam at fractional positions.
	// Preserve the original total mound height.
	const railDepth = Math.min(2, mound.height);
	const moundScale = mound.height > 3 ? (mound.height - 2) / mound.height : 0;
	const labelOpacity = Math.min(1, Math.max(0, (visual.height - 17) / 9));
	const labelTop = Math.max(-2, mound.height / 2 - 10);
	const progressBoundary = Math.min(trackWidth.current, Math.max(0, animatedFillX));
	const fillPercent = progressFillPercent(progressBoundary, trackWidth.current);
	const labelSplit = Math.min(100, Math.max(0, ((progressBoundary - (mound.labelX - 22)) / 44) * 100));
	const labelStyle = {
		left: mound.labelX,
		opacity: labelOpacity,
		top: labelTop,
		backgroundImage: `linear-gradient(90deg, var(--cover-ink) 0%, var(--cover-ink) ${labelSplit}%, var(--ink) ${labelSplit}%, var(--ink) 100%)`,
	} as CSSProperties;

	return (
		<div ref={root} className="progress-navigator" data-visible={visual.height > 0.5} data-pressed={pressed}>
			<div
				className="progress-track"
				role="progressbar"
				aria-label={copy.progress}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress)}
			>
				<div style={{ width: progressBoundary, maxWidth: "100%", transition: "none" }} />
			</div>
			<svg className="progress-mound" width="100%" height="44" aria-hidden="true">
				<defs>
					<linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2={trackWidth.current}>
						<stop offset={`${fillPercent}%`} stopColor="var(--accent)" />
						<stop offset={`${fillPercent}%`} stopColor="var(--progress-muted)" />
					</linearGradient>
				</defs>
				<path d={path} transform={`translate(0 ${railDepth}) scale(1 ${moundScale})`} fill={`url(#${gradientId})`} />
			</svg>
			<button
				type="button"
				className="progress-mound-button"
				aria-label={message((includesSections && copy.goSlide) || copy.goQuestion, { count: selectedStep })}
				aria-hidden={disabled || visual.height < 16}
				disabled={disabled || visual.height < 16}
				onPointerDown={beginPress}
				onPointerUp={endPress}
				onPointerCancel={endPress}
				onPointerLeave={endPress}
				onClick={(event) => {
					if (event.detail === 0) { beginPress(); endPress(); }
					activate();
				}}
				style={labelStyle}
			>
				{selectedStep}
			</button>
			<div
				className="progress-touch-zone"
				onPointerDown={(event) => {
					if (disabled || event.pointerType === "mouse") return;
					touchActive.current = true;
					beginPress();
					event.currentTarget.setPointerCapture(event.pointerId);
					updateTarget(event.clientX, 0, true);
				}}
				onPointerMove={(event) => {
					if (!touchActive.current || event.pointerType === "mouse") return;
					updateTarget(event.clientX, 0, true);
				}}
				onPointerUp={(event) => {
					if (!touchActive.current) return;
					touchActive.current = false;
					endPress();
					event.currentTarget.releasePointerCapture(event.pointerId);
					onNavigate(selectedStepRef.current);
				}}
				onPointerCancel={() => {
					touchActive.current = false;
					endPress();
					collapse();
				}}
			/>
		</div>
	);
}

export type StepProgressLabelProps = {
	currentStep: number;
	onNavigate: (step: number) => void;
	totalSteps: number;
	includesSections?: boolean;
};

export function StepProgressLabel({ currentStep, onNavigate, totalSteps, includesSections }: StepProgressLabelProps) {
  const copy = useInterfaceCopy();
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(String(currentStep));
	const input = useRef<HTMLInputElement>(null);
	const button = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!editing) setValue(String(currentStep));
	}, [currentStep, editing]);

	const begin = () => {
		setValue(String(currentStep));
		setEditing(true);
		requestAnimationFrame(() => {
			input.current?.focus({ preventScroll: true });
			input.current?.select();
		});
	};

	const cancel = (returnFocus = false) => {
		setValue(String(currentStep));
		setEditing(false);
		if (returnFocus) requestAnimationFrame(() => button.current?.focus({ preventScroll: true }));
	};

	const commit = (explicit = false) => {
		const step = Number(value);
		if (!Number.isInteger(step) || step < 1 || step > totalSteps) {
			cancel(explicit);
			return;
		}
		setEditing(false);
		if (!explicit && step === currentStep) return;
		onNavigate(step);
	};

	const control = editing ? (
		<input
			ref={input}
			className="step-jump-input"
			aria-label={(includesSections && copy.slideNumber) || copy.questionNumber}
			inputMode="numeric"
			pattern="[0-9]*"
			value={value}
			onBlur={() => commit()}
			onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, String(totalSteps).length))}
			onKeyDown={(event) => {
				event.stopPropagation();
				if (event.key === "Enter") {
					event.preventDefault();
					commit(true);
				} else if (event.key === "Escape") {
					event.preventDefault();
					cancel(true);
				}
			}}
			style={{ width: `${Math.max(1, value.length)}ch` }}
		/>
	) : (
		<button
			ref={button}
			type="button"
			className="step-jump-button"
			aria-label={message((includesSections && copy.goSlide) || copy.goQuestion, { count: currentStep })}
			onClick={begin}
		>
			{currentStep}
		</button>
	);

	return <small aria-live="polite">{control} / {totalSteps}</small>;
}
