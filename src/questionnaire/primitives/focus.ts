export const focusRing = {
	fieldDefault:
		"focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
	fieldError:
		"focus-within:border-danger focus-within:ring-3 focus-within:ring-danger/20",
	fieldSolid:
		"focus-within:border-transparent focus-within:bg-background-hover",
	fieldSolidError: "focus-within:border-danger focus-within:bg-danger/5",
	fieldUnderline: "focus-within:border-foreground/35",
	fieldUnderlineError: "focus-within:border-danger",
	visibleDefault:
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
	peerDefault:
		"peer-focus-visible:outline peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring/50",
	peerError:
		"group-data-[tone=error]/field:peer-focus-visible:outline-danger/35",
} as const;
