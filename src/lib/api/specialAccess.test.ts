import { describe, expect, it, vi, beforeEach } from "vitest";

const getReservationsById = vi.fn();
const getIncidentsById = vi.fn();
const getSpecialAccess = vi.fn();
const getSpecialAccessByAccessId = vi.fn();
const getAssetsApartmentByApartmentId = vi.fn();

vi.mock("@/api/generated/requests/sdk.gen", () => ({
  getReservationsById: (...args: unknown[]) => getReservationsById(...args),
  getIncidentsById: (...args: unknown[]) => getIncidentsById(...args),
  getSpecialAccess: (...args: unknown[]) => getSpecialAccess(...args),
  getSpecialAccessByAccessId: (...args: unknown[]) =>
    getSpecialAccessByAccessId(...args),
  getAssetsApartmentByApartmentId: (...args: unknown[]) =>
    getAssetsApartmentByApartmentId(...args),
}));

vi.mock("@/lib/api/api", () => ({
  publicApi: (extra: Record<string, unknown> = {}) => ({ baseUrl: "test", ...extra }),
  withAuth: async (extra: Record<string, unknown> = {}) => ({
    baseUrl: "test",
    headers: { Authorization: "Bearer token" },
    ...extra,
  }),
}));

import {
  fetchIncidentWithAccess,
  fetchReservationWithAccess,
  introspectSpecialAccess,
  listSpecialAccess,
} from "./specialAccess";

describe("the access-aware fetchers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the accessId as a query parameter, not a header", async () => {
    getReservationsById.mockResolvedValue({ data: { id: "r1" } });

    await fetchReservationWithAccess("r1", "abc123");

    const [options] = getReservationsById.mock.calls[0];
    expect(options.query).toEqual({ accessId: "abc123" });
    expect(options.path).toEqual({ id: "r1" });
  });

  it("never attaches an Authorization header on a guest read", async () => {
    getIncidentsById.mockResolvedValue({ data: { id: "i1" } });

    await fetchIncidentWithAccess("i1", "abc123");

    const [options] = getIncidentsById.mock.calls[0];
    expect(options.headers?.Authorization).toBeUndefined();
  });

  it("introspects anonymously — the accessId is the credential", async () => {
    getSpecialAccessByAccessId.mockResolvedValue({ data: { scope: "inspection_proof" } });

    await introspectSpecialAccess("abc123");

    const [options] = getSpecialAccessByAccessId.mock.calls[0];
    expect(options.path).toEqual({ accessId: "abc123" });
    expect(options.headers?.Authorization).toBeUndefined();
  });

  it("lists grants with the bearer session, keyed by reservation", async () => {
    getSpecialAccess.mockResolvedValue({ data: [] });

    await listSpecialAccess("r1");

    const [options] = getSpecialAccess.mock.calls[0];
    expect(options.query).toEqual({ reservationId: "r1" });
    expect(options.headers?.Authorization).toBe("Bearer token");
  });

  it("returns an empty array, not undefined, when a list read has no body", async () => {
    getSpecialAccess.mockResolvedValue({ data: undefined });

    await expect(listSpecialAccess("r1")).resolves.toEqual([]);
  });
});
