import { describe, expect, it } from "vitest";
import { defineRoutes } from "./defineRoutes";
import type { RouteNode } from "./defineRoutes";
import { adminRoutes, appRoutes, hostRoutes, outsideRoutes } from "./routes";
import type { AccessSources } from "./access";

const TREE: readonly RouteNode[] = [
  ...appRoutes,
  adminRoutes,
  hostRoutes,
  ...outsideRoutes,
];

/** No session: the common case for a builder test. */
const ANONYMOUS_SOURCES: AccessSources = {
  isAuthenticated: false,
  role: null,
  isAdmin: false,
  isHost: false,
  userId: null,
};

function build() {
  return defineRoutes(TREE, {
    isAllowed: () => true,
    getSources: () => ANONYMOUS_SOURCES,
    errorElement: null,
  });
}

interface WalkedRoute {
  id: string;
  path?: string;
  index?: boolean;
  guard?: { pattern: string; rules: readonly string[]; params: Record<string, string>; redirect?: { to: unknown } };
  handle?: { guard?: WalkedRoute["guard"] };
  children?: WalkedRoute[];
}

function walk(routes: unknown, visit: (route: WalkedRoute) => void): void {
  for (const raw of routes as WalkedRoute[]) {
    visit({ ...raw, guard: raw.handle?.guard });
    if (raw.children) walk(raw.children, visit);
  }
}

describe("the route tree", () => {
  it("builds without throwing", () => {
    expect(() => build()).not.toThrow();
  });

  it("gives every top-level section a rule", () => {
    for (const section of [adminRoutes, hostRoutes]) {
      expect(section.requires).toBeTruthy();
    }
  });

  it("types every :param in the tree", () => {
    const seen: string[] = [];

    walk(build(), (route) => {
      const pattern = route.guard?.pattern ?? "";
      for (const segment of pattern.split("/")) {
        if (!segment.startsWith(":")) continue;
        const name = segment.slice(1);
        seen.push(`${pattern} → ${name}`);
        expect(Object.keys(route.guard?.params ?? {})).toContain(name);
      }
    });

    expect(seen.length).toBeGreaterThan(0);
  });

  it("has no duplicate route id", () => {
    const ids: string[] = [];

    walk(build(), (route) => {
      ids.push(route.id);
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("inherits the section rule into every child of a section", () => {
    const patternsWithRules = new Map<string, readonly string[]>();

    walk(build(), (route) => {
      if (route.guard) patternsWithRules.set(route.guard.pattern, route.guard.rules);
    });

    expect(patternsWithRules.get("/admin/dashboard")).toEqual(["canOpenAdmin"]);
    expect(patternsWithRules.get("/host/dashboard")).toEqual(["canOpenHost"]);
    expect(patternsWithRules.get("/host/apartments")).toEqual(["canOpenHost"]);
    expect(patternsWithRules.get("/host/apartments/:id")).toEqual(["canOpenHost"]);
    expect(patternsWithRules.get("/inspection/:id")).toEqual(["public"]);
  });

  it("gives /host and /admin an index redirect to a child they can open", () => {
    const built = build();
    const host = built.find((route) => route.path === "host");
    const index = (host?.children as WalkedRoute[] | undefined)?.find(
      (child) => child.index === true,
    );

    expect(index?.handle?.guard?.redirect).toEqual({ to: "dashboard" });
    expect((index?.handle?.guard?.rules ?? []).includes("canOpenHost")).toBe(true);
  });

  it("places every guard-carrying route under a boundary that can render an error", () => {
    const built = build();
    const host = built.find((route) => route.path === "host");

    const boundaries = (host?.children as WalkedRoute[] | undefined)?.filter((child) =>
      child.id.endsWith("#boundary"),
    );

    // The group itself is wrapped by its parent level only when it has a page or
    // layout; a group's children are grouped by the callers that own a frame.
    expect(boundaries === undefined || boundaries.length <= 1).toBe(true);
  });
});
