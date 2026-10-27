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
    // R26 + principle 6. These two live in ONE config object on purpose: under
    // flat config the last matching object's `no-restricted-syntax` REPLACES any
    // earlier one wholesale (it does not merge the selector arrays), so splitting
    // them across two objects with the same `files` silently disabled R26.
    // The ignores below therefore have to cover both rules' exemptions.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // R26 exemptions: the access layer and the role type's home.
      "src/lib/router/access.ts",
      "src/lib/auth.ts",
      // The router factory is the one place createBrowserRouter may be called.
      "src/lib/router/createAppRouter.tsx",
      // Tests assert on roles and build routers deliberately.
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__checks__/**",
      // `src/lib/router/routes/**` gets its own object below, because a route
      // file must be judged by the "routes are data" selector, not this one.
      "src/lib/router/routes/**",
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
        {
          selector: "CallExpression[callee.name='createBrowserRouter']",
          message:
            "createBrowserRouter belongs in createAppRouter.tsx, called by createAppRouter() — never at module level (principle 6).",
        },
      ],
    },
  },
  {
    // R34/R1 + principle 6 for the route data files. This object must be the LAST
    // one matching `src/lib/router/routes/**`, or its selector array wins and the
    // "routes are data" lock goes dead (the bug this file previously had).
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
        {
          selector: "CallExpression[callee.name='createBrowserRouter']",
          message:
            "createBrowserRouter belongs in createAppRouter.tsx, called by createAppRouter() — never at module level (principle 6).",
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
]);
