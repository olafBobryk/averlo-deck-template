// components/branding/Logo.tsx
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import Link from "next/link";
import type * as React from "react";
import { focusRing } from "../ui/foundations/focus";

const logoStyles = cva(
	clsx(
		"inline-flex items-center shrink-0 transition-opacity motion-micro rounded-sm",
		focusRing.visibleDefault,
	),
	{
		variants: {
			variant: {
				full: "",
				mark: "",
			},
			size: {
				sm: "",
				md: "",
				lg: "",
			},
			tone: {
				light: "text-background",
				dark: "text-foreground",
			},
			interactive: {
				true: "cursor-pointer hover:opacity-80",
				false: "",
			},
		},
		compoundVariants: [
			{ variant: "full", size: "sm", class: "h-[24px] w-[86px]" },
			{ variant: "full", size: "md", class: "h-[36px] w-[129px]" },
			{ variant: "full", size: "lg", class: "h-[48px] w-[172px]" },
			{ variant: "mark", size: "sm", class: "h-[24px] w-[23px]" },
			{ variant: "mark", size: "md", class: "h-[36px] w-[34px]" },
			{ variant: "mark", size: "lg", class: "h-[48px] w-[46px]" },
		],
		defaultVariants: {
			variant: "full",
			size: "md",
			tone: "dark",
			interactive: true,
		},
	},
);

type LogoOwnProps = {
	href?: string;
	title?: string;
	className?: string;
	logoClassName?: string;
	interactive?: boolean;
	focusable?: boolean;
} & VariantProps<typeof logoStyles>;

type LogoProps<T extends React.ElementType = "span"> = LogoOwnProps & {
	as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, keyof LogoOwnProps | "as">;

export default function Logo<T extends React.ElementType = "span">({
	as,
	href: hrefProp,
	variant,
	size,
	tone,
	title,
	className,
	logoClassName,
	interactive = true,
	focusable = true,
	...rest
}: LogoProps<T>) {
	const href = hrefProp === undefined ? "/" : hrefProp;
	const hasClick = Boolean(
		(rest as { onClick?: React.MouseEventHandler }).onClick,
	);
	const Tag = (as ??
		(href ? Link : hasClick ? "button" : "span")) as React.ElementType;
	const isButton = Tag === "button";
	const hasInteractiveSurface = Boolean(
		href || hasClick || Tag === "button" || Tag === "a" || Tag === Link,
	);
	const isInteractive = interactive && hasInteractiveSurface;
	const ariaLabel =
		(rest as { "aria-label"?: string })["aria-label"] ??
		(href ? "Go to homepage" : "Logo");

	const resolvedVariant = variant ?? "full";
	const resolvedSize = size ?? "md";
	const resolvedTone = tone ?? "dark";

	const mergedClassName = clsx(
		logoStyles({
			variant: resolvedVariant,
			size: resolvedSize,
			tone: resolvedTone,
			interactive: isInteractive,
		}),
		className,
	);

	const svgTitle = title ?? (resolvedVariant === "full" ? "logo" : "logo mark");

	const logo =
		resolvedVariant === "mark" ? (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="100%"
				height="100%"
				viewBox="0 0 40 42"
				className={clsx("h-full w-full", logoClassName)}
			>
				<title>{svgTitle}</title>
				{/* TODO: Replace paths with your brand's logomark */}
				<path
					fill="currentColor"
					d="M27.677 0H16.065L1.5 25.566C-1.44 30.82.168 34.338 4.352 40.845l17.723-30.557 5.907 9.982C33.134 13.136 34.49 9.063 27.677 0Zm-3.159 35.14c-1.826-4.956-.655-8.647 3.482-14.894l12 20.802H27.981l-3.463-5.907Z"
				/>
			</svg>
		) : (
			<span
				className={clsx(
					"block h-full w-full rounded-sm border border-danger",
					logoClassName,
				)}
				aria-hidden="true"
				title={svgTitle}
			/>
		);

	if (isButton) {
		const { type, disabled, tabIndex, ...buttonRest } =
			rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
		return (
			<button
				type={type ?? "button"}
				className={mergedClassName}
				aria-label={ariaLabel}
				disabled={disabled || !interactive}
				tabIndex={disabled || !interactive ? -1 : focusable ? tabIndex : -1}
				{...buttonRest}
			>
				{logo}
			</button>
		);
	}

	const { onClick, tabIndex, ...tagRest } =
		rest as React.HTMLAttributes<HTMLElement> & {
			onClick?: React.MouseEventHandler<HTMLElement>;
			tabIndex?: number;
		};

	return (
		<Tag
			className={mergedClassName}
			aria-label={ariaLabel}
			aria-disabled={hasInteractiveSurface && !interactive ? true : undefined}
			role={Tag === "span" ? "img" : undefined}
			tabIndex={
				hasInteractiveSurface
					? interactive && focusable
						? tabIndex
						: -1
					: tabIndex
			}
			{...(Tag === Link ? { href } : Tag === "a" && href ? { href } : {})}
			onClick={
				interactive
					? onClick
					: hasInteractiveSurface
						? (event: React.MouseEvent<HTMLElement>) => {
								event.preventDefault();
								event.stopPropagation();
							}
						: onClick
			}
			{...tagRest}
		>
			{logo}
		</Tag>
	);
}
