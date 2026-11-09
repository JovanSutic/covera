import { beforeEach, describe, expect, it, vi } from "vitest";

import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { QUERY_HOOKS } from "./manifest";
import { fieldIngestQueryKey, fetchFieldIngest } from "./fieldIngest";
import { incidentQueryKey } from "./incident";
import {
  INCIDENTS_DEFAULT_LIMIT,
  INCIDENTS_DEFAULT_PAGE,
  fetchIncidents,
  incidentsQueryKey,
} from "./incidents";

const APARTMENT_ID = "22222222-2222-2222-2222-222222222222";
const INCIDENT_ID = "44444444-4444-4444-4444-444444444444";
const TOKEN = "a".repeat(32);

// The two SDK mocks are typed by their REQUEST rather than left bare: a
// `vi.fn(async () => …)` declares no parameters, so its call tuple infers as `[]`
// and `mock.calls[0][0]` is an out-of-range index — the assertions below read the
// request the fetchers built, which is the only way to pin the `query` and `path`
// each one sends.
const { getIncidents, getFieldIngestByToken, withAuth } = vi.hoisted(() => ({
  getIncidents: vi.fn<(options: { query: Record<string, unknown> }) => Promise<{ data: unknown }>>(
    async () => ({ data: { data: [], pagination: {} } }),
  ),
  getFieldIngestByToken: vi.fn<
    (options: { path: { token: string } }) => Promise<{ data: unknown }>
  >(async () => ({ data: { apartmentName: "Villa" } })),
  withAuth: vi.fn(async () => ({ headers: { Authorization: "Bearer test" } })),
}));

// The spread is mandatory: `registry.ts` dereferences each module's `xResource`
// export at load, and a wholesale replacement erases it.
vi.mock("@/api/generated/requests/sdk.gen", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/generated/requests/sdk.gen")>()),
  getIncidents,
  getFieldIngestByToken,
}));

vi.mock("@/lib/api/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/api")>()),
  withAuth,
}));

beforeEach(() => {
  getIncidents.mockClear();
  getFieldIngestByToken.mockClear();
  withAuth.mockClear();
});

describe("the new key builders", () => {
  it("starts the list key with its action and carries the paging", () => {
    expect(incidentsQueryKey({ apartmentId: APARTMENT_ID })).toEqual([
      ...QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT,
      APARTMENT_ID,
      INCIDENTS_DEFAULT_PAGE,
      INCIDENTS_DEFAULT_LIMIT,
    ]);
  });

  it("keeps page and limit in the identity, so two pagings cannot collide", () => {
    expect(incidentsQueryKey({ apartmentId: APARTMENT_ID, page: 1, limit: 10 })).not.toEqual(
      incidentsQueryKey({ apartmentId: APARTMENT_ID, page: 2, limit: 10 }),
    );
  });

  it("keys the detail and the field read by their own action", () => {
    expect(incidentQueryKey(INCIDENT_ID)).toEqual([
      ...QUERY_ACTIONS.INCIDENTS_GET_ID,
      INCIDENT_ID,
    ]);
    expect(fieldIngestQueryKey(TOKEN)).toEqual([
      ...QUERY_ACTIONS.FIELD_INGEST_GET_BY_TOKEN,
      TOKEN,
    ]);
  });

  it("builds a key from an empty params bag without throwing", () => {
    // `registry.test.ts` calls every resource's `key({})`; this pins the fallback
    // that keeps that check honest rather than accidentally passing.
    expect(() => incidentsQueryKey({} as never)).not.toThrow();
    expect(incidentQueryKey(undefined as unknown as string).length).toBeGreaterThan(0);
    expect(fieldIngestQueryKey(undefined as unknown as string).length).toBeGreaterThan(0);
  });
});

describe("the manifest sees the new hooks", () => {
  it("registers all three, so the coverage check is not vacuous", () => {
    // A module registered in QUERY_RESOURCES but absent from manifest.ts's MODULES
    // would make its hooks invisible to `hooksUsedBy`, and prefetchCoverage would
    // then pass for a page that declares nothing. This is the assertion that catches
    // that silent case.
    expect(QUERY_HOOKS).toHaveProperty("useIncidents", "incidents");
    expect(QUERY_HOOKS).toHaveProperty("useIncident", "incident");
    expect(QUERY_HOOKS).toHaveProperty("useFieldIngest", "fieldIngest");
  });

  it("lists the incident and field actions exactly once each", () => {
    const actions = Object.values(QUERY_ACTIONS).map((action) => action.join("/"));

    expect(actions.filter((action) => action === "incidents/getByApartment")).toHaveLength(1);
    expect(actions.filter((action) => action === "incidents/getId")).toHaveLength(1);
    expect(actions.filter((action) => action === "fieldIngest/getByToken")).toHaveLength(1);
  });
});

describe("fetchIncidents", () => {
  it("always asks for the apartment, sorted newest first", async () => {
    await fetchIncidents({ apartmentId: APARTMENT_ID });

    expect(getIncidents).toHaveBeenCalledTimes(1);
    expect(getIncidents.mock.calls[0][0].query).toEqual({
      apartmentId: APARTMENT_ID,
      page: INCIDENTS_DEFAULT_PAGE,
      limit: INCIDENTS_DEFAULT_LIMIT,
      sortBy: "createdAt",
      order: "desc",
    });
  });

  it("never sends a reservationId — the API has no such filter", async () => {
    await fetchIncidents({ apartmentId: APARTMENT_ID });

    expect(getIncidents.mock.calls[0][0].query).not.toHaveProperty("reservationId");
  });

  it("authenticates with withAuth", async () => {
    await fetchIncidents({ apartmentId: APARTMENT_ID });

    expect(withAuth).toHaveBeenCalled();
  });
});

describe("fetchFieldIngest", () => {
  it("sends the token as the path parameter", async () => {
    await fetchFieldIngest(TOKEN);

    expect(getFieldIngestByToken).toHaveBeenCalledTimes(1);
    expect(getFieldIngestByToken.mock.calls[0][0].path).toEqual({ token: TOKEN });
  });

  it("makes no authenticated call — the token IS the credential (D12)", async () => {
    await fetchFieldIngest(TOKEN);

    expect(withAuth).not.toHaveBeenCalled();
  });

  it("does not decide which failure the link had", async () => {
    // 404 covers unknown, expired and already-used alike (D23). The module lets the
    // error through; the page renders one screen for all three.
    getFieldIngestByToken.mockRejectedValueOnce(new Error("FIELD_TOKEN_INVALID"));

    await expect(fetchFieldIngest(TOKEN)).rejects.toThrow("FIELD_TOKEN_INVALID");
  });
});
