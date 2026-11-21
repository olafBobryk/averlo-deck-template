"use client";

import clsx from "clsx";
import type * as React from "react";
import { focusRing } from "./focus.js";

type LogoProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
	tone?: "light" | "dark";
	variant?: "mark";
};

export default function Logo({
	className,
	tone = "dark",
	variant = "mark",
	...rest
}: LogoProps) {
	return (
		<a
			className={clsx(
				"inline-flex shrink-0 items-center transition-opacity motion-micro hover:opacity-80",
				focusRing.visibleDefault,
				tone === "light" ? "text-background" : "text-foreground",
				className,
			)}
			{...rest}
		>
			<LogoMark className="h-full w-full" />
		</a>
	);
}

export function LogoMark({ className }: { className?: string }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 40 42" className={className}>
				<path
					fill="currentColor"
					d="M27.677 0H16.065L1.5 25.566C-1.44 30.82.168 34.338 4.352 40.845l17.723-30.557 5.907 9.982C33.134 13.136 34.49 9.063 27.677 0Zm-3.159 35.14c-1.826-4.956-.655-8.647 3.482-14.894l12 20.802H27.981l-3.463-5.907Z"
				/>
			</svg>
	);
}
