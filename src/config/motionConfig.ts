export type MotionDriver = "motion" | "hybrid";

/** The marketing scroll system uses GSAP/Lenis; Motion remains the rollback driver. */
export const MOTION_CONFIG: { defaultDriver: MotionDriver } = {
	defaultDriver: "hybrid",
};

export function resolveMotionDriver(
	search: string,
	development: boolean,
): MotionDriver {
	const params = new URLSearchParams(search);
	if (
		!development ||
		params.getAll("motionCompare").length !== 1 ||
		params.get("motionCompare") !== "1"
	)
		return MOTION_CONFIG.defaultDriver;
	const values = params.getAll("motionDriver");
	return values.length === 1 &&
		(values[0] === "motion" || values[0] === "hybrid")
		? values[0]
		: MOTION_CONFIG.defaultDriver;
}
