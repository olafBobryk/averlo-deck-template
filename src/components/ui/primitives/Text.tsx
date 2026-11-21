import { cva } from "class-variance-authority";
import type * as React from "react";

// Averlo tracking policy: headings follow Figma-like -4% tracking, while
// body, labels, buttons, tags, numeric variants, and support text stay at zero.
// Figma shell/footer microcopy uses tight tracking with text-box trimming.
const headingTrackingClass = "tracking-[-0.04em]";
const softTrackingClass = "tracking-[-0.02em]";
const zeroTrackingClass = "tracking-normal";
const trimmedTextBoxClass =
	"[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";

export const textVariants = cva("", {
	variants: {
		variant: {
			display1: `font-semibold text-[80px] leading-none ${headingTrackingClass} md:text-[130px]`,
			display1Caps: `font-semibold text-[80px] leading-none ${headingTrackingClass} uppercase md:text-[130px]`,
			display2: `font-semibold text-[48px] leading-none ${headingTrackingClass} md:text-[80px]`,
			display2Medium: `font-medium text-[48px] leading-none ${headingTrackingClass} md:text-[80px]`,
			display2Caps: `font-semibold text-[48px] leading-none ${headingTrackingClass} uppercase md:text-[80px]`,
			heading1: `font-medium text-[55px] leading-none ${headingTrackingClass}`,
			// Fluid so each half of the site CTA fits its one-line action: the full
			// width when stacked, half the row from lg (about 10.4em at most).
			ctaAction: `font-medium text-[clamp(26px,8.5vw,55px)] leading-none ${headingTrackingClass} lg:text-[clamp(36px,3.8vw,55px)]`,
			heading2: `font-medium text-[40px] leading-none ${headingTrackingClass}`,
			heading2Caps: `font-semibold text-[48px] leading-none ${headingTrackingClass} uppercase md:text-[80px]`,
			menuDisplay: `font-medium text-[64px] leading-none ${headingTrackingClass} sm:text-[80px] md:text-[110px] lg:text-[130px] lg:leading-[92px]`,
			menuDisplayBalanced: `font-medium text-[52px] leading-none ${headingTrackingClass} sm:text-[64px] md:text-[86px] lg:text-[100px] lg:leading-[76px]`,
			menuDisplayIntermediate: `font-medium text-[48px] leading-none ${headingTrackingClass} sm:text-[56px] md:text-[64px] lg:text-[72px] lg:leading-[58px]`,
			subheading1: `font-medium text-[24px] leading-none ${zeroTrackingClass}`,
			subheading1Tight: `font-medium text-[24px] leading-none ${headingTrackingClass} ${trimmedTextBoxClass}`,
			subheading2: `font-medium text-[22px] leading-none ${zeroTrackingClass}`,
			bodyPrimary: `font-normal text-[14px] leading-[1.15] ${zeroTrackingClass}`,
			bodySecondary: `font-medium text-[16px] leading-none ${zeroTrackingClass}`,
			tag: `font-normal text-[14px] leading-none ${zeroTrackingClass}`,
			metricNumber: `font-[590] text-[80px] leading-none ${headingTrackingClass} ${trimmedTextBoxClass}`,
			numberRegular: `font-semibold text-[100px] leading-none ${zeroTrackingClass}`,
			numberDisplay: `font-semibold text-[180px] leading-none ${zeroTrackingClass}`,
			buttonLabel: `font-normal text-[14px] leading-none ${zeroTrackingClass}`,
			buttonLabelTight: `font-normal text-[14px] leading-none ${headingTrackingClass} ${trimmedTextBoxClass}`,
			fieldLabel: `font-medium text-[14px] leading-none ${zeroTrackingClass}`,
			inputText: `font-normal text-[14px] leading-none ${zeroTrackingClass}`,
			caption: `font-normal text-[12px] leading-none ${zeroTrackingClass}`,
			overline: `font-normal text-[14px] leading-none ${headingTrackingClass} ${trimmedTextBoxClass}`,
			overlineSoft: `font-normal text-[14px] leading-none ${softTrackingClass} ${trimmedTextBoxClass}`,
			overlineMultiline: `font-normal text-[14px] leading-[1.25em] ${headingTrackingClass}`,
			support: `font-normal text-[14px] leading-none ${zeroTrackingClass}`,
		},
		tone: {
			default: "text-foreground",
			muted: "text-muted",
			inherit: "text-inherit",
		},
	},
	defaultVariants: {
		variant: "bodyPrimary",
		tone: "default",
	},
});

export type TextVariant =
	| "display1"
	| "display1Caps"
	| "display2"
	| "display2Medium"
	| "display2Caps"
	| "heading1"
	| "ctaAction"
	| "heading2"
	| "heading2Caps"
	| "menuDisplay"
	| "menuDisplayBalanced"
	| "menuDisplayIntermediate"
	| "subheading1"
	| "subheading1Tight"
	| "subheading2"
	| "bodyPrimary"
	| "bodySecondary"
	| "tag"
	| "metricNumber"
	| "numberRegular"
	| "numberDisplay"
	| "buttonLabel"
	| "buttonLabelTight"
	| "fieldLabel"
	| "inputText"
	| "caption"
	| "overline"
	| "overlineSoft"
	| "overlineMultiline"
	| "support"
	| null;
export type TextTone = "default" | "muted" | "inherit" | null;

type TextOwnProps = {
	as?: React.ElementType;
	children?: React.ReactNode;
	className?: string;
	tone?: TextTone;
	variant?: TextVariant;
};

export type TextProps = TextOwnProps &
	Omit<React.HTMLAttributes<HTMLElement>, keyof TextOwnProps>;

export function Text({
	as,
	children,
	className,
	tone = "default",
	variant = "bodyPrimary",
	...rest
}: TextProps) {
	const Tag = as ?? (isHeadingVariant(variant) ? "h2" : "p");

	return (
		<Tag className={textVariants({ variant, tone, className })} {...rest}>
			{children}
		</Tag>
	);
}

function isHeadingVariant(variant: TextVariant) {
	return (
		variant === "display1" ||
		variant === "display1Caps" ||
		variant === "display2" ||
		variant === "display2Medium" ||
		variant === "display2Caps" ||
		variant === "heading1" ||
		variant === "ctaAction" ||
		variant === "heading2" ||
		variant === "heading2Caps"
	);
}
