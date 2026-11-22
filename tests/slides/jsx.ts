import ts from "typescript";

// A slide file's JSX, read and edited with the TypeScript compiler
// (feature 003, T330): the blocks it draws, in order, and a scripted edit an
// agent might make to a copied preset.

const parse = (source: string) =>
  ts.createSourceFile(
    "slide.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

type Element = ts.JsxElement | ts.JsxSelfClosingElement;

const tagOf = (node: Element) =>
  (ts.isJsxElement(node) ? node.openingElement : node).tagName.getText();

/** Every JSX element in the file, in source order. */
function elements(file: ts.SourceFile): Element[] {
  const found: Element[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))
      found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** An element's string attribute, or undefined. */
function attribute(node: Element, name: string) {
  const { attributes } = ts.isJsxElement(node) ? node.openingElement : node;
  for (const attr of attributes.properties)
    if (
      ts.isJsxAttribute(attr) &&
      attr.name.getText() === name &&
      attr.initializer &&
      ts.isStringLiteral(attr.initializer)
    )
      return attr.initializer.text;
  return undefined;
}

/** The block types a slide file draws, in the order it draws them: each
 *  `<Block type>` and `<Aside>` (a lead unless it names another type). */
export function blockTypes(source: string): string[] {
  return elements(parse(source)).flatMap((node) => {
    const tag = tagOf(node);
    if (tag === "Block") return [attribute(node, "type") ?? "?"];
    if (tag === "Aside") return [attribute(node, "type") ?? "lead"];
    return [];
  });
}

/** The first two JSX elements among `children`, swapped in `source`. */
function swap(
  source: string,
  file: ts.SourceFile,
  children: readonly ts.JsxChild[],
) {
  const kids = children.filter(
    (child): child is Element =>
      ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child),
  );
  if (kids.length < 2) return null;
  const [a, b] = kids;
  return (
    source.slice(0, a.getStart(file)) +
    b.getText(file) +
    source.slice(a.getEnd(), b.getStart(file)) +
    a.getText(file) +
    source.slice(b.getEnd())
  );
}

/** An edit an agent might make to a copied slide file: the first two
 *  children of its `<Body>` swapped; when the body holds one, its
 *  `<Aside>` removed; and without one, its heading and body swapped. */
export function editJsx(source: string): {
  source: string;
  change: "reorder" | "remove";
} {
  const file = parse(source);
  const all = elements(file);
  const body = all.find(
    (node): node is ts.JsxElement =>
      ts.isJsxElement(node) && tagOf(node) === "Body",
  );
  const inBody = body && swap(source, file, body.children);
  if (inBody) return { change: "reorder", source: inBody };
  const aside = all.find((node) => tagOf(node) === "Aside");
  if (aside)
    return {
      change: "remove",
      source:
        source.slice(0, aside.getFullStart()) + source.slice(aside.getEnd()),
    };
  let fragment: ts.JsxFragment | undefined;
  const visit = (node: ts.Node) => {
    if (!fragment && ts.isJsxFragment(node)) fragment = node;
    ts.forEachChild(node, visit);
  };
  visit(file);
  const parts = fragment && swap(source, file, fragment.children);
  if (!parts) throw new Error("nothing to edit in this slide file");
  return { change: "reorder", source: parts };
}
