// The preset components' limits (feature 002, data-model.md; feature 003,
// T341): what each component's typed props cannot say, such as how many
// items it takes. The types already hold the rest: every word is a string
// from `copy`, a chart's kind, an image's fit and the matrix's four
// quadrants are fixed, and an org chart's node has no children of its own.
//
// Each component reports its problems in development (`reportLimits`): a
// console warning naming the component and the limit. It still draws what
// it is given. A limit is never met by dropping or cutting the owner's
// data: the owner chooses a summary in their words, a split across slides
// or another preset. Production builds report nothing.
//
// Plain Node imports this file (tests/tools/presets_test.mjs), so it imports
// nothing.

type Labelled = { label: string };
type Picture = { src?: string };

/** `n` against a range, as a problem line, or none. */
function count(n: number, what: string, min: number, max = Infinity) {
  if (n >= min && n <= max) return [];
  const range = max === Infinity ? `at least ${min}` : `${min} to ${max}`;
  return [`${range} ${what}, not ${n}`];
}

/** A picture's `src`: a path under public/images/, or none for the
 *  placeholder. */
const path = (src: string | undefined, at: string) =>
  src === undefined || src.startsWith("/images/")
    ? []
    : [`${at}: a path under public/images/ (/images/…), not ${src}`];

/** Each component's limits: its props in, its problems out. */
export const limits = {
  Chart(props: {
    kind: string;
    categories: readonly string[];
    series: readonly { values: readonly number[] }[];
  }) {
    const n = props.categories.length;
    return [
      ...count(n, "categories", 1, 12),
      ...(props.kind === "donut"
        ? count(props.series.length, "series (a donut has one series)", 1, 1)
        : count(props.series.length, "series", 1)),
      ...props.series.flatMap((series, i) => [
        ...(series.values.length === n
          ? []
          : [
              `series ${i + 1}: one value per category, not ${series.values.length} values for ${n} categories`,
            ]),
        ...series.values.flatMap((value, j) =>
          Number.isFinite(value)
            ? []
            : [`series ${i + 1}, value ${j + 1}: a finite number`],
        ),
      ]),
    ];
  },
  Stat(props: { items: readonly { value: string }[] }) {
    return [
      ...count(props.items.length, "items", 1, 4),
      ...props.items.flatMap((item, i) =>
        item.value.trim()
          ? []
          : [`item ${i + 1}: a value, as the source writes it`],
      ),
    ];
  },
  Flow: (props: { steps: readonly Labelled[] }) =>
    count(props.steps.length, "steps", 2, 7),
  Timeline: (props: { events: readonly Labelled[] }) =>
    count(props.events.length, "events", 2, 8),
  Cycle: (props: { stages: readonly Labelled[] }) =>
    count(props.stages.length, "stages", 3, 6),
  Agenda: (props: { items: readonly Labelled[] }) =>
    count(props.items.length, "items", 2, 8),
  OrgChart: (props: { branches: readonly unknown[] }) =>
    count(props.branches.length, "nodes below the root", 1),
  Table(props: {
    columns: readonly string[];
    rows: readonly { cells: readonly string[] }[];
  }) {
    const n = props.columns.length;
    return [
      ...count(n, "columns", 1, 5),
      ...count(props.rows.length, "rows", 1, 8),
      ...props.rows.flatMap((row, i) =>
        row.cells.length === n
          ? []
          : [
              `row ${i + 1}: one cell per column, not ${row.cells.length} for ${n}`,
            ],
      ),
    ];
  },
  Matrix: (props: { items?: readonly { x: number; y: number }[] }) =>
    (props.items ?? []).flatMap((item, i) =>
      (["x", "y"] as const).flatMap((axis) =>
        item[axis] >= 0 && item[axis] <= 1
          ? []
          : [`item ${i + 1}: ${axis} from 0 to 1, not ${item[axis]}`],
      ),
    ),
  Compare: (props: {
    left: { points: readonly string[] };
    right: { points: readonly string[] };
  }) => [
    ...count(props.left.points.length, "points on the left", 1),
    ...count(props.right.points.length, "points on the right", 1),
  ],
  Image: (props: Picture) => path(props.src, "src"),
  ImageGrid: (props: { images: readonly Picture[] }) => [
    ...count(props.images.length, "images", 2, 6),
    ...props.images.flatMap((image, i) => path(image.src, `image ${i + 1}`)),
  ],
};

export type LimitedComponent = keyof typeof limits;

const reported = new Set<string>();

/** In development, warns once for each problem `name`'s limits find in its
 *  props. */
export function reportLimits<N extends LimitedComponent>(
  name: N,
  props: Parameters<(typeof limits)[N]>[0],
) {
  if (process.env.NODE_ENV === "production") return;
  const check = limits[name] as (props: unknown) => string[];
  for (const problem of check(props)) {
    const line = `${name}: ${problem}. Ask the owner for a summary in their words, a split across slides or another preset; never drop data.`;
    if (reported.has(line)) continue;
    reported.add(line);
    console.warn(line);
  }
}
