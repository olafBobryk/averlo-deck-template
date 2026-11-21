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
    "next-env.d.ts",
    // Carried as is; changes listed in docs/carried.
    "src/motion/**",
    "src/_origin-temp/**",
  ]),
]);
