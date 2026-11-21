"use client";

import * as React from "react";
import { SCROLL_CONFIG } from "@/config/scrollConfig";
import {
	APP_SETTINGS_STORAGE_KEY,
	type AppearanceChangeOptions,
	type AppearancePreference,
	applyDocumentAppearance,
	clearDocumentAppearance,
	commitAppearanceChange,
	DEFAULT_APPEARANCE,
	isAppearancePreference,
	isResolvedAppearance,
	PREVIOUS_SITE_THEME_STORAGE_KEY,
	type ResolvedAppearance,
	resolveAppearance,
} from "./appearance";

type SettingsContextValue = {
	appearance: AppearancePreference;
	motionDisabled: boolean;
	resolvedAppearance: ResolvedAppearance;
	/** Returns false when a running transition refuses the change. */
	setAppearance: (
		value: AppearancePreference,
		options?: AppearanceChangeOptions,
	) => boolean;
	setMotionDisabled: (value: boolean) => void;
	smoothScrollAvailable: boolean;
	smoothScrollDisabled: boolean;
	setSmoothScrollDisabled: (value: boolean) => void;
	textScale: number;
	setTextScale: (value: number) => void;
};

type SettingsProviderProps = {
	children: React.ReactNode;
	defaultAppearance?: AppearancePreference;
	defaultMotionDisabled?: boolean;
	defaultSmoothScrollDisabled?: boolean;
	defaultTextScale?: number;
	storageKey?: string | null;
};

type StoredSettings = {
	appearance?: AppearancePreference;
	motionDisabled?: boolean;
	smoothScrollDisabled?: boolean;
	textScale?: number;
};

const SettingsContext = React.createContext<SettingsContextValue | undefined>(
	undefined,
);

const isValidTextScale = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value) && value > 0;

const readStoredSettings = (storageKey: string) => {
	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredSettings;
		if (typeof parsed !== "object" || parsed === null) return null;
		return parsed;
	} catch {
		return null;
	}
};

const readLegacyAppearance = () => {
	try {
		const appearance = localStorage.getItem(PREVIOUS_SITE_THEME_STORAGE_KEY);
		return appearance === "light" || appearance === "dark" ? appearance : null;
	} catch {
		return null;
	}
};

const writeStoredSettings = (storageKey: string, settings: StoredSettings) => {
	try {
		localStorage.setItem(storageKey, JSON.stringify(settings));
	} catch {
		// Ignore storage failures (private mode, quota, etc.).
	}
};

export function SettingsProvider({
	children,
	defaultAppearance = DEFAULT_APPEARANCE,
	defaultMotionDisabled = false,
	defaultSmoothScrollDisabled = false,
	defaultTextScale = 1,
	storageKey = APP_SETTINGS_STORAGE_KEY,
}: SettingsProviderProps) {
	const smoothScrollAvailable = SCROLL_CONFIG.enableSmoothScroll;
	const [appearance, setAppearanceState] =
		React.useState<AppearancePreference>(defaultAppearance);
	const [motionDisabled, setMotionDisabled] = React.useState(
		defaultMotionDisabled,
	);
	const [resolvedAppearance, setResolvedAppearance] =
		React.useState<ResolvedAppearance>(() =>
			resolveAppearance(
				defaultAppearance,
				typeof window !== "undefined" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches,
			),
		);
	const [smoothScrollDisabled, setSmoothScrollDisabled] = React.useState(
		smoothScrollAvailable ? defaultSmoothScrollDisabled : true,
	);
	const [textScale, setTextScale] = React.useState(defaultTextScale);
	const [hasHydrated, setHasHydrated] = React.useState(false);
	const clearAppearanceFrame = React.useRef(0);

	const setAppearance = React.useCallback(
		(
			nextAppearance: AppearancePreference,
			options: AppearanceChangeOptions = {},
		) => {
			const nextResolvedAppearance = resolveAppearance(
				nextAppearance,
				window.matchMedia("(prefers-color-scheme: dark)").matches,
			);
			const accepted = commitAppearanceChange({
				appearance: nextAppearance,
				animated:
					options.animated && nextResolvedAppearance !== resolvedAppearance,
				origin: options.origin,
				resolvedAppearance: nextResolvedAppearance,
				update: options.update,
			});

			if (!accepted) return false;
			setAppearanceState(nextAppearance);
			setResolvedAppearance(nextResolvedAppearance);
			return true;
		},
		[resolvedAppearance],
	);

	React.useLayoutEffect(() => {
		if (!storageKey || !hasHydrated) return;
		writeStoredSettings(storageKey, {
			appearance,
			motionDisabled,
			smoothScrollDisabled,
			textScale,
		});
	}, [
		appearance,
		hasHydrated,
		motionDisabled,
		smoothScrollDisabled,
		textScale,
		storageKey,
	]);

	React.useEffect(() => {
		if (!hasHydrated) return;
		document.documentElement.style.setProperty(
			"--text-scale",
			String(textScale),
		);

		return () => {
			document.documentElement.style.removeProperty("--text-scale");
		};
	}, [hasHydrated, textScale]);

	React.useLayoutEffect(() => {
		const stored = storageKey ? readStoredSettings(storageKey) : null;
		const storedAppearance = stored?.appearance;
		const hasStoredAppearance = isAppearancePreference(storedAppearance);
		const nextAppearance = storageKey
			? hasStoredAppearance
				? storedAppearance
				: (readLegacyAppearance() ?? defaultAppearance)
			: defaultAppearance;
		const documentAppearance = document.documentElement.dataset.appearance;
		const documentResolvedAppearance =
			document.documentElement.dataset.resolvedAppearance;
		const shouldUseDocumentAppearance =
			Boolean(storageKey) &&
			documentAppearance === nextAppearance &&
			isResolvedAppearance(documentResolvedAppearance);
		const nextResolvedAppearance = shouldUseDocumentAppearance
			? documentResolvedAppearance
			: resolveAppearance(
					nextAppearance,
					window.matchMedia("(prefers-color-scheme: dark)").matches,
				);

		if (storageKey && !hasStoredAppearance) {
			writeStoredSettings(storageKey, {
				...stored,
				appearance: nextAppearance,
			});
		}
		setAppearanceState(nextAppearance);
		setResolvedAppearance(nextResolvedAppearance);
		applyDocumentAppearance({
			appearance: nextAppearance,
			atomic: true,
			resolvedAppearance: nextResolvedAppearance,
		});
		if (typeof stored?.motionDisabled === "boolean") {
			setMotionDisabled(stored.motionDisabled);
		}
		if (
			smoothScrollAvailable &&
			typeof stored?.smoothScrollDisabled === "boolean"
		) {
			setSmoothScrollDisabled(stored.smoothScrollDisabled);
		} else if (!smoothScrollAvailable) {
			setSmoothScrollDisabled(true);
		}
		const nextTextScale = isValidTextScale(stored?.textScale)
			? stored.textScale
			: defaultTextScale;
		document.documentElement.style.setProperty(
			"--text-scale",
			String(nextTextScale),
		);
		setTextScale(nextTextScale);
		setHasHydrated(true);
	}, [defaultAppearance, defaultTextScale, storageKey]);

	React.useEffect(() => {
		if (appearance !== "system") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			const nextResolvedAppearance = resolveAppearance("system", media.matches);
			if (nextResolvedAppearance === resolvedAppearance) return;
			applyDocumentAppearance({
				appearance: "system",
				atomic: true,
				resolvedAppearance: nextResolvedAppearance,
			});
			setResolvedAppearance(nextResolvedAppearance);
		};
		media.addEventListener("change", handleChange);
		return () => media.removeEventListener("change", handleChange);
	}, [appearance, resolvedAppearance]);

	React.useEffect(() => {
		window.cancelAnimationFrame(clearAppearanceFrame.current);
		return () => {
			clearAppearanceFrame.current = window.requestAnimationFrame(() => {
				clearDocumentAppearance();
			});
		};
	}, []);

	React.useEffect(() => {
		if (!storageKey) return;
		const handleStorage = (event: StorageEvent) => {
			if (event.key !== storageKey) return;
			const stored = readStoredSettings(storageKey);
			const nextAppearance = isAppearancePreference(stored?.appearance)
				? stored.appearance
				: (readLegacyAppearance() ?? defaultAppearance);
			const nextResolvedAppearance = resolveAppearance(
				nextAppearance,
				window.matchMedia("(prefers-color-scheme: dark)").matches,
			);
			applyDocumentAppearance({
				appearance: nextAppearance,
				atomic: nextResolvedAppearance !== resolvedAppearance,
				resolvedAppearance: nextResolvedAppearance,
			});
			setAppearanceState(nextAppearance);
			setResolvedAppearance(nextResolvedAppearance);
			if (typeof stored?.motionDisabled === "boolean") {
				setMotionDisabled(stored.motionDisabled);
			}
			if (
				smoothScrollAvailable &&
				typeof stored?.smoothScrollDisabled === "boolean"
			) {
				setSmoothScrollDisabled(stored.smoothScrollDisabled);
			} else if (!smoothScrollAvailable) {
				setSmoothScrollDisabled(true);
			}
			setTextScale(
				isValidTextScale(stored?.textScale)
					? stored.textScale
					: defaultTextScale,
			);
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [defaultAppearance, defaultTextScale, resolvedAppearance, storageKey]);

	return (
		<SettingsContext.Provider
			value={{
				appearance,
				motionDisabled,
				resolvedAppearance,
				setAppearance,
				setMotionDisabled,
				smoothScrollAvailable,
				smoothScrollDisabled,
				setSmoothScrollDisabled: smoothScrollAvailable
					? setSmoothScrollDisabled
					: () => {},
				textScale,
				setTextScale,
			}}
		>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettingsContext() {
	return React.useContext(SettingsContext);
}
