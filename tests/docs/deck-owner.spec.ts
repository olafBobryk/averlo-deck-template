import { expect, test } from "@playwright/test";
import { anchor, exists, read, sections, type Section } from "./markdown";

// The deck owner's side (feature 004, T410): AGENTS.md has a section for
// making a deck and one for working on the template, each saying when it
// applies (FR-001). The deck section, with the procedures it points to in
// process/workflows.md, states the light rules (FR-002), the setup on
// macOS, Linux and Windows (FR-006), saving (FR-010), publishing to Vercel
// (FR-007) and the opt-in public scan (FR-008). The README opens with one prompt,
// start to end, from an empty folder (FR-005, the owner's correction of
// 2026-11-23). The constitution is
// amended to 1.1.0 (FR-011). No browser, no server.

const PROCEDURES = {
  setup: "set-up-a-deck",
  save: "save-and-share",
  scan: "turn-on-the-public-scan",
};

function section(path: string, title: RegExp, level = 2): Section {
  expect(exists(path), `${path} exists`).toBe(true);
  const found = sections(read(path)).find(
    (s) => s.level === level && title.test(s.title),
  );
  expect(found, `${path}: a section titled ${title}`).toBeTruthy();
  return found!;
}

/** A procedure of process/workflows.md, by its anchor. */
function procedure(id: string): string {
  const found = sections(read("process/workflows.md")).find(
    (s) => s.level === 2 && anchor(s.title) === id,
  );
  expect(found, `process/workflows.md: the procedure #${id}`).toBeTruthy();
  return found!.body;
}

const deck = () => section("AGENTS.md", /^making a deck$/i).body;

test.describe("the deck owner's side", () => {
  // Data only: the same in both projects, so run once.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "no browser; runs once");
  });

  test("AGENTS.md has both sections, each saying when it applies (FR-001)", () => {
    const top = sections(read("AGENTS.md"))
      .filter((s) => s.level === 2)
      .map((s) => s.title);
    expect(top).toEqual(["Making a deck", "Working on the template"]);
    expect(deck()).toMatch(/^Applies when/m);
    expect(section("AGENTS.md", /^working on the template$/i).body).toMatch(
      /^Applies when/m,
    );
    // The template's rules stay in their section, the constitution first.
    const template = section("AGENTS.md", /^working on the template$/i).body;
    expect(template).toContain(".specify/memory/constitution.md");
    expect(template).toMatch(/Spec Kit cycle/);
    expect(template).toMatch(/ported unchanged/);
  });

  test("AGENTS.md is short: it is loaded into every session", () => {
    const words = read("AGENTS.md").split(/\s+/).filter(Boolean).length;
    expect(words).toBeLessThan(700);
  });

  test("the deck section states the light rules (FR-002)", () => {
    const body = deck();
    expect(body).toMatch(/only the owner's words and figures/i);
    expect(body).toMatch(/one plain question at a time/i);
    expect(body).toMatch(/never ask the owner to type a command/i);
    expect(body).toContain("npm run check:deck");
    expect(body).toMatch(/before showing/i);
    expect(body).toMatch(/no specs or approvals for slides/i);
    for (const rule of [/Spec Kit/, /port/i, /motion/i])
      expect(body, `${rule} doesn't apply`).toMatch(rule);
    expect(body).toMatch(/don't apply to a deck/i);
  });

  test("the deck section points to its procedures, and the menu names them", () => {
    const body = deck();
    const menu = read("WORKFLOWS.md");
    for (const id of [
      ...Object.values(PROCEDURES),
      "draft-a-deck-from-any-source",
    ]) {
      expect(body, `AGENTS.md links #${id}`).toContain(
        `process/workflows.md#${id}`,
      );
      expect(menu, `WORKFLOWS.md links #${id}`).toContain(
        `process/workflows.md#${id}`,
      );
    }
  });

  test("setup on macOS, Linux and Windows, the check browser included (FR-006)", () => {
    const body = procedure(PROCEDURES.setup);
    for (const os of ["macOS", "Linux", "Windows"])
      expect(body, os).toContain(os);
    for (const step of [
      "node --version",
      "npm ci",
      "npx playwright install chromium",
      "npx playwright install-deps chromium",
      "npm run check:deck",
      "npm run dev",
    ])
      expect(body, step).toContain(step);
    expect(body).toMatch(/http:\/\/127\.0\.0\.1:3000/);
  });

  test("saving: a plain commit and a push to the owner's repository, no branches or PRs (FR-010)", () => {
    const body = deck() + procedure(PROCEDURES.save);
    expect(body).toContain("git commit");
    expect(body).toContain("git push");
    expect(body).toMatch(/plain/i);
    expect(body).toMatch(/no branches (and|or) (no )?pull requests/i);
  });

  test("publishing: a one-time Vercel sign-in, a deploy, and redeploys to the same link (FR-007)", () => {
    const body = procedure(PROCEDURES.save);
    expect(body).toContain("npx vercel login");
    expect(body).toContain("npx vercel deploy --prod");
    expect(body).toMatch(/first time|once/i);
    expect(body).toMatch(/same link/i);
    expect(body).toMatch(/free/i);
    expect(body).toMatch(/PDF/);
  });

  test("the public scan is off for a deck until the owner turns it on with their list (FR-008)", () => {
    const body = deck() + procedure(PROCEDURES.scan);
    expect(body).toContain(".local/public-scan-terms.txt");
    expect(body).toContain("npm run scan:public");
    expect(body).toMatch(/public/);
    expect(body).toMatch(/never runs it|off/i);
  });

  test("the README opens with one prompt, start to end, to paste into Codex or Claude Code (FR-005)", () => {
    expect(exists("START.md"), "no separate START.md").toBe(false);
    const text = read("README.md");
    const lines = text.split("\n").filter((line) => line.trim());
    expect(lines[0]).toMatch(/^# /);
    expect(lines[1]).toMatch(/Codex/);
    expect(lines[1]).toMatch(/Claude Code/);
    expect(lines[2]).toBe("```text");
    const fences = [...text.matchAll(/^```text\n([\s\S]*?)^```$/gm)];
    expect(fences.length, "exactly one prompt").toBe(1);
    expect(text.indexOf("```text")).toBeLessThan(text.indexOf("## "));
    const prompt = fences[0][1];
    expect(prompt).toContain(
      "https://github.com/olafBobryk/averlo-deck-template",
    );
    expect(prompt).toMatch(/private GitHub repository/i);
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toMatch(/Making a deck/);
    for (const part of [
      /set .*up|setup/i,
      /browser the checks use/i,
      /start the deck/i,
      /talk it through/i,
      /preset/i,
      /checks/i,
      /save/i,
      /online|publish/i,
      /Vercel/,
    ])
      expect(prompt, `the prompt covers ${part}`).toMatch(part);
    expect(prompt).toMatch(/never ask me to type a command/i);
  });

  test("setting up starts with the owner's own copy of the template", () => {
    const body = procedure(PROCEDURES.setup);
    expect(body).toContain(
      "--template olafBobryk/averlo-deck-template --private",
    );
    expect(body).toContain(
      "https://github.com/new?template_name=averlo-deck-template&template_owner=olafBobryk",
    );
    expect(body).toMatch(/private/i);
  });

  test("the constitution is 1.1.0: its rules bind the template, a deck follows AGENTS.md (FR-011)", () => {
    const text = read(".specify/memory/constitution.md");
    expect(text).toMatch(/\*\*Version\*\*: 1\.1\.0 \|/);
    expect(text).toMatch(/\*\*Last Amended\*\*: 2026-11-22/);
    const scope = section(".specify/memory/constitution.md", /^scope$/i).body;
    expect(scope).toMatch(/work on (this|the) template/i);
    expect(scope).toContain("Making a deck");
    expect(scope).toContain("check:deck");
    expect(scope).toMatch(/Principle III/);
    expect(text).toMatch(
      /1\.1\.0 \(22 November 2026\)[^\n]*"Amend: decks follow AGENTS\.md"/,
    );
  });
});
