import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  globalIgnores(["dist", "src/api/generated/**/*"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // R34/R1: routes are data. A lazy route cannot be a guard (R3), and an
    // element/lazy/loader written by hand is exactly what the builder replaced.
    files: ["src/lib/router/routes/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name='lazy'], Property[key.name='element'], Property[key.name='Component'], Property[key.name='ErrorBoundary']",
          message:
            "Routes are data (R1). Declare `page`/`layout`/`requires`/`params` — the builder writes lazy/element/Component for you.",
        },
      ],
    },
  },
  {
    // R26: an access decision is a comparison against a role, and those live only
    // in the access layer. The selector is deliberately narrower than "any role
    // literal": "host" and "guest" are ALSO i18n namespaces, so a blanket literal
    // ban fires on `useTranslation("host")` in a dozen components and on
    // `z.enum(["admin","host","guest"])` in CreateUserForm — all false positives.
    // A BinaryExpression operand has no such innocent reading.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/router/access.ts",
      "src/lib/auth.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__checks__/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "BinaryExpression[left.value='admin'], BinaryExpression[right.value='admin'], BinaryExpression[left.value='host'], BinaryExpression[right.value='host'], BinaryExpression[left.value='guest'], BinaryExpression[right.value='guest']",
          message:
            "Comparing against a role literal is an access decision, and those belong in src/lib/router/access.ts (R26). Ask a rule (useAccessRule/isAllowed) instead. Note: `role ?? \"guest\"` (a default) and `useTranslation(\"host\")` (a namespace) are not comparisons and are deliberately allowed.",
        },
      ],
    },
  },
  {
    // R30: one package. `react-router-dom` is a re-export of `react-router` in v7
    // and importing both doubles the router in the bundle.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: ["react-router-dom"] },
      ],
    },
  },
  {
    // Principle 6: the router must be built by the factory, never at module level.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/router/createAppRouter.tsx", "**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='createBrowserRouter']",
          message:
            "createBrowserRouter belongs in createAppRouter.tsx, called by createAppRouter() — never at module level (principle 6).",
        },
      ],
    },
  },
]);
