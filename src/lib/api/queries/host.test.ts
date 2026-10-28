import { describe, expect, it } from "vitest";
import { resolveResource } from "./registry";
import type { ParsedParams } from "@/lib/router/params";
import { hostRoutes } from "@/lib/router/routes/host";
import { adminRoutes } from "@/lib/router/routes/admin";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

interface Declaring {
  path?: string;
  children?: readonly Declaring[];
  data?: readonly {
    resource: string;
    params: (params: Record<string, unknown>, sp: URLSearchParams) => unknown;
  }[];
}

function dataOf(node: Declaring, path: string) {
  const found = (node.children ?? []).find((child) => child.path === path);
  if (!found) throw new Error(`no child route ${path}`);
  return (found.data ?? []) as readonly {
    resource: string;
    params: (params: Record<string, unknown>, sp: URLSearchParams) => unknown;
  }[];
}

function keys(
  routes: readonly { resource: string; params: (p: Record<string, unknown>, sp: URLSearchParams) => unknown }[],
  params: ParsedParams,
  sp = new URLSearchParams(),
) {
  return routes
    .map((request) => resolveResource(request as never, params, sp))
    .filter((spec): spec is NonNullable<typeof spec> => spec !== null)
    .map((spec) => spec.queryKey);
}

describe("the host apartment detail declares every query its page reads", () => {
  const declared = keys(dataOf(hostRoutes as Declaring, "apartments/:id"), { id: VALID_UUID });

  it("declares exactly four queries", () => {
    expect(declared).toHaveLength(4);
  });

  it("covers apartment, assets, shots and reservations", () => {
    const heads = declared.map((key) => key[0]);

    expect(heads).toContain(QUERY_ACTIONS.APARTMENTS_GET_ID[0]);
    expect(heads).toContain(QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT[0]);
    expect(heads).toContain(QUERY_ACTIONS.APARTMENT_SHOTS_GET_BY_APARTMENT[0]);
    expect(heads).toContain(QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT[0]);
  });

  it("keys the reservations query exactly as the section's literal did", () => {
    const key = declared.find(
      (candidate) => candidate[0] === QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT[0],
    );

    expect(key).toEqual([
      ...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT,
      VALID_UUID,
      1,
      10,
      "checkInDatetime",
      "asc",
    ]);
  });

  it("keys assets and shots with the apartment id, so the page hits the same entry", () => {
    const assets = declared.find((k) => k[0] === QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT[0]);
    const shots = declared.find(
      (k) => k[0] === QUERY_ACTIONS.APARTMENT_SHOTS_GET_BY_APARTMENT[0],
    );

    expect(assets).toEqual([...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, VALID_UUID]);
    expect(shots).toEqual([
      ...QUERY_ACTIONS.APARTMENT_SHOTS_GET_BY_APARTMENT,
      VALID_UUID,
    ]);
  });
});

describe("the admin dashboard is tab-gated", () => {
  const dashboard = dataOf(adminRoutes as Declaring, "dashboard");

  it("prefetches the default tab with no ?tab=", () => {
    expect(keys(dashboard, {})).toEqual([[...QUERY_ACTIONS.USERS_GET_ALL]]);
  });

  it("prefetches the apartments tab's data when named", () => {
    const heads = keys(dashboard, {}, new URLSearchParams("tab=apartments")).map(
      (key) => key[0],
    );

    expect(heads).toEqual([
      QUERY_ACTIONS.APARTMENTS_GET_ALL[0],
      QUERY_ACTIONS.LOCATIONS_GET_ALL[0],
    ]);
  });

  it("prefetches nothing extra for an explicit users tab", () => {
    expect(keys(dashboard, {}, new URLSearchParams("tab=users"))).toEqual([
      [...QUERY_ACTIONS.USERS_GET_ALL],
    ]);
  });
});
