// The preset blocks' limits (feature 002, specs/002-deck-visuals/
// data-model.md), checked on a block's content. A limit is never met by
// dropping or truncating: a block over it is reported, and the owner
// decides. Imported by the registry test under plain Node, so it imports
// types only.
import type { Block, PresetBlock } from "@/deck/content";

/** The preset blocks' types. */
export const presetTypes = [
  "chart",
  "stat",
  "flow",
  "timeline",
  "cycle",
  "orgchart",
  "table",
  "matrix",
  "quote",
  "agenda",
  "compare",
  "image",
  "imageGrid",
  "custom",
] as const satisfies readonly PresetBlock["type"][];
/** A type-level check, run by the typecheck: the list names every preset
 *  block type. */
export const presetTypesComplete: [
  Exclude<PresetBlock["type"], (typeof presetTypes)[number]>,
] extends [never]
  ? true
  : false = true;

/** Feature 001's blocks: they keep their own rules and pass as they are
 *  (the statement preset is the `lead` block). */
const carriedTypes = [
  "lead",
  "points",
  "steps",
  "facts",
  "note",
  "org",
  "fork",
  "week",
  "plan",
] as const satisfies readonly Exclude<Block, PresetBlock>["type"][];

type Value = Record<string, unknown>;
const isObject = (value: unknown): value is Value =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The problems of one block, as `path: what` lines; none when it is
 *  valid. Every `Text` needs a string in each of `langs`. */
export function validateBlock(block: unknown, langs: readonly string[]) {
  const problems: string[] = [];
  const report = (path: string, what: string) =>
    problems.push(`${path}: ${what}`);

  const text = (value: unknown, path: string, optional = false) => {
    if (value === undefined && optional) return;
    if (
      !isObject(value) ||
      !langs.every((lang) => typeof value[lang] === "string")
    )
      report(path, `a text needs a string in each language (${langs})`);
  };
  const list = (
    value: unknown,
    path: string,
    min: number,
    max: number,
    what: string,
  ): unknown[] => {
    const range =
      max === Number.POSITIVE_INFINITY ? `at least ${min}` : `${min} to ${max}`;
    if (!Array.isArray(value)) {
      report(path, `a list of ${range} ${what} is needed`);
      return [];
    }
    if (value.length < min || value.length > max)
      report(path, `${range} ${what}, not ${value.length}`);
    return value;
  };
  const labelled = (value: unknown, path: string) => {
    if (!isObject(value)) return report(path, "an item with a label is needed");
    text(value.label, `${path}.label`);
    text(value.text, `${path}.text`, true);
  };
  const point = (value: unknown, path: string) => {
    labelled(value, path);
    if (isObject(value) && "children" in value)
      report(path, "two levels below the root at most");
  };
  const image = (value: unknown, path: string) => {
    if (!isObject(value)) return report(path, "an image is needed");
    if (
      value.src !== undefined &&
      (typeof value.src !== "string" || !value.src.startsWith("/images/"))
    )
      report(`${path}.src`, "a path under public/images/ (/images/…)");
    text(value.alt, `${path}.alt`);
    text(value.caption, `${path}.caption`, true);
  };

  if (!isObject(block) || typeof block.type !== "string") {
    report("block", "a block with a type is needed");
    return problems;
  }
  const b = block;
  const type = block.type;
  switch (type) {
    case "chart": {
      if (!["bar", "line", "donut"].includes(b.kind as string))
        report("kind", "bar, line or donut");
      const categories = list(b.categories, "categories", 1, 12, "categories");
      categories.forEach((c, i) => text(c, `categories[${i}]`));
      const series = list(
        b.series,
        "series",
        1,
        b.kind === "donut" ? 1 : Number.POSITIVE_INFINITY,
        b.kind === "donut" ? "series (a donut has one series)" : "series",
      );
      series.forEach((s, i) => {
        const path = `series[${i}]`;
        if (!isObject(s)) return report(path, "a series is needed");
        text(s.name, `${path}.name`);
        if (!Array.isArray(s.values))
          return report(`${path}.values`, "one value per category");
        if (s.values.length !== categories.length)
          report(
            `${path}.values`,
            `one value per category: ${s.values.length} values for ${categories.length} categories`,
          );
        s.values.forEach((v, j) => {
          if (typeof v !== "number" || !Number.isFinite(v))
            report(`${path}.values[${j}]`, "a value is a finite number");
        });
      });
      text(b.unit, "unit", true);
      text(b.source, "source", true);
      break;
    }
    case "stat":
      list(b.items, "items", 1, 4, "items").forEach((item, i) => {
        const path = `items[${i}]`;
        if (!isObject(item)) return report(path, "an item is needed");
        if (typeof item.value !== "string" || !item.value.trim())
          report(`${path}.value`, "a value, as the source writes it");
        text(item.label, `${path}.label`);
        text(item.unit, `${path}.unit`, true);
        text(item.note, `${path}.note`, true);
      });
      break;
    case "flow":
      list(b.steps, "steps", 2, 7, "steps").forEach((s, i) =>
        labelled(s, `steps[${i}]`),
      );
      break;
    case "timeline":
      list(b.events, "events", 2, 8, "events").forEach((e, i) => {
        labelled(e, `events[${i}]`);
        if (isObject(e)) text(e.when, `events[${i}].when`);
      });
      break;
    case "cycle":
      list(b.stages, "stages", 3, 6, "stages").forEach((s, i) =>
        labelled(s, `stages[${i}]`),
      );
      break;
    case "agenda":
      list(b.items, "items", 2, 8, "items").forEach((s, i) =>
        labelled(s, `items[${i}]`),
      );
      break;
    case "orgchart":
      labelled(b.root, "root");
      list(
        b.children,
        "children",
        1,
        Number.POSITIVE_INFINITY,
        "nodes",
      ).forEach((child, i) => {
        const path = `children[${i}]`;
        if (!isObject(child)) return report(path, "a node is needed");
        labelled(child.node, `${path}.node`);
        if (child.children === undefined) return;
        if (!Array.isArray(child.children))
          return report(`${path}.children`, "a list of nodes");
        child.children.forEach((leaf, j) =>
          point(leaf, `${path}.children[${j}]`),
        );
      });
      break;
    case "table": {
      const columns = list(b.columns, "columns", 1, 5, "columns");
      columns.forEach((c, i) => text(c, `columns[${i}]`));
      list(b.rows, "rows", 1, 8, "rows").forEach((row, i) => {
        const path = `rows[${i}]`;
        if (!isObject(row)) return report(path, "a row is needed");
        text(row.label, `${path}.label`);
        if (!Array.isArray(row.cells) || row.cells.length !== columns.length)
          return report(`${path}.cells`, "one cell per column");
        row.cells.forEach((c, j) => text(c, `${path}.cells[${j}]`));
      });
      break;
    }
    case "matrix":
      text(b.x, "x");
      text(b.y, "y");
      if (!Array.isArray(b.quadrants) || b.quadrants.length !== 4)
        report("quadrants", "four quadrants");
      else b.quadrants.forEach((q, i) => labelled(q, `quadrants[${i}]`));
      if (b.items !== undefined)
        list(b.items, "items", 0, Number.POSITIVE_INFINITY, "items").forEach(
          (item, i) => {
            const path = `items[${i}]`;
            if (!isObject(item)) return report(path, "an item is needed");
            text(item.label, `${path}.label`);
            for (const axis of ["x", "y"] as const) {
              const v = item[axis];
              if (typeof v !== "number" || !(v >= 0 && v <= 1))
                report(`${path}.${axis}`, "from 0 to 1");
            }
          },
        );
      break;
    case "quote":
      text(b.text, "text");
      text(b.by, "by", true);
      text(b.role, "role", true);
      break;
    case "compare":
      for (const side of ["left", "right"] as const) {
        const value = b[side];
        if (!isObject(value)) {
          report(side, "a side with a title and points is needed");
          continue;
        }
        text(value.title, `${side}.title`);
        list(
          value.points,
          `${side}.points`,
          1,
          Number.POSITIVE_INFINITY,
          "points",
        ).forEach((p, i) => text(p, `${side}.points[${i}]`));
      }
      break;
    case "image":
      image(b, "image");
      if (b.fit !== undefined && b.fit !== "cover" && b.fit !== "contain")
        report("fit", "cover or contain");
      if (b.bleed !== undefined && typeof b.bleed !== "boolean")
        report("bleed", "true or false");
      break;
    case "imageGrid":
      list(b.images, "images", 2, 6, "images").forEach((img, i) =>
        image(img, `images[${i}]`),
      );
      break;
    case "custom":
      if (typeof b.visual !== "string" || !b.visual.trim())
        report("visual", "the name of a visual in src/deck/visuals/");
      if (!isObject(b.props)) report("props", "a props object");
      break;
    default:
      if (!(carriedTypes as readonly string[]).includes(type))
        report("type", `not a block type: ${type}`);
  }
  return problems;
}
