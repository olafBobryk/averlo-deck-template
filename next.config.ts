import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// The questionnaire's ports (src/questionnaire/, research R4) import each
// other with `.js` specifiers that name `.ts` files, as its own NodeNext
// build expects. Turbopack does not map those, so each `./<name>.js` a port
// can name resolves to the ported `.ts`/`.tsx` file (research R3a, step 6:
// build settings that let unchanged files resolve). The list comes from the
// port lock, so a re-pin keeps it current.
function questionnaireSpecifiers() {
  const lock = JSON.parse(
    readFileSync(new URL("./scripts/ports.lock.json", import.meta.url), "utf8"),
  ) as {
    sources: { repo: string; files: { target: string }[] }[];
  };
  const files =
    lock.sources.find((s) => s.repo === "averlo-questionnaire-template")
      ?.files ?? [];
  const aliases: Record<string, string> = {};
  for (const { target } of files) {
    const match = /([^/]+)\.tsx?$/.exec(target);
    if (!match) continue;
    const specifier = `./${match[1]}.js`;
    if (aliases[specifier])
      throw new Error(`two questionnaire ports answer ${specifier}`);
    aliases[specifier] = `./${target}`;
  }
  return aliases;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // No dev badge over the footer while rehearsing locally.
  devIndicators: false,
  turbopack: {
    resolveAlias: {
      ...questionnaireSpecifiers(),
      // The questionnaire's shell stylesheet declares SF Pro faces whose
      // files are excluded from the port (not redistributable; research
      // R3a, step 6). Their url()s are left unresolved, as written: the
      // faces are never used, as the top bar sets its font to Inter.
      "../questionnaire/fonts/*": false,
    },
  },
  // Keep the deck out of search engines.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
