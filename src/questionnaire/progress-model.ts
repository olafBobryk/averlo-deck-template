// Source: private Averlo Client 2 questionnaire, 83a4c72b00ed08f916cb6125da99958045d3e9c0, lib/progressNavigator.ts.
export const PROGRESS_MOUND_MAX_HEIGHT = 28;
export const PROGRESS_MOUND_REACH = 100;
export const PROGRESS_MOUND_SIGMA = 40;
export const PROGRESS_MOUND_TAIL_REACH = 220;

const clamp = (value: number, minimum: number, maximum: number) =>
	Math.min(maximum, Math.max(minimum, value));

export function progressProximity(distance: number) {
	const proximity = clamp(1 - distance / PROGRESS_MOUND_REACH, 0, 1);
	return proximity * proximity * (3 - 2 * proximity);
}

export function progressMoundHeight(distance: number) {
	return progressProximity(distance) * PROGRESS_MOUND_MAX_HEIGHT;
}

export function stepFromProgressPosition(position: number, width: number, total: number) {
	if (total <= 1 || width <= 0) return 1;
	const normalized = clamp(position / width, 0, 1 - Number.EPSILON);
	return clamp(Math.floor(normalized * total) + 1, 1, total);
}

// Keep the shoulder narrow independently of the outer tail reach. A Gaussian
// gives the center curvature and long, almost-flat tails separate roles.
export function progressMoundDepth(offset: number, height: number) {
 const cutoff = Math.exp(-0.5 * (PROGRESS_MOUND_TAIL_REACH / PROGRESS_MOUND_SIGMA) ** 2);
 const bell = Math.exp(-0.5 * (offset / PROGRESS_MOUND_SIGMA) ** 2);
 return Math.max(0, height * ((bell - cutoff) / (1 - cutoff)));
}

// Reserve enough first-step fill for the edge label, then taper the correction
// to zero at completion. Navigation and accessible progress stay step-linear.
export function progressFillPosition(progress: number, width: number, total: number) {
 if (width <= 0 || progress <= 0) return 0;
 if (total <= 1 || progress >= 100) return width;
 const first = Math.min(width, Math.max(width / total, 44));
 const fraction = clamp((progress / 100 - 1 / total) / (1 - 1 / total), 0, 1);
 return first + (width - first) * fraction;
}

export function progressMoundLayout(position: number, height: number, width: number) {
 const pointer = clamp(position, 0, width);
 const edgeDistance = Math.min(pointer, width - pointer);
 const clamping = clamp(1 - edgeDistance / PROGRESS_MOUND_TAIL_REACH, 0, 1);
 const influence = clamping * clamping * (3 - 2 * clamping);
 const inset = Math.min(22, width / 2);
 const center = clamp(pointer, inset, width - inset);
 return {
  center,
  height: height * (1 - 0.25 * influence),
  // Shift the number toward the fuller side of an asymmetric edge mound.
  labelX: clamp(center + (pointer < width / 2 ? 1 : -1) * 5 * influence, inset, width - inset),
  influence,
 };
}

export function progressMoundPath(center: number, height: number, width = Number.POSITIVE_INFINITY) {
 if (height <= 0.01) return "";
 const x = clamp(center, 0, width);
 const reach = PROGRESS_MOUND_TAIL_REACH;
 // Keep both endpoints on the rail baseline. As available tail length shrinks,
 // blend the compressed bell toward its baseline-normalized shoulder. This
 // removes the flat tail progressively, without opening a tall face at the edge.
 const leftReach = Math.min(reach, x);
 const rightReach = Math.min(reach, width - x);
 const position = (offset: number) => x + offset * (offset < 0 ? leftReach : rightReach) / reach;
 const offsets = Array.from({length: 23}, (_, index) => index * 20 - reach);
 const cutoff = Math.exp(-0.5 * (reach / PROGRESS_MOUND_SIGMA) ** 2);
 const sample = (offset: number) => {
  const available = offset < 0 ? leftReach : rightReach;
  if (available >= reach) return {
   depth: progressMoundDepth(offset, height),
   slope: Math.abs(offset) === reach ? 0 : -height * offset / PROGRESS_MOUND_SIGMA ** 2 * Math.exp(-0.5 * (offset / PROGRESS_MOUND_SIGMA) ** 2) / (1 - cutoff),
  };
  const localOffset = offset / reach * available;
  const raw = progressMoundDepth(localOffset, height);
  const edge = progressMoundDepth(available, height);
  const rawSlope = -height * localOffset / PROGRESS_MOUND_SIGMA ** 2
   * Math.exp(-0.5 * (localOffset / PROGRESS_MOUND_SIGMA) ** 2)
   / (1 - cutoff) * available / reach;
  const removal = clamp((reach - available) / (reach - 22), 0, 1);
  const range = height - edge;
  const baselineDepth = range > 1e-9 ? height * (raw - edge) / range : height * (1 - (offset / reach) ** 2);
  const baselineSlope = range > 1e-9 ? rawSlope * height / range : -2 * height * offset / reach ** 2;
  return {
   depth: progressMoundDepth(offset, height) * (1 - removal) + baselineDepth * removal,
   slope: (-height * offset / PROGRESS_MOUND_SIGMA ** 2 * Math.exp(-0.5 * (offset / PROGRESS_MOUND_SIGMA) ** 2) / (1 - cutoff)) * (1 - removal) + baselineSlope * removal,
  };
 };
 const path = [`M ${position(-reach)} 0`];
 for (let i = 1; i < offsets.length; i++) {
  const from = offsets[i - 1];
  const to = offsets[i];
  const third = (to - from) / 3;
  const startSample = sample(from);
  const endSample = sample(to);
  const start = startSample.depth;
  const end = endSample.depth;
  const lower = Math.min(start, end);
  const upper = Math.max(start, end);
  path.push(`C ${position(from + third)} ${clamp(start + startSample.slope * third, lower, upper)} ${position(to - third)} ${clamp(end - endSample.slope * third, lower, upper)} ${position(to)} ${end}`);
 }
 return [...path, `L ${position(reach)} 0 Z`].join(" ");
}

/** How far the fill reaches, 0 to 100. A track not measured yet (width 0, the first render) is 0, never NaN. */
export function progressFillPercent(boundary: number, width: number) {
  if (!(width > 0) || !Number.isFinite(boundary)) return 0;
  return Math.min(100, Math.max(0, boundary / width * 100));
}
