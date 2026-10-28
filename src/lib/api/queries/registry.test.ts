import { describe, expect, it } from "vitest";
import { QUERY_RESOURCES, resolveResource } from "./registry";
import type { ResourceName } from "./registry";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { PREFETCH_STALE_TIME_MS } from "./shared";

const NAMES = Object.keys(QUERY_RESOURCES) as ResourceName[];

describe("QUERY_RESOURCES", () => {
  it("every entry carries a registry action, never an ad-hoc literal", () => {
    const known = Object.values(QUERY_ACTIONS) as readonly (readonly string[])[];

    for (const name of NAMES) {
      expect(
        known.some(
          (action) =>
            action.length === QUERY_RESOURCES[name].action.length &&
            action.every((part, i) => part === QUERY_RESOURCES[name].action[i]),
        ),
        `${name} action is not in QUERY_ACTIONS`,
      ).toBe(true);
    }
  });

  it("every resource can build a key without throwing", () => {
    for (const name of NAMES) {
      expect(() => QUERY_RESOURCES[name].key({}), name).not.toThrow();
    }
  });

  it("keys are non-empty arrays, so two resources cannot collide on []", () => {
    for (const name of NAMES) {
      const key = QUERY_RESOURCES[name].key({});
      expect(Array.isArray(key), name).toBe(true);
      expect(key.length, name).toBeGreaterThan(0);
    }
  });

  it("uses one shared freshness window", () => {
    expect(PREFETCH_STALE_TIME_MS).toBe(30_000);
  });
});

describe("resolveResource", () => {
  it("builds a spec whose key starts with the resource's own action", () => {
    const spec = resolveResource(
      { resource: "assets", params: (params) => ({ apartmentId: String(params.id) }) },
      { id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" },
      new URLSearchParams(),
    );

    expect(spec?.queryKey).toEqual([
      ...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT,
      "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    ]);
  });

  it("returns null when the declaration declines this navigation", () => {
    const spec = resolveResource(
      { resource: "assets", params: () => null },
      {},
      new URLSearchParams(),
    );

    expect(spec).toBeNull();
  });

  it("passes searchParams through, so a tab-gated declaration can read ?tab=", () => {
    const spec = resolveResource(
      {
        resource: "users",
        params: (_params, searchParams) =>
          searchParams.get("tab") === "users" ? {} : null,
      },
      {},
      new URLSearchParams("tab=users"),
    );

    expect(spec?.queryKey).toEqual([...QUERY_ACTIONS.USERS_GET_ALL]);
  });
});
