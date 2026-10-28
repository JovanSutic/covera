/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { matchRoutes } from "react-router";
import { QueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { defineRoutes } from "./defineRoutes";
import type { RouteNode } from "./defineRoutes";
import type { GuardMeta } from "./defineRoutes";
import type { RuleName } from "./access";

const ALLOW_ALL = () => true;
const ALLOW_NONE = () => false;

function build(
  routes: readonly RouteNode[],
  allow: (rule: RuleName) => boolean = ALLOW_ALL,
  variant?: string,
) {
  return defineRoutes(routes, { isAllowed: allow, errorElement: null, variant });
}

// The pathless boundary a layout or grouped node wraps its children in (D12).
function childrenOf(routes: ReturnType<typeof build>, index = 0) {
  const node = routes[index];
  const wrapped = node.children as unknown as { children: unknown[] }[];
  return wrapped[0].children as unknown as Record<string, any>[];
}

function loaderOf(routes: ReturnType<typeof build>, id: string) {
  const match = routes.find((route) => route.id === id);
  if (!match?.loader) throw new Error(`no loader for ${id}`);
  return match.loader as (args: {
    params: Record<string, string | undefined>;
    request: Request;
  }) => Promise<unknown>;
}

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("defineRoutes", () => {
  it("throws when a :param has no declared type", () => {
    expect(() =>
      build([{ path: "apartments/:id", requires: "public", page: async () => ({ default: () => null }) }]),
    ).toThrow(/:id" has no declared param type/);
  });

  it("throws on duplicate sibling ids", () => {
    expect(() =>
      build([
        { path: "host", requires: "public", page: async () => ({ default: () => null }) },
        { path: "host", requires: "public", page: async () => ({ default: () => null }) },
      ]),
    ).toThrow(/duplicate route id/);
  });

  it("inherits a parent rule into the child's guard, root first", () => {
    const [section] = build([
      {
        path: "host",
        requires: "canOpenHost",
        page: async () => ({ default: () => null }),
        children: [
          { path: "dashboard", page: async () => ({ default: () => null }) },
        ],
      },
    ]);

    const dashboard = childrenOf([section])[0];
    expect(dashboard.handle.guard.rules).toEqual(["canOpenHost"]);
  });

  it("drops a route whose variant is not the build variant", () => {
    const built = build(
      [
        {
          path: "offline",
          requires: "public",
          variants: ["offline"],
          page: async () => ({ default: () => null }),
        },
        { path: "online", requires: "public", page: async () => ({ default: () => null }) },
      ],
      ALLOW_ALL,
      "online",
    );

    expect(built).toHaveLength(1);
    expect(built[0].path).toBe("online");
  });
});

describe("the page loader", () => {
  it("throws 403 before importing the page when a rule fails", async () => {
    const importPage = vi.fn(async () => ({ default: () => null }));
    const built = build(
      [{ path: "admin", requires: "canOpenAdmin", page: importPage }],
      ALLOW_NONE,
    );
    const loader = loaderOf(built, "/admin#page");

    await expect(
      loader({ params: {}, request: new Request("http://localhost/admin") }),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(importPage).not.toHaveBeenCalled();
  });

  it("throws 404 before importing the page when a param is invalid", async () => {
    const importPage = vi.fn(async () => ({ default: () => null }));
    const built = build([
      { path: "inspection/:id", requires: "public", params: { id: "uuid" }, page: importPage },
    ]);
    const loader = loaderOf(built, "/inspection/:id#page");

    await expect(
      loader({
        params: { id: "not-a-uuid" },
        request: new Request("http://localhost/inspection/not-a-uuid"),
      }),
    ).rejects.toMatchObject({ init: { status: 404 } });
    expect(importPage).not.toHaveBeenCalled();
  });

  it("imports the page and returns null when the checks pass", async () => {
    const importPage = vi.fn(async () => ({ default: () => null }));
    const built = build([
      { path: "inspection/:id", requires: "public", params: { id: "uuid" }, page: importPage },
    ]);
    const loader = loaderOf(built, "/inspection/:id#page");

    await expect(
      loader({
        params: { id: VALID_UUID },
        request: new Request(`http://localhost/inspection/${VALID_UUID}`),
      }),
    ).resolves.toBeNull();
    expect(importPage).toHaveBeenCalledTimes(1);
  });

  it("enforces the whole inherited chain, not just the route's own rule", async () => {
    const importChild = vi.fn(async () => ({ default: () => null }));
    const built = build(
      [
        {
          path: "host",
          requires: "canOpenHost",
          page: async () => ({ default: () => null }),
          children: [{ path: "apartments", page: importChild }],
        },
      ],
      // The parent passes, the child's inherited rule does not.
      (rule) => rule !== "canOpenHost",
    );

    const child = childrenOf(built)[0];

    await expect(
      child.loader({ params: {}, request: new Request("http://localhost/host/apartments") }),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(importChild).not.toHaveBeenCalled();
  });

  it("builds a stable id per pattern and kind", () => {
    const built = build([
      {
        path: "host",
        requires: "public",
        page: async () => ({ default: () => null }),
        children: [
          { index: true, loader: { to: "dashboard" } },
          { path: "apartments", page: async () => ({ default: () => null }) },
        ],
      },
    ]);

    expect(built[0].id).toBe("/host#page");

    const children = built[0].children as unknown as { id?: string; errorElement?: unknown }[];
    // One pathless boundary wrapping the siblings, then the siblings themselves.
    expect(children[0].id).toBe("/host#boundary");
    const siblings = children[0] as unknown as { children: { id?: string }[] };
    expect(siblings.children.map((child) => child.id)).toEqual([
      "/host#index",
      "/host/apartments#page",
    ]);
  });

  it("matches a nested URL through matchRoutes, so ids are usable by the preloader", () => {
    const built = build([
      {
        path: "host",
        requires: "public",
        page: async () => ({ default: () => null }),
        children: [
          {
            path: "apartments/:id",
            params: { id: "uuid" },
            page: async () => ({ default: () => null }),
          },
        ],
      },
    ]);

    const matches = matchRoutes(built, `/host/apartments/${VALID_UUID}`);

    expect(matches).not.toBeNull();
    expect(matches?.at(-1)?.route.id).toBe("/host/apartments/:id#page");
    expect(matches?.at(-1)?.params.id).toBe(VALID_UUID);
  });
});

describe("data declarations and group preloads", () => {
  it("a group route with data gets a preload (hole 1's regression test)", () => {
    const built = build([
      {
        path: "section",
        requires: "public",
        data: [{ resource: "apartmentsHost", params: () => ({}) }],
        children: [],
      } as RouteNode,
    ]);

    const guard = (built[0].handle as { guard?: GuardMeta }).guard;
    const started: string[] = [];
    vi.spyOn(QueryClient.prototype, "prefetchQuery").mockImplementation(
      async (options: { queryKey: readonly unknown[] }) => {
        started.push(JSON.stringify(options.queryKey));
        return undefined as never;
      },
    );

    expect(guard?.preload).toBeDefined();
    guard?.preload?.({}, new URLSearchParams());

    expect(started).toEqual([
      JSON.stringify([...QUERY_ACTIONS.APARTMENTS_GET_HOST]),
    ]);

    vi.restoreAllMocks();
  });

  it("a route with neither a module nor data has no preload", () => {
    const built = build([
      { path: "empty", requires: "public", children: [] } as RouteNode,
    ]);

    const guard = (built[0].handle as { guard?: GuardMeta }).guard;
    expect(guard?.preload).toBeUndefined();
  });

  it("prefetch receives the href's search params", () => {
    const seen: (string | null)[] = [];

    const built = build([
      {
        path: "tabs",
        requires: "public",
        prefetch: (_params, searchParams) => {
          seen.push(searchParams.get("tab"));
        },
      } as RouteNode,
    ]);

    const guard = (built[0].handle as { guard?: GuardMeta }).guard;
    guard?.preload?.({}, new URLSearchParams("tab=users"));

    expect(seen).toEqual(["users"]);
  });

  it("a declined declaration starts nothing", () => {
    const built = build([
      {
        path: "gated",
        requires: "public",
        data: [{ resource: "users", params: () => null }],
        children: [],
      } as RouteNode,
    ]);

    const spy = vi.spyOn(QueryClient.prototype, "prefetchQuery");
    const guard = (built[0].handle as { guard?: GuardMeta }).guard;
    guard?.preload?.({}, new URLSearchParams());

    expect(spy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("the loader no longer carries recordCheck (D10)", async () => {
    const load = loaderOf(
      build([
        {
          path: "apartments/:id",
          requires: "public",
          params: { id: "uuid" },
          page: async () => ({ default: () => null }),
        } as RouteNode,
      ]),
      "/apartments/:id#page",
    );

    await expect(
      load({
        params: { id: VALID_UUID },
        request: new Request(`https://x.test/apartments/${VALID_UUID}`),
      }),
    ).resolves.toBeNull();
  });
});
