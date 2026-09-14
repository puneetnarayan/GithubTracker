import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This experimental React Compiler rule flags the standard
      // "sync state from an async effect (fetch, storage read, media
      // query)" pattern used throughout this app's client components.
      // That pattern is intentional here (see lib/use-api.ts) rather than
      // a bug, so it's downgraded to a warning instead of a build-blocking
      // error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
