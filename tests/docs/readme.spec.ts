import { expect, test } from "@playwright/test";
import { exists, read, sections, type Section } from "./markdown";

// The README (T040; SC-001, FR-009, FR-018, FR-020, FR-021): it has a
// section for each thing a new deck owner needs, and every `npm run` script
// it names exists. No browser, no server.

test.describe("README", () => {
  // Data only: the same in both projects, so run once.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "no browser; runs once");
  });

  const readme = () => {
    expect(exists("README.md"), "README.md exists").toBe(true);
    return read("README.md");
  };

  /** The section whose title matches, with every subsection's text. */
  function section(title: RegExp): Section {
    const found = sections(readme()).find(
      (s) => s.level >= 2 && title.test(s.title),
    );
    expect(found, `a README section titled ${title}`).toBeTruthy();
    return found!;
  }

  test("quickstart: use the template, install, run, open", () => {
    const { body } = section(/quickstart/i);
    expect(body).toMatch(/use this template/i);
    expect(body).toContain("npm ci");
    expect(body).toContain("npm run dev");
    expect(body).toMatch(/https?:\/\/127\.0\.0\.1:\d+|localhost/);
    expect(body).toMatch(/10 minutes/);
  });

  test("presenting keys, as in the deck contract", () => {
    const { body } = section(/present/i);
    for (const key of [
      "→",
      "←",
      "Space",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      "F",
      "M",
      "O",
      "Esc",
    ]) {
      expect(body, `the key ${key}`).toContain(key);
    }
    for (const param of ["?s=", "?lang=", "?intro=off"]) {
      expect(body, `the URL parameter ${param}`).toContain(param);
    }
  });

  test("brand and language config", () => {
    const { body } = section(/brand|language|config/i);
    for (const path of [
      "src/brand/config.ts",
      "src/deck/langs.ts",
      "src/deck/slides.ts",
      "public/brand/",
      "docs/licences.md",
    ]) {
      expect(body, path).toContain(path);
    }
    for (const word of ["averlo", "owner", "deckTitle", "accent"]) {
      expect(body, word).toContain(word);
    }
  });

  test("the drift test: re-pin, re-target, turn off", () => {
    const { body } = section(/drift/i);
    expect(body).toContain("npm run check:ports");
    expect(body).toContain("scripts/ports.manifest.json");
    expect(body).toMatch(/re-pin/i);
    expect(body).toMatch(/re-target/i);
    expect(body).toMatch(/turn (it )?off/i);
    expect(body).toContain('"driftTest": false');
    expect(body).toContain("commit");
    expect(body).toContain("process/workflows.md#port-the-design-system");
  });

  test("the public scan: own blocked-term list, or turn it off", () => {
    const { body } = section(/public scan/i);
    expect(body).toContain("npm run scan:public");
    expect(body).toContain("SCAN_TERMS_FILE");
    expect(body).toContain(".local/");
    expect(body).toMatch(/turn (it )?off/i);
  });

  test("the gate: what it runs, and passed, failed and not run", () => {
    const { body } = section(/gate/i);
    expect(body).toContain("npm run gate");
    for (const check of [
      "check",
      "test:tools",
      "test:smoke",
      "test:strips",
      "check:ports",
      "scan:public",
    ]) {
      expect(body, `the gate runs ${check}`).toContain(check);
    }
    for (const status of ["passed", "failed", "not run"]) {
      expect(body, `the status ${status}`).toContain(status);
    }
  });

  test("licence: MIT, with the Averlo name and mark excluded", () => {
    const { body } = section(/licen[cs]e/i);
    expect(body).toContain("MIT");
    expect(body).toMatch(/Averlo name and mark/i);
    expect(body).toContain("LICENSE");
    expect(body).toContain("docs/licences.md");
  });

  test("every npm script it names exists in package.json", () => {
    const scripts = Object.keys(
      (JSON.parse(read("package.json")) as { scripts: object }).scripts,
    );
    const named = [...readme().matchAll(/npm run ([\w:.-]+)/g)].map(
      (m) => m[1],
    );
    expect(named.length).toBeGreaterThan(0);
    for (const name of new Set(named)) {
      expect(scripts, `npm run ${name}`).toContain(name);
    }
  });
});
