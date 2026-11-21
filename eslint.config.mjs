import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".local/**",
    ".claude/**",
    ".agents/**",
    ".specify/**",
    ".next/**",
    "out/**",
    "test-results/**",
    "playwright-report/**",
    "gate-results/**",
    "next-env.d.ts",
    // Carried as is; changes listed in docs/carried.
    "src/motion/**",
    // Ported unchanged from the Averlo sources (scripts/ports.lock.json);
    // never linted or fixed (process/workflows.md#port-the-design-system).
    "src/components/**",
    "src/config/**",
    "src/font/**",
    "src/hooks/**",
    "src/lib/**",
    "src/questionnaire/**",
  ]),
]);
