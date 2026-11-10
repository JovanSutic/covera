import { describe, expect, it } from "vitest";
import { resolveResource } from "./registry";
import type { ParsedParams } from "@/lib/router/params";
import { hostRoutes } from "@/lib/router/routes/host";
import { adminRoutes } from "@/lib/router/routes/admin";
import { outsideRoutes } from "@/lib/router/routes/public";
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

/** `dataOf` for any node in the tree, so a nested route can be pinned too. */
function deepDataOf(
  node: Declaring,
  path: string,
): {
  resource: string;
  params: (params: Record<string, unknown>, sp: URLSearchParams) => unknown;
}[] {
  if (node.path === path) {
    return [
      ...((node.data ?? []) as {
        resource: string;
        params: (params: Record<string, unknown>, sp: URLSearchParams) => unknown;
      }[]),
    ];
  }

  for (const child of node.children ?? []) {
    const found = deepDataOf(child, path);
    if (found.length > 0) return found;
  }

  return [];
}

describe("the reservation page declares the claim list it renders", () => {
  const declared = keys(
    dataOf(hostRoutes as Declaring, "apartments/:id/reservations/:reservationId"),
    { id: VALID_UUID, reservationId: VALID_UUID },
  );

  it("keeps the three declarations it had, and adds the incidents read", () => {
    // The raw declarations, not the resolved keys: `inspection` and `reservationPhotos`
    // are declared-but-null (D10/D12), so `keys()` drops them by design. The route's
    // own list is where "kept" is visible.
    const heads = dataOf(
      hostRoutes as Declaring,
      "apartments/:id/reservations/:reservationId",
    ).map((request) => request.resource);

    expect(heads).toHaveLength(4);
    expect(heads).toContain("reservation");
    expect(heads).toContain("incidents");
    expect(heads).toContain("inspection");
    expect(heads).toContain("reservationPhotos");
  });

  it("keys the incidents read by the APARTMENT id, not the reservation id", () => {
    // `id` is the apartment and `reservationId` is the reservation. Swapping them
    // would still produce a key, still fetch, and never match the claim page's own
    // read — a cache miss on every navigation between the two surfaces.
    const incidentKeys = declared.filter(
      (key) => key[0] === QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT[0],
    );

    expect(incidentKeys).toEqual([
      [...QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT, VALID_UUID, 1, 100],
    ]);
  });
});

describe("the claim page declares four reads", () => {
  const declared = keys(
    deepDataOf(hostRoutes as Declaring, "apartments/:id/reservations/:reservationId/incident"),
    { id: VALID_UUID, reservationId: VALID_UUID },
  );

  it("has four declarations, one of which resolves to null", () => {
    const raw = deepDataOf(
      hostRoutes as Declaring,
      "apartments/:id/reservations/:reservationId/incident",
    );

    expect(raw).toHaveLength(4);
    // Three keys, not four: the incident's own id is not in the URL, so its
    // declaration returns null and starts no request. The page's `useIncident`
    // owns that read once the list resolves (D11).
    expect(declared).toHaveLength(3);
  });

  it("covers reservation, assets and the apartment's claim list", () => {
    const heads = declared.map((key) => key[0]);

    expect(heads).toContain(QUERY_ACTIONS.RESERVATIONS_GET_ID[0]);
    expect(heads).toContain(QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT[0]);
    expect(heads).toContain(QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT[0]);
  });

  it("keys each read off the parameter it actually needs", () => {
    // reservation ← reservationId, assets and incidents ← the apartment id. Both
    // ids are uuids in the same URL, so this is the assertion that a swap cannot
    // pass by accident; the two values are made DIFFERENT here for that reason.
    const other = "9f2504e0-4f89-41d3-9a0c-0305e82c3399";
    const otherKeys = keys(
      deepDataOf(hostRoutes as Declaring, "apartments/:id/reservations/:reservationId/incident"),
      { id: VALID_UUID, reservationId: other },
    );

    expect(otherKeys).toContainEqual([...QUERY_ACTIONS.RESERVATIONS_GET_ID, other]);
    expect(otherKeys).toContainEqual([
      ...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT,
      VALID_UUID,
    ]);
    expect(otherKeys).toContainEqual([
      ...QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT,
      VALID_UUID,
      1,
      100,
    ]);
  });
});

describe("the field route prefetches its own read, anonymously", () => {
  it("declares fieldIngest keyed by the token from the URL", () => {
    const token = "0123456789abcdef0123456789abcdef";
    const declared = keys(
      deepDataOf({ children: outsideRoutes } as Declaring, "field/incident/:token"),
      { token },
    );

    expect(declared).toEqual([[...QUERY_ACTIONS.FIELD_INGEST_GET_BY_TOKEN, token]]);
  });
});
