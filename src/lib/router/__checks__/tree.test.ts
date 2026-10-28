import { describe, expect, it } from "vitest";

import { defineRoutes } from "../defineRoutes";
import type { GuardMeta, RouteNode } from "../defineRoutes";
import { ACCESS_RULES } from "../access";
import type { AccessSources } from "../access";
import { appPaths } from "../paths";
import { adminRoutes, appRoutes, hostRoutes, outsideRoutes } from "../routes";

const TREE: readonly RouteNode[] = [
  ...appRoutes,
  adminRoutes,
  hostRoutes,
];

/** No session: the common case for a builder test. */
const ANONYMOUS_SOURCES: AccessSources = {
  isAuthenticated: false,
  role: null,
  isAdmin: false,
  isHost: false,
  userId: null,
};

/** A stub access layer: every rule passes, so the tree builds for inspection (H13). */
const deps = {
  isAllowed: () => true,
  getSources: () => ANONYMOUS_SOURCES,
  errorElement: null,
};

/** One built RouteObject, narrowed to the parts the builder is contracted to write. */
interface Built {
  id?: string;
  path?: string;
  index?: boolean;
  handle?: { guard?: GuardMeta };
  children?: Built[];
}

/** `handle.guard` is where the builder puts the facts (see p6's preloader) — not `route.guard`. */
function flatten(routes: unknown): Built[] {
  const out: Built[] = [];

  for (const route of routes as Built[]) {
    out.push(route);
    if (route.children) out.push(...flatten(route.children));
  }

  return out;
}

/**
 * Both trees, because `appPaths` spans both: `login`/`updatePassword` live only in
 * `outsideRoutes`, and everything else only in the app tree (p5 split them). The
 * builder is called twice rather than once with both lists, so this test also
 * exercises the duplicate-id check the factory relies on.
 */
const APP_BUILT = flatten(defineRoutes(TREE, deps));
const OUTSIDE_BUILT = flatten(defineRoutes(outsideRoutes, deps));
const BUILT = [...APP_BUILT, ...OUTSIDE_BUILT];

/**
 * H13's unique value: `appPaths` is hand-written and the route is hand-written, so
 * nothing except this check notices when they disagree. TypeScript cannot — both
 * sides are individually well-typed. A typo'd rule *name* is a compile error
 * (`requires?: RuleName`), a duplicate id and an untyped `:param` both throw inside
 * the builder, so those are deliberately not re-checked here.
 */
function mismatches(): string[] {
  const found: string[] = [];
  const guardByPattern = new Map<string, GuardMeta>();

  for (const route of BUILT) {
    if (route.handle?.guard) {
      guardByPattern.set(route.handle.guard.pattern, route.handle.guard);
    }
  }

  for (const [name, definition] of Object.entries(appPaths)) {
    const guard = guardByPattern.get(definition.pattern);

    if (!guard) {
      found.push(`appPaths.${name} (${definition.pattern}) has no route`);
      continue;
    }

    if (JSON.stringify(guard.rules) !== JSON.stringify(definition.requires)) {
      found.push(
        `appPaths.${name} requires ${JSON.stringify(definition.requires)} but the ` +
          `route inherits ${JSON.stringify(guard.rules)}`,
      );
    }

    const declared = Object.keys(definition.params).sort();
    const actual = Object.keys(guard.params).sort();

    if (JSON.stringify(declared) !== JSON.stringify(actual)) {
      found.push(
        `appPaths.${name} declares params ${JSON.stringify(declared)} but the route ` +
          `has ${JSON.stringify(actual)}`,
      );
    }
  }

  const ids = BUILT.map((route) => route.id).filter(Boolean) as string[];
  if (new Set(ids).size !== ids.length) {
    found.push(`duplicate built route id among ${ids.length} routes`);
  }

  return found;
}

describe("the static route tree (H13)", () => {
  it("builds for a stub access layer", () => {
    expect(() => defineRoutes(TREE, deps)).not.toThrow();
  });

  it("has no path definition that disagrees with the tree", () => {
    expect(mismatches()).toEqual([]);
  });

  it("answers every rule name the tree uses with a real rule", () => {
    for (const route of BUILT) {
      for (const rule of route.handle?.guard?.rules ?? []) {
        expect(Object.keys(ACCESS_RULES)).toContain(rule);
      }
    }
  });

  it("keeps the outside tree outside the shell", () => {
    const outsideIds = OUTSIDE_BUILT.map((route) => route.id);

    // /login and /update-password render outside the shell, so they are built
    // separately — and must therefore not appear in the app tree.
    expect(outsideIds).toContain("/login#page");
    expect(outsideIds).toContain("/update-password#page");
    expect(APP_BUILT.some((route) => route.id === "/login#page")).toBe(false);
    expect(APP_BUILT.some((route) => route.id === "/update-password#page")).toBe(false);
  });

  it("has a * route inside the app tree, so 404s keep the shell", () => {
    expect(APP_BUILT.some((route) => route.path === "*")).toBe(true);
  });
});
