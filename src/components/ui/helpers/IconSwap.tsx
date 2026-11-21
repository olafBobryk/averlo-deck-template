"use client";

import clsx from "clsx";
import * as React from "react";

type IconSwapItem = {
	activeClassName?: string;
	className?: string;
	icon: React.ReactNode;
	inactiveClassName?: string;
	key?: React.Key;
};

type IconSwapSize = "sm" | "md" | "lg";

type IconSwapProps = {
	activeIndex: number;
	className?: string;
	items: IconSwapItem[];
	size?: IconSwapSize;
	transitionClassName?: string;
};

const sizeClasses: Record<IconSwapSize, string> = {
	sm: "h-[15px] w-[15px]",
	md: "h-5 w-5",
	lg: "h-6 w-6",
};

const getIconSwapItemKey = (item: IconSwapItem): React.Key => {
	if (item.key != null) return item.key;
	if (React.isValidElement<{ name?: unknown }>(item.icon)) {
		if (item.icon.key != null) return item.icon.key;
		if (typeof item.icon.props.name === "string") return item.icon.props.name;
	}
	return String(item.icon);
};

export function IconSwap({
	activeIndex,
	className,
	items,
	size = "md",
	transitionClassName,
}: IconSwapProps) {
	return (
		<span
			className={clsx(
				"relative flex shrink-0 items-center justify-center",
				className ? null : sizeClasses[size],
				className,
			)}
		>
			{items.map((item, index) => {
				const isActive = index === activeIndex;

				return (
					<span
						key={getIconSwapItemKey(item)}
						className={clsx(
							"absolute inset-0 flex items-center justify-center transition-all motion-micro",
							item.className ? null : sizeClasses[size],
							transitionClassName,
							isActive
								? clsx("scale-100 opacity-100", item.activeClassName)
								: clsx("scale-50 opacity-0", item.inactiveClassName),
							item.className,
						)}
					>
						{item.icon}
					</span>
				);
			})}
		</span>
	);
}
