import clsx from "clsx";
import type { LucideProps } from "lucide-react";
import {
	BadgeCheck,
	CalendarDays,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock3,
	Compass,
	Copy,
	Download,
	Ellipsis,
	ExternalLink,
	FileText,
	Globe2,
	GripVertical,
	Mail,
	Menu,
	MessageCircle,
	Mic,
	Minus,
	Moon,
	Palette,
	Paperclip,
	RefreshCw,
	Rocket,
	Search,
	Smartphone,
	Sparkles,
	Square,
	Sun,
	TrendingUp,
	Video,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import type { ComponentType } from "react";

const iconRegistry = {
	"badge-check": BadgeCheck,
	calendar: CalendarDays,
	check: Check,
	"chevron-down": ChevronDown,
	"chevron-left": ChevronLeft,
	"chevron-right": ChevronRight,
	"chevron-up": ChevronUp,
	clock: Clock3,
	close: X,
	compass: Compass,
	copy: Copy,
	download: Download,
	ellipsis: Ellipsis,
	"external-link": ExternalLink,
	file: FileText,
	globe: Globe2,
	"grip-vertical": GripVertical,
	mail: Mail,
	menu: Menu,
	message: MessageCircle,
	mic: Mic,
	minus: Minus,
	moon: Moon,
	palette: Palette,
	paperclip: Paperclip,
	refresh: RefreshCw,
	rocket: Rocket,
	search: Search,
	smartphone: Smartphone,
	sparkles: Sparkles,
	stop: Square,
	sun: Sun,
	"trending-up": TrendingUp,
	video: Video,
	wrench: Wrench,
	zap: Zap,
} satisfies Record<string, ComponentType<LucideProps>>;

export type IconName = keyof typeof iconRegistry;

type IconProps = Omit<LucideProps, "ref"> & {
	decorative?: boolean;
	name: IconName;
};

export function Icon({
	className,
	decorative = true,
	name,
	size = 24,
	strokeWidth = 2,
	...props
}: IconProps) {
	const Component = iconRegistry[name];

	return (
		<Component
			aria-hidden={decorative ? true : undefined}
			className={clsx("shrink-0", className)}
			role={decorative ? undefined : "img"}
			size={size}
			strokeWidth={strokeWidth}
			{...props}
		/>
	);
}
