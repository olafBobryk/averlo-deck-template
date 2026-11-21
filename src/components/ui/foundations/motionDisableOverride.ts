"use client";

import * as React from "react";

const PREVIEW_OVERRIDES_CHANGED = "averlo-preview-overrides-changed";

export function getPreviewOverrides(search: string) {
	const params = new URLSearchParams(search);
	const off = (key: string) =>
		["off", "false"].includes(params.get(key)?.toLowerCase() ?? "");
	const motion = off("motion") || off("reveal");
	return { motion, loading: motion || off("intro") || off("loading") };
}

export function syncPreviewOverrides(search: string) {
	const overrides = getPreviewOverrides(search);
	const root = document.documentElement;
	for (const [attribute, disabled] of [
		["data-motion-override", overrides.motion],
		["data-loading-override", overrides.loading],
	] as const) {
		if (disabled) root.setAttribute(attribute, "off");
		else root.removeAttribute(attribute);
	}
	// Next client navigation does not emit popstate. Notify the shared store
	// after both attributes match the current URL, including when flags clear.
	window.dispatchEvent(new Event(PREVIEW_OVERRIDES_CHANGED));
}

export function hasMotionDisabledSearchParam() {
	return (
		typeof window !== "undefined" &&
		getPreviewOverrides(window.location.search).motion
	);
}

export function hasIntroDisabledSearchParam() {
	return (
		typeof window !== "undefined" &&
		getPreviewOverrides(window.location.search).loading
	);
}

function hasIntroDisabledDocumentOverride() {
	if (typeof document === "undefined") return false;
	return document.documentElement.dataset.loadingOverride === "off";
}

function hasMotionDisabledDocumentOverride() {
	if (typeof document === "undefined") return false;
	return document.documentElement.dataset.motionOverride === "off";
}

const subscribe = (onChange: () => void) => {
	window.addEventListener("popstate", onChange);
	window.addEventListener(PREVIEW_OVERRIDES_CHANGED, onChange);
	return () => {
		window.removeEventListener("popstate", onChange);
		window.removeEventListener(PREVIEW_OVERRIDES_CHANGED, onChange);
	};
};

const serverOverride = () => false;
const introOverride = () =>
	hasIntroDisabledDocumentOverride() || hasIntroDisabledSearchParam();
const motionOverride = () =>
	hasMotionDisabledDocumentOverride() || hasMotionDisabledSearchParam();

export function useIntroDisableOverride() {
	return React.useSyncExternalStore(subscribe, introOverride, serverOverride);
}

export function useMotionDisableOverride() {
	return React.useSyncExternalStore(subscribe, motionOverride, serverOverride);
}
