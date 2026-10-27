import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { apartmentQueryKey, fetchApartment } from "./apartment";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { appPaths } from "@/lib/router/paths";

vi.mock("@/api/generated/requests/sdk.gen", () => ({
  getApartmentsById: vi.fn(async ({ path }: { path: { id: string } }) => ({
    data: { id: path.id, name: "Test Apartment" },
  })),
}));

vi.mock("@/lib/api/api", () => ({
  withAuth: vi.fn(async (extra: Record<string, unknown>) => ({
    baseUrl: "http://localhost/api",
    ...extra,
  })),
}));

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("apartmentQueryKey", () => {
  it("is composed from the QUERY_ACTIONS registry entry, not a literal", () => {
    expect(apartmentQueryKey(VALID_UUID)).toEqual([
      ...QUERY_ACTIONS.APARTMENTS_GET_ID,
      VALID_UUID,
    ]);
  });

  it("differs per id, so two apartments are two cache entries", () => {
    expect(apartmentQueryKey("a")).not.toEqual(apartmentQueryKey("b"));
  });
});

describe("the prefetch and the page share one cache entry", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("a prefetch is reused by a read of the same query, with one request", async () => {
    await client.prefetchQuery({
      queryKey: apartmentQueryKey(VALID_UUID),
      queryFn: ({ signal }) => fetchApartment(VALID_UUID, signal),
      staleTime: 30_000,
    });

    const cached = client.getQueryData(apartmentQueryKey(VALID_UUID));

    expect(cached).toEqual({ id: VALID_UUID, name: "Test Apartment" });

    // A read of the same key within the freshness window uses the cache and
    // starts no second request. This is the assertion that protects §4's
    // "same key = same args" rule from drifting.
    const again = await client.fetchQuery({
      queryKey: apartmentQueryKey(VALID_UUID),
      queryFn: ({ signal }) => fetchApartment(VALID_UUID, signal),
      staleTime: 30_000,
    });

    expect(again).toEqual(cached);

    const { getApartmentsById } = await import(
      "@/api/generated/requests/sdk.gen"
    );
    expect(getApartmentsById).toHaveBeenCalledTimes(1);
  });
});

describe("the path definition matches the route", () => {
  it("declares the full inherited rule chain", () => {
    expect(appPaths.hostApartment.requires).toEqual(["canOpenHost"]);
  });

  it("types the id as a uuid", () => {
    expect(appPaths.hostApartment.params).toEqual({ id: "uuid" });
  });
});
