import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";
import { langNames, langs } from "../src/deck/langs";
import { config } from "../src/brand/config";
import { pdfName } from "../src/deck/pdf-name";
import { slides } from "../src/deck/slides";

// Languages (User Story 4, FR-007; contracts/deck-config.md): one language
// by default, with no language switcher in the menu and no `?lang=` in any
// link; with two or more, the menu shows the switcher, and switching keeps
// the slide while `?lang=` joins the link.
//
// The shipped deck has one language, so the two-language case needs a deck
// built with two. This file makes one beside the smoke suite's build: a copy
// of the template's app under .next/ (ignored by git, lint, prettier and
// tsc) whose langs.ts adds a second code and whose Text strings gain it,
// built with `next build` (no PDFs) and served on LANGS_PORT (default 3296).
// Each slide file's words (`copy`, src/slides/, feature 003) gain the second
// language too, and the copy's slide data is generated again from them.
// The template's own files are never touched. Desktop project only: one
// build per run. A deck that already has two languages is tested as it is.

const root = fileURLToPath(new URL("../", import.meta.url));
const lang = langs[0];
const N = slides.length;
/** A slide after the first, so the slide kept is not the default one. */
const S = Math.min(N, 4);

const port = Number(process.env.LANGS_PORT ?? 3296);
const copy = join(root, ".next", "two-languages");
let server: ChildProcess | undefined;
/** The deck under test in the two-language case, and its languages. */
let two = {
  base: "",
  langs: [...langs] as string[],
  names: { ...langNames } as Record<string, string>,
};

const current = (page: Page) => page.locator("main:not([aria-hidden])");
const card = (page: Page) => page.locator("[data-menu-card]");
const switcher = (page: Page) =>
  card(page).locator('button[aria-haspopup="listbox"]');

async function openDeck(page: Page, url: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    sessionStorage.setItem("deck:intro-played", "1"),
  );
  await page.goto(url);
  await page.waitForFunction(
    () =>
      document.getElementById("deck-boot")?.dataset.state === "done" &&
      !document.documentElement.hasAttribute("data-arriving"),
    undefined,
    { timeout: 15_000 },
  );
}

/** No link on the page, and not the page's own URL, carries `lang=`. */
async function noLangInLinks(page: Page) {
  expect(new URL(page.url()).searchParams.has("lang")).toBe(false);
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.filter((href) => /[?&]lang=/.test(href))).toEqual([]);
}

test("one language: no language switcher, and no `?lang=` in any link", async ({
  page,
}) => {
  test.skip(langs.length > 1, "the deck has more than one language");
  await openDeck(page, `/?s=${S}`);
  await noLangInLinks(page);

  // The menu: its header holds no language switcher.
  await page.keyboard.press("m");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(switcher(page)).toHaveCount(0);
  await expect(menu.getByRole("button", { name: /^Language/ })).toHaveCount(0);
  // Nor its overview.
  await page.keyboard.press("o");
  await expect(page.getByRole("dialog", { name: "Overview" })).toBeVisible();
  await expect(switcher(page)).toHaveCount(0);

  // The PDF links, one for the language, carry none.
  await card(page).getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("menuitem")).toHaveCount(1);
  await expect(page.getByRole("menuitem")).toHaveText(
    `PDF · ${langNames[lang]}`,
  );
  await noLangInLinks(page);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);

  // Stepping keeps the slide in the URL, and the language out of it.
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp(`[?&]s=${S + 1}(?!\\d)`));
  await noLangInLinks(page);
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
});

async function waitFor(url: string, ms: number) {
  const until = Date.now() + ms;
  for (;;) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    if (Date.now() > until) throw new Error(`${url} did not answer`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Runs a command in `cwd`, rejecting on a non-zero exit. */
function run(command: string, args: string[], cwd: string, env: object) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let errors = "";
    child.stderr!.on("data", (chunk) => (errors += chunk));
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")}: ${code}\n${errors}`)),
    );
  });
}

/** The second language's name, in that language, as a deck would add it. */
const secondNames: Record<string, string> = { fr: "Français", de: "Deutsch" };

/** Template-owned and carried folders of the copy's src/ that hold `Text`
 *  strings; the ports (src/components, src/lib, ...) hold none. */
const textFolders = [
  "src/app",
  "src/boot",
  "src/brand",
  "src/deck",
  "src/gate",
  "src/presets",
];

/** Every .ts and .tsx file under `folder` of the copy. */
function sources(folder: string): string[] {
  return readdirSync(join(copy, folder), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) return sources(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    },
  );
}

/** A slide file's source with a second language in its `copy`: after the
 *  first language's words (`en: { … }`), the same words under `second`,
 *  each string that holds a letter marked with the language's code, so a
 *  switch shows on the slide. Figures (numbers, months, a stat's value) stay
 *  as they are. */
function addToCopy(source: string, first: string, second: string) {
  const file = ts.createSourceFile(
    "slide.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let words: ts.PropertyAssignment | undefined;
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text !== "copy") continue;
      let value = declaration.initializer!;
      while (ts.isSatisfiesExpression(value) || ts.isAsExpression(value))
        value = value.expression;
      if (!ts.isObjectLiteralExpression(value)) continue;
      words = value.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) && p.name.getText(file) === first,
      );
    }
  }
  if (!words) throw new Error(`no copy.${first} in a slide file`);
  const value = words.initializer;
  const start = value.getStart(file);
  const strings: ts.StringLiteral[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) &&
      !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)
    )
      strings.push(node);
    ts.forEachChild(node, visit);
  };
  visit(value);
  let text = value.getText(file);
  for (const node of strings.reverse()) {
    if (!/\p{L}/u.test(node.text)) continue;
    const from = node.getStart(file) - start;
    text =
      text.slice(0, from) +
      JSON.stringify(`${second.toUpperCase()} ${node.text}`) +
      text.slice(node.getEnd() - start);
  }
  return (
    source.slice(0, words.getEnd()) +
    `, ${second}: ${text}` +
    source.slice(words.getEnd())
  );
}

/** The two-language copy: the app's files, with a second language added to
 *  langs.ts (its code and its name), to every `Text` string and to every
 *  slide file's words. The second language's slide words are marked with
 *  its code, so a switch shows on the slide; the build's type check fails
 *  if any `Text` or slide file is left without it. */
function writeCopy(second: string) {
  rmSync(copy, { recursive: true, force: true });
  for (const file of [
    "src",
    "public",
    "package.json",
    "next.config.ts",
    "postcss.config.mjs",
    "tsconfig.json",
    // next.config.ts reads the port lock to resolve the ports' `.js`
    // specifiers (P4).
    "scripts/ports.lock.json",
    // The slide files' generated index and data (feature 003).
    "scripts/slides-index.mjs",
  ])
    cpSync(join(root, file), join(copy, file), {
      recursive: true,
      filter: (from) => !from.startsWith(join(root, "public", "pdf")),
    });
  const edit = (file: string, change: (text: string) => string) => {
    const path = join(copy, file);
    const before = readFileSync(path, "utf8");
    const after = change(before);
    writeFileSync(path, after);
    return after !== before;
  };
  expect(
    edit("src/deck/langs.ts", (text) =>
      text
        .replace(
          /(export const langs = \[[^\]]*)\]/,
          (_, list: string) => `${list}, "${second}"]`,
        )
        .replace(
          /(export const langNames[^=]*= \{[^}]*?)\s*\}/,
          (_, names: string) =>
            `${names}, ${second}: ${JSON.stringify(secondNames[second])} }`,
        ),
    ),
    "langs.ts gains the second language",
  ).toBe(true);
  const string = /"(?:[^"\\]|\\.)*"/.source;
  const first = new RegExp(`\\b${lang}: (${string})`, "g");
  let changed = 0;
  for (const file of textFolders.flatMap(sources)) {
    if (file === "src/deck/langs.ts") continue;
    if (
      edit(file, (text) =>
        text.replace(
          first,
          (all, value: string) => `${all}, ${second}: ${value}`,
        ),
      )
    )
      changed++;
  }
  expect(changed, "files whose Text gains the second language").toBeGreaterThan(
    1,
  );
  // Every slide file's words, and the slide data generated from them.
  const slideFiles = readdirSync(join(copy, "src", "slides")).filter((name) =>
    /^\d+-.+\.tsx$/.test(name),
  );
  expect(slideFiles.length, "slide files").toBeGreaterThan(0);
  for (const name of slideFiles)
    expect(
      edit(`src/slides/${name}`, (text) => addToCopy(text, lang, second)),
      `${name} gains the second language`,
    ).toBe(true);
  const indexed = spawnSync(
    process.execPath,
    [join(copy, "scripts", "slides-index.mjs")],
    { cwd: copy, encoding: "utf8" },
  );
  expect(indexed.status, indexed.stderr).toBe(0);
  expect(
    readFileSync(join(copy, "src", "slides", "data.ts"), "utf8"),
  ).toContain(`${second}: {`);
}

test.describe("two languages", () => {
  test.beforeAll(async ({}, info) => {
    if (info.project.name !== "desktop") return;
    if (langs.length > 1) {
      two = { base: "", langs: [...langs], names: { ...langNames } };
      return;
    }
    test.setTimeout(300_000);
    const second = String(lang) === "fr" ? "de" : "fr";
    two = {
      base: `http://127.0.0.1:${port}`,
      langs: [lang, second],
      names: { ...langNames, [second]: secondNames[second] },
    };
    writeCopy(second);
    const env: Record<string, string | undefined> = { ...process.env };
    delete env.NODE_ENV;
    await run("npx", ["next", "build"], copy, env);
    server = spawn(
      "npx",
      ["next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: copy,
        detached: true,
        stdio: "ignore",
        env: { ...env, NODE_ENV: "production" } as NodeJS.ProcessEnv,
      },
    );
    await waitFor(`${two.base}/print`, 60_000);
  });

  test.afterAll(async () => {
    if (server?.pid) {
      const exited = new Promise((resolve) => server!.once("exit", resolve));
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        // Already gone.
      }
      const timer = setTimeout(() => {
        try {
          process.kill(-server!.pid!, "SIGKILL");
        } catch {
          // Already gone.
        }
      }, 5_000);
      await exited;
      clearTimeout(timer);
    }
    if (existsSync(copy)) rmSync(copy, { recursive: true, force: true });
  });

  test("the menu shows the switcher, and switching keeps the slide while `?lang=` joins the link", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "one build, desktop only");
    const [first, second] = two.langs;
    const title = (code: string) =>
      langs.length > 1
        ? (slides[S - 1].title as Record<string, string>)[code]
        : code === first
          ? slides[S - 1].title[lang]
          : `${second.toUpperCase()} ${slides[S - 1].title[lang]}`;
    const heading = (code: string) =>
      current(page).getByRole("heading", { name: title(code), exact: true });

    await openDeck(page, `${two.base}/?s=${S}`);
    await expect(current(page)).toHaveAttribute("aria-label", `${S} / ${N}`);
    await expect(heading(first)).toBeVisible();
    // The first language is the default: the link does not name it.
    expect(new URL(page.url()).searchParams.has("lang")).toBe(false);

    // The menu's header shows the switcher, naming the language.
    await page.keyboard.press("m");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await expect(switcher(page)).toHaveCount(1);
    await expect(switcher(page)).toHaveText(first.toUpperCase());

    // Each language's PDF, in its own name and under its own file.
    await card(page).getByRole("button", { name: "Download" }).click();
    const pdfs = page.getByRole("menuitem");
    await expect(pdfs).toHaveCount(two.langs.length);
    await expect(pdfs).toHaveText(
      two.langs.map((code) => `PDF · ${two.names[code]}`),
    );
    for (const [i, code] of two.langs.entries()) {
      await expect(pdfs.nth(i)).toHaveAttribute(
        "href",
        `/pdf/${pdfName(config.deckTitle, code)}`,
      );
    }
    await page.keyboard.press("Escape");
    await expect(pdfs).toHaveCount(0);

    // The switcher offers each language by its own name. Choosing the
    // second keeps the slide, and the link names it.
    await switcher(page).click();
    const options = page.getByRole("option");
    await expect(options).toHaveText(two.langs.map((code) => two.names[code]));
    await options.filter({ hasText: two.names[second] }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]lang=${second}(?![a-z])`));
    await expect(page).toHaveURL(new RegExp(`[?&]s=${S}(?!\\d)`));
    await expect(page.locator("html")).toHaveAttribute("lang", second);
    await expect(current(page)).toHaveAttribute("aria-label", `${S} / ${N}`);
    await expect(heading(second)).toBeVisible();
    await expect(switcher(page)).toHaveText(second.toUpperCase());

    // A step keeps the language in the link.
    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(new RegExp(`[?&]s=${S - 1}(?!\\d)`));
    await expect(page).toHaveURL(new RegExp(`[?&]lang=${second}(?![a-z])`));

    // The shared link opens the same slide in the same language.
    const shared = page.url();
    const other = await page.context().newPage();
    await openDeck(other, shared);
    await expect(other.locator("html")).toHaveAttribute("lang", second);
    await expect(other.locator("main:not([aria-hidden])")).toHaveAttribute(
      "aria-label",
      `${S - 1} / ${N}`,
    );
    await other.close();

    // Back to the first language: the link drops `?lang=`, the slide stays.
    await page.keyboard.press("m");
    await switcher(page).click();
    await page
      .getByRole("option")
      .filter({ hasText: two.names[first] })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", first);
    await expect(page).toHaveURL(new RegExp(`[?&]s=${S - 1}(?!\\d)`));
    expect(new URL(page.url()).searchParams.has("lang")).toBe(false);
  });
});
