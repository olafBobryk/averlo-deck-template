#!/usr/bin/env node
// The inline-text check (feature 003, T340; research R3; FR-010): every word
// and figure a slide shows comes from its `copy`, so the trace check and a
// second language see it. It parses each slide file in src/slides/ and each
// preset file under src/presets/slides/ with the TypeScript compiler, and
// fails, naming the file and the line, on:
//
// - JSX text that is not whitespace (`<p>Revenue</p>`);
// - a string or number literal rendered as a child (`{"Revenue"}`, `{40}`);
// - a string literal passed to a text prop (`label`, `title`, `alt`,
//   `caption`, `text`, `children`, `aria-label`, `placeholder`), on any
//   element, at the top of the prop or inside its objects and arrays;
// - on a deck component (`src/components/deck/`), a string literal where the
//   prop's type is `string`, or a number literal where it is `number` (a
//   chart's values): both are words or figures and belong in `copy`. A
//   literal of a closed set (`kind="bar"`, `columns={2}`, `status: "done"`)
//   is a setting, not a word, and passes; so do `src` and `href` paths.
//
// A value read from `t` or `copy` is never a literal, so it passes.
//
// `npm run test:tools` runs it through tests/tools/inline-text_test.mjs; run
// on its own (`node scripts/check-inline-text.mjs`), it prints each problem
// and exits 1 when there is one. The module exports `checkInlineText` for
// the test; main() runs only when the file is invoked directly.
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Props that render text, on any element. */
export const TEXT_PROPS = new Set([
  "label",
  "title",
  "alt",
  "caption",
  "text",
  "children",
  "aria-label",
  "placeholder",
]);

/** String props of a deck component that are paths, not words. */
const PATH_PROPS = new Set(["src", "href"]);

/** The folder whose components' string and number props are words and
 *  figures. */
const DECK_COMPONENTS = join(repoRoot, "src", "components", "deck") + sep;

/** The files the check reads by default: the deck's slide files and every
 *  preset file. */
export function slideFiles(root = repoRoot) {
  const out = [];
  const slides = join(root, "src", "slides");
  if (existsSync(slides))
    for (const name of readdirSync(slides).sort())
      if (name.endsWith(".tsx")) out.push(join(slides, name));
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".tsx")) out.push(path);
    }
  };
  walk(join(root, "src", "presets", "slides"));
  return out;
}

/** The repository's compiler options, from tsconfig.json. */
function compilerOptions() {
  const path = join(repoRoot, "tsconfig.json");
  const config = ts.readConfigFile(path, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot);
  return { ...parsed.options, noEmit: true, incremental: false };
}

/** Whether a type holds a plain `string` (not only string literals). */
const hasString = (type) =>
  type.isUnion()
    ? type.types.some(hasString)
    : Boolean(type.flags & ts.TypeFlags.String) ||
      (type.isIntersection() && type.types.some(hasString));
/** Whether a type holds a plain `number` (not only number literals). */
const hasNumber = (type) =>
  type.isUnion()
    ? type.types.some(hasNumber)
    : Boolean(type.flags & ts.TypeFlags.Number);

const isStringy = (node) =>
  ts.isStringLiteral(node) ||
  ts.isNoSubstitutionTemplateLiteral(node) ||
  ts.isTemplateExpression(node);

/** A literal's text, for the report. */
const shown = (node) => {
  const text = node.getText().replace(/\s+/g, " ");
  return text.length > 40 ? `${text.slice(0, 37)}...` : text;
};

/** Whether a string literal says anything (not only whitespace). */
const says = (node) =>
  ts.isTemplateExpression(node)
    ? [node.head, ...node.templateSpans.map((s) => s.literal)].some((p) =>
        p.text.trim(),
      )
    : node.text.trim() !== "";

/**
 * The value literals of an expression: the strings and numbers it can
 * evaluate to, through parentheses, `as`, `satisfies`, conditionals,
 * `&&`/`||`/`??`, arrays, objects (with the property name each sits under)
 * and arrow functions' bodies. A literal used as an index, a call's argument
 * or a comparison operand is not a value, and nested JSX is checked on its
 * own.
 */
function valueLiterals(node, name, out = []) {
  if (!node) return out;
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  )
    return valueLiterals(node.expression, name, out);
  if (isStringy(node) || ts.isNumericLiteral(node)) {
    out.push({ node, name });
    return out;
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    out.push({ node, name });
    return out;
  }
  if (ts.isConditionalExpression(node)) {
    valueLiterals(node.whenTrue, name, out);
    return valueLiterals(node.whenFalse, name, out);
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken)
      return valueLiterals(node.right, name, out);
    if (
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken
    ) {
      valueLiterals(node.left, name, out);
      return valueLiterals(node.right, name, out);
    }
    if (op === ts.SyntaxKind.PlusToken) {
      valueLiterals(node.left, name, out);
      return valueLiterals(node.right, name, out);
    }
    return out;
  }
  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements)
      valueLiterals(
        ts.isSpreadElement(element) ? element.expression : element,
        name,
        out,
      );
    return out;
  }
  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        const key =
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
            ? property.name.text
            : name;
        valueLiterals(property.initializer, key, out);
      } else if (ts.isSpreadAssignment(property))
        valueLiterals(property.expression, name, out);
    }
    return out;
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    if (ts.isBlock(node.body)) {
      const visit = (child) => {
        if (ts.isReturnStatement(child))
          valueLiterals(child.expression, name, out);
        else if (!ts.isFunctionLike(child)) ts.forEachChild(child, visit);
      };
      ts.forEachChild(node.body, visit);
    } else valueLiterals(node.body, name, out);
    return out;
  }
  if (ts.isCallExpression(node)) {
    // A callback's results are values (`xs.map((x) => ({ ... }))`); the
    // call's other arguments are not.
    for (const arg of node.arguments)
      if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg))
        valueLiterals(arg, name, out);
    return out;
  }
  return out;
}

/** Whether a JSX tag is one of the deck's components. */
function isDeckComponent(tagName, checker) {
  if (!ts.isIdentifier(tagName) && !ts.isPropertyAccessExpression(tagName))
    return false;
  if (ts.isIdentifier(tagName) && /^[a-z]/.test(tagName.text)) return false;
  let symbol = checker.getSymbolAtLocation(tagName);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias)
    symbol = checker.getAliasedSymbol(symbol);
  return Boolean(
    symbol?.declarations?.some((d) =>
      resolve(d.getSourceFile().fileName).startsWith(DECK_COMPONENTS),
    ),
  );
}

/** The problems of one parsed file: { file, line, what }. */
function problemsOf(sourceFile, checker, root) {
  const problems = [];
  const file = relative(root, sourceFile.fileName);
  const report = (node, what) =>
    problems.push({
      file,
      line:
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          .line + 1,
      what,
    });

  /** A literal under a prop: text when its prop renders text, or, on a deck
   *  component, when its type is a plain string or number. */
  const checkLiteral = ({ node, name }, deck) => {
    const number = !isStringy(node);
    if (!number && !says(node)) return;
    if (!number && TEXT_PROPS.has(name))
      return report(
        node,
        `the text ${shown(node)} in \`${name}\` is not from copy`,
      );
    if (!deck || PATH_PROPS.has(name)) return;
    const type = checker.getContextualType(node);
    if (!type) return;
    if (number && hasNumber(type))
      report(node, `the figure ${shown(node)} in \`${name}\` is not from copy`);
    if (!number && hasString(type))
      report(node, `the text ${shown(node)} in \`${name}\` is not from copy`);
  };

  const visit = (node) => {
    if (ts.isJsxText(node) && node.text.trim())
      report(node, `the text "${node.text.trim()}" is typed into the JSX`);
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    )
      for (const literal of valueLiterals(node.expression, "children")) {
        if (isStringy(literal.node) && !says(literal.node)) continue;
        report(
          literal.node,
          `the ${isStringy(literal.node) ? "text" : "figure"} ${shown(literal.node)} is typed into the JSX`,
        );
      }
    if (ts.isJsxAttribute(node) && node.initializer) {
      const element = node.parent.parent;
      const deck = isDeckComponent(element.tagName, checker);
      const name = node.name.getText();
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      for (const literal of valueLiterals(value, name))
        checkLiteral(literal, deck);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return problems;
}

/**
 * The inline text in `files` (absolute paths): { file, line, what }, file
 * relative to `root`. `sources` maps a path to its text, for files that are
 * not on disk (the test's fixtures); put them under the repository, so
 * their imports resolve.
 */
export function checkInlineText({
  files = slideFiles(),
  sources = {},
  root = repoRoot,
} = {}) {
  const options = compilerOptions();
  const host = ts.createCompilerHost(options, true);
  const virtual = new Map(
    Object.entries(sources).map(([path, text]) => [resolve(path), text]),
  );
  const { fileExists, readFile, getSourceFile } = host;
  host.fileExists = (path) => virtual.has(resolve(path)) || fileExists(path);
  host.readFile = (path) => virtual.get(resolve(path)) ?? readFile(path);
  host.getSourceFile = (path, language, ...rest) =>
    virtual.has(resolve(path))
      ? ts.createSourceFile(
          path,
          virtual.get(resolve(path)),
          language,
          true,
          ts.ScriptKind.TSX,
        )
      : getSourceFile(path, language, ...rest);
  const program = ts.createProgram({
    rootNames: files,
    options,
    host,
  });
  const checker = program.getTypeChecker();
  return files.flatMap((path) => {
    const sourceFile = program.getSourceFile(path);
    if (!sourceFile)
      return [{ file: relative(root, path), line: 0, what: "cannot read" }];
    return problemsOf(sourceFile, checker, root);
  });
}

/** A problem as one line: `file:line: what`. */
export const format = ({ file, line, what }) => `${file}:${line}: ${what}`;

function main() {
  const problems = checkInlineText();
  if (!problems.length) {
    console.log("check-inline-text: every word and figure comes from copy");
    return;
  }
  console.error(
    "check-inline-text: words or figures outside copy (move each into the slide's copy and read it from t):",
  );
  for (const problem of problems) console.error(`  ${format(problem)}`);
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
