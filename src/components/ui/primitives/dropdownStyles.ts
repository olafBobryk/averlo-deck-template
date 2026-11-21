import { textVariants } from "@/components/ui/primitives/Text";

type DropdownOptionClassOptions = {
	active?: boolean;
	selected?: boolean;
	disabled?: boolean;
	className?: string;
	activeClassName?: string;
	selectedClassName?: string;
	disabledClassName?: string;
};

export const dropdownListWrapperClassName =
	"flex flex-col overflow-hidden rounded-[18px] border border-[rgba(25,27,37,0.18)] bg-background p-1.5 shadow-[0_18px_45px_rgba(25,27,37,0.12)]";
export const dropdownListClassName =
	"flex max-h-[280px] flex-col gap-1 overflow-y-auto";
export const dropdownEmptyStateClassName = "px-4 py-3 text-foreground/55";
export const dropdownOptionBaseClassName = [
	"flex w-full min-w-0 items-center gap-2.5 !px-4 !py-3 text-left text-foreground/75 shadow-none",
	textVariants({ variant: "buttonLabel", tone: "inherit" }),
].join(" ");
export const dropdownOptionRadiusClassName = "!rounded-[12px]";

export function getDropdownOptionClassName({
	active,
	selected,
	disabled,
	className,
	activeClassName,
	selectedClassName,
	disabledClassName,
}: DropdownOptionClassOptions) {
	return [
		dropdownOptionBaseClassName,
		dropdownOptionRadiusClassName,
		selected
			? "!bg-foreground !text-background !shadow-none hover:!bg-foreground hover:!text-background [&_*]:!text-background"
			: undefined,
		active && !selected
			? "!bg-background-hover !text-foreground !shadow-none hover:!text-foreground"
			: undefined,
		disabled
			? "cursor-not-allowed opacity-45 hover:!bg-transparent"
			: "cursor-pointer",
		className,
		active ? activeClassName : undefined,
		selected ? selectedClassName : undefined,
		disabled ? disabledClassName : undefined,
	]
		.filter(Boolean)
		.join(" ");
}
