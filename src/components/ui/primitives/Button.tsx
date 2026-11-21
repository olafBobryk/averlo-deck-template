"use client";

import clsx from "clsx";
import Link from "next/link";
import * as React from "react";
import { focusRing } from "@/components/ui/foundations/focus";
import { LoadingSpinner } from "@/components/ui/primitives/LoadingSpinner";
import {
	Text,
	type TextProps,
	textVariants,
} from "@/components/ui/primitives/Text";

export type ButtonVariant =
	| "default"
	| "accent"
	| "ghost"
	| "inlineText"
	| "primary"
	| "outline"
	| "chip"
	| "social"
	| "socialOutline";
export type ButtonTone = "default" | "inverse";

type ButtonBaseProps = {
	align?: "left" | "center" | "between";
	children?: React.ReactNode;
	className?: string;
	disabled?: boolean;
	hitArea?: "none" | "touch";
	href?: string;
	leadingIcon?: React.ReactNode;
	loading?: boolean;
	size?:
		| "auto"
		| "sm"
		| "md"
		| "lg"
		| "icon"
		| "icon-sm"
		| "icon-social"
		| "icon-lg";
	textProps?: Omit<TextProps, "as" | "children">;
	tone?: ButtonTone;
	trailingIcon?: React.ReactNode;
	variant?: ButtonVariant;
};

type ButtonProps = ButtonBaseProps &
	Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> &
	Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps>;

function getButtonClassName({
	className,
	disabled,
	hitArea = "touch",
	loading,
	size = "md",
	tone = "default",
	variant = "default",
}: Pick<
	ButtonBaseProps,
	"className" | "disabled" | "hitArea" | "loading" | "size" | "tone" | "variant"
>) {
	return clsx(
		"group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-pill transition-colors motion-interactive",
		textVariants({ variant: "buttonLabel", tone: null }),
		focusRing.visibleDefault,
		"disabled:pointer-events-none",
		disabled && "cursor-not-allowed opacity-50",
		loading && "pointer-events-none cursor-wait",
		(variant === "default" || variant === "primary") &&
			tone === "default" &&
			"border border-foreground bg-foreground text-background hover:border-foreground-hover hover:bg-foreground-hover",
		(variant === "default" || variant === "primary") &&
			tone === "inverse" &&
			"border border-background bg-background text-foreground hover:border-background-hover hover:bg-background-hover",
		variant === "accent" &&
			"border border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover",
		variant === "ghost" &&
			"bg-background text-foreground hover:bg-background-hover",
		variant === "inlineText" &&
			"h-auto min-w-0 rounded-none bg-transparent p-0 text-inherit hover:bg-transparent",
		(variant === "outline" || variant === "chip") &&
			tone === "default" &&
			"border border-border bg-transparent text-foreground hover:border-foreground/35 hover:bg-foreground/5",
		(variant === "outline" || variant === "chip") &&
			tone === "inverse" &&
			"border border-background/15 bg-transparent text-background hover:border-background/35 hover:bg-background/5",
		variant === "social" &&
			tone === "default" &&
			"border border-border bg-transparent text-foreground hover:bg-foreground/5",
		variant === "social" &&
			tone === "inverse" &&
			"border border-background bg-background text-foreground hover:border-background-hover hover:bg-background-hover",
		variant === "socialOutline" &&
			tone === "default" &&
			"border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
		variant === "socialOutline" &&
			tone === "inverse" &&
			"border border-background bg-transparent text-background hover:bg-background hover:text-foreground",
		variant !== "inlineText" && size === "sm" && "h-8 px-4 py-0",
		variant !== "inlineText" &&
			size === "md" &&
			"h-11 min-w-[121px] px-[25px] py-0",
		variant !== "inlineText" && size === "lg" && "h-[50px] px-[30px] py-0",
		variant !== "inlineText" && size === "icon" && "size-[45px] p-0",
		variant !== "inlineText" && size === "icon-sm" && "size-7 p-0",
		variant !== "inlineText" && size === "icon-social" && "size-[30px] p-0",
		variant !== "inlineText" && size === "icon-lg" && "size-[100px] p-0",
		hitArea === "touch" &&
			"before:absolute before:top-1/2 before:left-1/2 before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
		className,
	);
}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
	function Button(
		{
			children,
			className,
			disabled = false,
			href,
			leadingIcon,
			hitArea,
			loading,
			size: _size,
			trailingIcon,
			type,
			variant = "default",
			textProps,
			tone,
			align: _align,
			...rest
		},
		ref,
	) {
		const isLoading = Boolean(loading);
		const resolvedHitArea =
			hitArea ?? (variant === "inlineText" ? "none" : undefined);
		const contentAlignClass =
			_align === "left"
				? "justify-start text-left"
				: _align === "between"
					? "justify-between text-left"
					: "justify-center text-center";
		const content = (
			<span
				className={clsx(
					"inline-flex max-w-full items-center gap-[var(--button-content-gap,0.5rem)] transition-opacity motion-micro group-data-[loading=true]:opacity-0",
					_align === "between" || _align === "center" ? "w-full" : "w-fit",
					contentAlignClass,
				)}
			>
				{leadingIcon}
				{children ? (
					textProps ? (
						<Text as="span" {...textProps}>
							{children}
						</Text>
					) : (
						<span>{children}</span>
					)
				) : null}
				{trailingIcon}
			</span>
		);
		const loadingIndicator =
			loading !== undefined ? (
				<span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity motion-micro group-data-[loading=true]:opacity-100">
					<LoadingSpinner />
				</span>
			) : null;
		const resolvedClassName = getButtonClassName({
			className,
			disabled,
			hitArea: resolvedHitArea,
			loading: isLoading,
			size: _size,
			tone,
			variant,
		});

		if (href) {
			return (
				<Link
					ref={ref as React.Ref<HTMLAnchorElement>}
					href={href}
					aria-disabled={disabled || isLoading}
					data-loading={isLoading ? "true" : undefined}
					className={resolvedClassName}
					{...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
				>
					{content}
					{loadingIndicator}
				</Link>
			);
		}

		return (
			<button
				ref={ref as React.Ref<HTMLButtonElement>}
				type={type ?? "button"}
				disabled={disabled || isLoading}
				data-loading={isLoading ? "true" : undefined}
				className={resolvedClassName}
				{...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
			>
				{content}
				{loadingIndicator}
			</button>
		);
	},
);
