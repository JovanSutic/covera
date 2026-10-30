import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { reservationQueryKey, fetchReservation } from "./reservation";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { appPaths } from "@/lib/router/paths";

vi.mock("@/api/generated/requests/sdk.gen", () => ({
  getReservationsById: vi.fn(async ({ path }: { path: { id: string } }) => ({
    data: { id: path.id, guestName: "Test Guest", inspection: null },
  })),
}));

vi.mock("@/lib/api/api", () => ({
  withAuth: vi.fn(async (extra: Record<string, unknown>) => ({
    baseUrl: "http://localhost/api",
    ...extra,
  })),
}));

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("reservationQueryKey", () => {
  it("is composed from the QUERY_ACTIONS registry entry, not a literal", () => {
    expect(reservationQueryKey(VALID_UUID)).toEqual([
      ...QUERY_ACTIONS.RESERVATIONS_GET_ID,
      VALID_UUID,
    ]);
  });

  it("differs per id, so two reservations are two cache entries", () => {
    expect(reservationQueryKey("a")).not.toEqual(reservationQueryKey("b"));
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
      queryKey: reservationQueryKey(VALID_UUID),
      queryFn: ({ signal }) => fetchReservation(VALID_UUID, signal),
      staleTime: 30_000,
    });

    const cached = client.getQueryData(reservationQueryKey(VALID_UUID));

    expect(cached).toEqual({
      id: VALID_UUID,
      guestName: "Test Guest",
      inspection: null,
    });

    const again = await client.fetchQuery({
      queryKey: reservationQueryKey(VALID_UUID),
      queryFn: ({ signal }) => fetchReservation(VALID_UUID, signal),
      staleTime: 30_000,
    });

    expect(again).toEqual(cached);

    const { getReservationsById } = await import(
      "@/api/generated/requests/sdk.gen"
    );
    expect(getReservationsById).toHaveBeenCalledTimes(1);
  });
});

describe("the path definition matches the route", () => {
  it("declares the full inherited rule chain", () => {
    expect(appPaths.hostReservation.requires).toEqual(["canOpenHost"]);
  });

  it("types both ids as uuids", () => {
    expect(appPaths.hostReservation.params).toEqual({
      id: "uuid",
      reservationId: "uuid",
    });
  });
});
