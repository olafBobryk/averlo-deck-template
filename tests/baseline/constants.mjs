// Extracts the origin deck's motion constants into
// specs/001-deck-template/references/strips/constants.json (research R8,
// task T008): the motion tokens, the swipe constants, the intro timing and
// the hard-load screen's timing, as numbers under the sources' own names.
// It reads the source without running it: TypeScript's parser for
// the modules (a small evaluator for literals, constants and the arrow
// helpers they call) and plain parsing for the CSS and the inline script.
// The same extraction reads the template's tree (`--layout template`), so
// tests/motion/constants.spec.ts can compare it with the baseline.
//
//   node tests/baseline/constants.mjs <origin checkout>
//   node tests/baseline/constants.mjs <checkout> --layout template --stdout

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** Where each source lives, in the origin's tree and in the template's. */
export const layouts = {
  origin: {
    motion: "src/components/ui/foundations/motion.ts",
    swipe: "src/deck/swipe.ts",
    fog: "src/gate/fog-volume.ts",
    intro: "src/gate/Intro.tsx",
    lock: "src/gate/AnimatedLock.tsx",
    gateCss: "src/gate/gate.module.css",
    boot: "src/components/branding/boot-loader/boot-bootstrap.ts",
    bootCss: "src/components/branding/boot-loader/BootLoader.module.css",
  },
  template: {
    motion: "src/motion/motion.ts",
    swipe: "src/deck/swipe.ts",
    fog: "src/gate/fog-volume.ts",
    intro: "src/gate/Intro.tsx",
    lock: "src/gate/AnimatedLock.tsx",
    gateCss: "src/gate/gate.module.css",
    boot: "src/boot/boot-bootstrap.ts",
    bootCss: "src/boot/BootLoader.module.css",
  },
};

let read;

/** A module's AST and its top-level constants, by name. */
function module(file) {
  const source = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const scope = {};
  for (const statement of source.statements)
    if (ts.isVariableStatement(statement))
      for (const d of statement.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.initializer)
          scope[d.name.text] = d.initializer;
  return { source, scope };
}

const unwrap = (node) =>
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isParenthesizedExpression(node) ||
  ts.isTypeAssertionExpression(node)
    ? unwrap(node.expression)
    : node;

/** Evaluates a constant expression: literals, objects, arrays, constants in
 *  `scope` (AST nodes or values), property reads, conditionals, and calls of
 *  arrow helpers with an expression body. Anything else is an error. */
function evaluate(input, scope) {
  const node = unwrap(input);
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken
  )
    return -evaluate(node.operand, scope);
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((e) => evaluate(e, scope));
  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const p of node.properties) {
      if (ts.isPropertyAssignment(p))
        value[p.name.text] = evaluate(p.initializer, scope);
      else if (ts.isShorthandPropertyAssignment(p))
        value[p.name.text] = lookup(p.name.text, scope);
      else throw new Error(`unsupported property: ${p.getText()}`);
    }
    return value;
  }
  if (ts.isIdentifier(node)) return lookup(node.text, scope);
  if (ts.isPropertyAccessExpression(node))
    return evaluate(node.expression, scope)[node.name.text];
  if (ts.isConditionalExpression(node))
    return evaluate(node.condition, scope)
      ? evaluate(node.whenTrue, scope)
      : evaluate(node.whenFalse, scope);
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const name = node.expression.text;
    const fn = scope[name] && unwrap(scope[name]);
    const args = node.arguments.map((a) => evaluate(a, scope));
    if (fn && ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) {
      const local = { ...scope };
      fn.parameters.forEach((p, i) => (local[p.name.text] = args[i]));
      return evaluate(fn.body, local);
    }
    // A library call (an easing): its name and arguments.
    return { [name]: args };
  }
  throw new Error(`unsupported expression: ${node.getText()}`);
}

function lookup(name, scope) {
  if (!(name in scope)) throw new Error(`unknown name: ${name}`);
  const value = scope[name];
  return value && typeof value === "object" && "kind" in value
    ? evaluate(value, scope)
    : value;
}

/** The top-level constants of a module whose value is a number. */
function numbers({ scope }) {
  const value = {};
  for (const [name, node] of Object.entries(scope))
    if (ts.isNumericLiteral(unwrap(node))) value[name] = evaluate(node, scope);
  return value;
}

/** The JSX attributes of the first element carrying attribute `marker`. */
function jsxAttributes({ source, scope }, marker, extra = {}) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.attributes.properties.some(
        (a) => ts.isJsxAttribute(a) && a.name.getText() === marker,
      )
    )
      found = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!found) throw new Error(`no element with ${marker}`);
  return (names, local = {}) =>
    Object.fromEntries(
      names.map((name) => {
        const attr = found.attributes.properties.find(
          (a) => ts.isJsxAttribute(a) && a.name.getText() === name,
        );
        if (!attr?.initializer || !ts.isJsxExpression(attr.initializer))
          throw new Error(`no ${name} on the element with ${marker}`);
        return [
          name,
          evaluate(attr.initializer.expression, {
            ...scope,
            ...extra,
            ...local,
          }),
        ];
      }),
    );
}

// CSS: top-level rules (and those inside @media), declarations by property.
function cssRules(text) {
  const rules = [];
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const walk = (body, media) => {
    let i = 0;
    while (i < body.length) {
      const open = body.indexOf("{", i);
      if (open < 0) break;
      const head = body.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (depth && j < body.length) {
        if (body[j] === "{") depth++;
        if (body[j] === "}") depth--;
        j++;
      }
      const inner = body.slice(open + 1, j - 1);
      if (head.startsWith("@media")) walk(inner, head);
      else if (!head.startsWith("@"))
        rules.push({
          selector: head.replace(/\s+/g, " "),
          media,
          declarations: Object.fromEntries(
            inner
              .split(";")
              .map((d) => d.trim())
              .filter(Boolean)
              .map((d) => {
                const k = d.indexOf(":");
                return [
                  d.slice(0, k).trim(),
                  d
                    .slice(k + 1)
                    .trim()
                    .replace(/\s+/g, " "),
                ];
              }),
          ),
        });
      i = j;
    }
  };
  walk(clean, null);
  return rules;
}

const ms = (time) =>
  time.endsWith("ms")
    ? Number.parseFloat(time)
    : Number.parseFloat(time) * 1000;
const easing = (value) => {
  const bezier = /^cubic-bezier\(([^)]*)\)$/.exec(value);
  return bezier ? bezier[1].split(",").map(Number) : value;
};
/** `opacity 160ms cubic-bezier(…), scale 160ms …` as timings. */
function transitions(value) {
  if (value === "none") return "none";
  return value.split(/,(?![^(]*\))/).map((part) => {
    const [property, duration, ...rest] = part.trim().split(/ (?![^(]*\))/);
    return {
      property,
      durationMs: ms(duration),
      easing: easing(rest.join(" ")),
    };
  });
}
function rule(rules, selector, media = null) {
  const found = rules.find((r) => r.selector === selector && r.media === media);
  if (!found) throw new Error(`no CSS rule ${selector}`);
  return found.declarations;
}
const numeric = (value) => Number.parseFloat(value);

/** The constants of the tree at `root`, its files where `layout` says. */
export function extract(root, layout = layouts.origin) {
  read = (file) => readFileSync(`${root}/${file}`, "utf8");

  // The motion tokens.
  const motion = module(layout.motion);

  // The swipe gesture.
  const swipe = numbers(module(layout.swipe));

  // The intro.
  const fog = module(layout.fog);
  const introModule = module(layout.intro);
  const introScope = { ...introModule.scope, ...fog.scope };
  const lock = jsxAttributes(
    { source: introModule.source, scope: introScope },
    "data-lock-state",
  );
  // AnimatedLock's motion.path is its only element with `animate`.
  const shackleOf = jsxAttributes(module(layout.lock), "animate", {
    reduced: false,
  });
  const gateCss = cssRules(read(layout.gateCss));
  const lockSelector = ".stage[data-lock] .volume, .stage[data-lock] .mark";

  // The hard-load screen.
  const bootModule = module(layout.boot);
  const script = bootModule.scope.bootBootstrap.getText();
  const match = (pattern) => {
    const m = pattern.exec(script);
    if (!m) throw new Error(`not in the boot script: ${pattern}`);
    return Number(m[1]);
  };
  const bootCss = cssRules(read(layout.bootCss));
  const fade = rule(bootCss, ".boot")["--boot-fade"];
  const failsafe = rule(bootCss, ".boot").animation.split(" ");

  const constants = {
    motion: {
      motionTokens: evaluate(motion.scope.motionTokens, motion.scope),
      reducedMotionTokens: evaluate(
        motion.scope.reducedMotionTokens,
        motion.scope,
      ),
    },
    swipe,
    intro: {
      timing: evaluate(introModule.scope.timing, introScope),
      settle: evaluate(introModule.scope.settle, introScope),
      fog: numbers(fog),
      lock: lock(["initial", "animate", "transition"]),
      shackle: {
        open: shackleOf(["animate", "transition"], { open: true }),
        shut: shackleOf(["animate", "transition"], { open: false }),
      },
      css: {
        gate: {
          transition: transitions(rule(gateCss, ".gate").transition),
          opacity: numeric(rule(gateCss, ".gate").opacity),
        },
        gateReady: {
          opacity: numeric(rule(gateCss, ".gate[data-ready]").opacity),
        },
        volume: { scale: numeric(rule(gateCss, ".volume").scale) },
        mark: { scale: numeric(rule(gateCss, ".mark").scale) },
        lockShown: {
          opacity: numeric(rule(gateCss, lockSelector).opacity),
          scale: numeric(rule(gateCss, lockSelector).scale),
          transition: transitions(rule(gateCss, lockSelector).transition),
        },
        reduced: {
          gate: {
            transition: transitions(
              rule(gateCss, ".gate", "@media (prefers-reduced-motion: reduce)")
                .transition,
            ),
          },
        },
      },
    },
    boot: {
      ...numbers(bootModule),
      fade: {
        durationMs: ms(fade.split(" ")[0]),
        easing: easing(fade.split(" ").slice(1).join(" ")),
      },
      reducedFadeMs: ms(
        rule(bootCss, ".boot", "@media (prefers-reduced-motion: reduce)")[
          "--boot-fade"
        ],
      ),
      /** The flight's own end, if the page never finishes it. */
      landingTimerMs: match(/setTimeout\(finish,(\d+)\)/),
      /** Leaving to done (instant under reduced motion). */
      leavingMs: match(/reduced\?0:(\d+)/),
      failsafe: { durationMs: ms(failsafe[1]), delayMs: ms(failsafe[3]) },
    },
  };
  return constants;
}

// Run as a script: write the baseline from the origin, or print a tree's.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [root, ...flags] = process.argv.slice(2);
  const at = flags.indexOf("--layout");
  const layout = layouts[at < 0 ? "origin" : flags[at + 1]];
  if (!root || !layout) {
    console.error(
      "usage: node tests/baseline/constants.mjs <checkout> [--layout origin|template] [--stdout]",
    );
    process.exit(1);
  }
  const json = `${JSON.stringify(extract(root, layout), null, 2)}\n`;
  if (flags.includes("--stdout")) process.stdout.write(json);
  else {
    const out = new URL(
      "../../specs/001-deck-template/references/strips/constants.json",
      import.meta.url,
    );
    writeFileSync(out, json);
    console.log(`wrote ${out.pathname}`);
  }
}
