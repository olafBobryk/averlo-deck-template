import { getSpringCssTiming } from "@/components/ui/foundations/spring";

export type AppearancePreference = "system" | "light" | "dark";
export type ResolvedAppearance = "light" | "dark";
export type AppearanceTransitionOrigin = { x: number; y: number };

export type AppearanceChangeOptions = {
	animated?: boolean;
	origin?: AppearanceTransitionOrigin;
	/**
	 * Extra DOM work committed together with the appearance, inside the same
	 * transition, so the radial reveal shows the new state over the old one.
	 * Must update the DOM synchronously (for React state, wrap it in flushSync).
	 */
	update?: () => void;
};

export const APP_SETTINGS_STORAGE_KEY = "averlo-ui-settings";
export const PREVIOUS_SITE_THEME_STORAGE_KEY = "averlo-site-theme";
export const DEFAULT_APPEARANCE: AppearancePreference = "light";

const THEME_COLORS: Record<ResolvedAppearance, string> = {
	dark: "#03050a",
	light: "#ffffff",
};
// Quicker than the macro spring so theme changes feel immediate.
const APPEARANCE_RADIAL_TIMING = getSpringCssTiming("interaction");

type ViewTransitionHandle = {
	finished: Promise<void>;
	ready?: Promise<void>;
	updateCallbackDone?: Promise<void>;
};

type ViewTransitionDocument = Document & {
	startViewTransition?: (update: () => void) => ViewTransitionHandle;
};

let activeAppearanceTransition: ViewTransitionHandle | null = null;
let switchingStartFrame = 0;
let switchingEndFrame = 0;

export function isAppearancePreference(
	value: unknown,
): value is AppearancePreference {
	return value === "system" || value === "light" || value === "dark";
}

export function isResolvedAppearance(
	value: unknown,
): value is ResolvedAppearance {
	return value === "light" || value === "dark";
}

export function resolveAppearance(
	appearance: AppearancePreference,
	prefersDark: boolean,
): ResolvedAppearance {
	return appearance === "system"
		? prefersDark
			? "dark"
			: "light"
		: appearance;
}

export function syncDocumentThemeColor(
	resolvedAppearance: ResolvedAppearance = document.documentElement.dataset
		.resolvedAppearance === "dark"
		? "dark"
		: "light",
) {
	const root = document.documentElement;
	const foreground = getComputedStyle(root)
		.getPropertyValue("--color-foreground-rgb")
		.trim()
		.split(/\s+/)
		.join(", ");
	const color =
		root.hasAttribute("data-footer-canvas") && foreground
			? `rgb(${foreground})`
			: THEME_COLORS[resolvedAppearance];
	document
		.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
		.forEach((meta) => {
			meta.content = color;
		});
}

function scheduleTransitionRestore() {
	window.cancelAnimationFrame(switchingStartFrame);
	window.cancelAnimationFrame(switchingEndFrame);
	switchingStartFrame = window.requestAnimationFrame(() => {
		switchingEndFrame = window.requestAnimationFrame(() => {
			delete document.documentElement.dataset.themeSwitching;
		});
	});
}

export function applyDocumentAppearance({
	appearance,
	atomic = false,
	resolvedAppearance,
}: {
	appearance: AppearancePreference;
	atomic?: boolean;
	resolvedAppearance: ResolvedAppearance;
}) {
	const root = document.documentElement;
	if (atomic) root.dataset.themeSwitching = "true";
	root.dataset.appearance = appearance;
	root.dataset.resolvedAppearance = resolvedAppearance;
	root.classList.toggle("dark", resolvedAppearance === "dark");
	root.style.colorScheme = resolvedAppearance;
	syncDocumentThemeColor(resolvedAppearance);
	if (atomic) scheduleTransitionRestore();
}

function clearRadialTransitionState() {
	const root = document.documentElement;
	delete root.dataset.appearanceTransition;
	delete root.dataset.appearanceTransitionDirection;
	root.style.removeProperty("--appearance-transition-duration");
	root.style.removeProperty("--appearance-transition-ease");
	root.style.removeProperty("--appearance-transition-x");
	root.style.removeProperty("--appearance-transition-y");
	root.style.removeProperty("--appearance-transition-radius");
}

export function commitAppearanceChange({
	appearance,
	animated = false,
	origin,
	resolvedAppearance,
	update,
}: {
	appearance: AppearancePreference;
	resolvedAppearance: ResolvedAppearance;
} & AppearanceChangeOptions) {
	if (activeAppearanceTransition) return false;

	const commit = () => {
		applyDocumentAppearance({
			appearance,
			atomic: true,
			resolvedAppearance,
		});
		update?.();
	};
	const viewTransitionDocument = document as ViewTransitionDocument;
	const startViewTransition = viewTransitionDocument.startViewTransition?.bind(
		viewTransitionDocument,
	);

	if (!animated || !origin || !startViewTransition) {
		commit();
		return true;
	}

	const root = document.documentElement;
	const x = Math.min(Math.max(origin.x, 0), window.innerWidth);
	const y = Math.min(Math.max(origin.y, 0), window.innerHeight);
	const radius = Math.hypot(
		Math.max(x, window.innerWidth - x),
		Math.max(y, window.innerHeight - y),
	);

	root.dataset.appearanceTransition = "radial";
	root.dataset.appearanceTransitionDirection =
		resolvedAppearance === "dark" ? "in" : "out";
	root.style.setProperty(
		"--appearance-transition-duration",
		APPEARANCE_RADIAL_TIMING.duration,
	);
	root.style.setProperty(
		"--appearance-transition-ease",
		APPEARANCE_RADIAL_TIMING.ease,
	);
	// Percentages of the viewport-sized root snapshot rather than pixels: some
	// Chromium hosts (e.g. embedded browser panes at 2x) resolve pixel clip
	// coordinates against device pixels, which put the circle at half the
	// click position. A circle radius percentage is relative to the box
	// diagonal divided by the square root of two.
	const width = window.innerWidth || 1;
	const height = window.innerHeight || 1;
	root.style.setProperty("--appearance-transition-x", `${(x / width) * 100}%`);
	root.style.setProperty("--appearance-transition-y", `${(y / height) * 100}%`);
	root.style.setProperty(
		"--appearance-transition-radius",
		`${(radius / (Math.hypot(width, height) / Math.SQRT2)) * 100}%`,
	);

	try {
		const transition = startViewTransition(commit);
		activeAppearanceTransition = transition;
		// A skipped or aborted transition (hidden tab, rapid change) rejects these;
		// the commit still runs, so the rejection is expected and handled here.
		transition.ready?.catch(() => {});
		transition.updateCallbackDone?.catch(() => {});
		void transition.finished.then(
			() => {
				activeAppearanceTransition = null;
				clearRadialTransitionState();
			},
			() => {
				activeAppearanceTransition = null;
				clearRadialTransitionState();
			},
		);
		return true;
	} catch {
		clearRadialTransitionState();
		commit();
		return true;
	}
}

export function clearDocumentAppearance() {
	window.cancelAnimationFrame(switchingStartFrame);
	window.cancelAnimationFrame(switchingEndFrame);
	activeAppearanceTransition = null;
	clearRadialTransitionState();
	const root = document.documentElement;
	root.classList.remove("dark");
	delete root.dataset.appearance;
	delete root.dataset.resolvedAppearance;
	delete root.dataset.themeSwitching;
	root.style.colorScheme = "";
	syncDocumentThemeColor(
		window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light",
	);
}

/**
 * The pre-paint appearance script. \`override\` is an optional function body
 * returning an appearance for this load (or null), e.g. a form resuming on a
 * dark step; it is stored like a choice the visitor made, so the settings
 * provider hydrates on it instead of switching back.
 */
export function createAppearanceBootstrapScript(override = "return null;") {
	return `
(() => {
	try {
		if (/^\\/admin(?:\\/|$)/.test(window.location.pathname)) return;
		const settingsKey = ${JSON.stringify(APP_SETTINGS_STORAGE_KEY)};
		const previousThemeKey = ${JSON.stringify(PREVIOUS_SITE_THEME_STORAGE_KEY)};
		const isAppearance = (value) => value === "system" || value === "light" || value === "dark";
		let settings = {};
		try {
			settings = JSON.parse(window.localStorage.getItem(settingsKey) || "{}") || {};
		} catch {}
		let appearance = isAppearance(settings.appearance) ? settings.appearance : null;
		if (!appearance) {
			let previousAppearance = null;
			try {
				previousAppearance = window.localStorage.getItem(previousThemeKey);
			} catch {}
			appearance = previousAppearance === "light" || previousAppearance === "dark"
				? previousAppearance
				: ${JSON.stringify(DEFAULT_APPEARANCE)};
			try {
				window.localStorage.setItem(settingsKey, JSON.stringify({ ...settings, appearance }));
			} catch {}
		}
		let forced = null;
		try {
			forced = (() => { ${override} })();
		} catch {}
		if (isAppearance(forced) && forced !== appearance) {
			appearance = forced;
			try {
				window.localStorage.setItem(settingsKey, JSON.stringify({ ...settings, appearance }));
			} catch {}
		}
		const resolvedAppearance = appearance === "system"
			? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
			: appearance;
		const textScale = typeof settings.textScale === "number" && Number.isFinite(settings.textScale) && settings.textScale > 0
			? settings.textScale
			: 1;
		const root = document.documentElement;
		root.dataset.appearance = appearance;
		root.dataset.resolvedAppearance = resolvedAppearance;
		root.classList.toggle("dark", resolvedAppearance === "dark");
		root.style.colorScheme = resolvedAppearance;
		root.style.setProperty("--text-scale", String(textScale));
		const themeColor = resolvedAppearance === "dark" ? "#03050a" : "#ffffff";
		document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
			meta.setAttribute("content", themeColor);
		});
	} catch {}
})();
`;
}
