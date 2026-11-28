import {
  deleteSpecialAccessByAccessId,
  getApartmentShotsApartmentByApartmentId,
  getAssetsApartmentByApartmentId,
  getIncidentsById,
  getReservationsById,
  getReservationsByIdPhotos,
  getSpecialAccess,
  getSpecialAccessByAccessId,
  postSpecialAccess,
} from "@/api/generated/requests/sdk.gen";
import type {
  CreateSpecialAccess,
  SpecialAccess,
} from "@/api/generated/requests/types.gen";
import { publicApi, withAuth } from "@/lib/api/api";

/**
 * Access links (prep 5 / the Feature section).
 *
 * A host mints a short-lived `accessId` and sends the resulting URL to someone with no
 * account — a photographer collecting the pre-state proofs, or a cleaner collecting damage
 * evidence. The 32-hex id travels as a QUERY PARAMETER on the read it unlocks:
 *
 *     /inspection-guide/<apartmentId>/<reservationId>?accessId=<hex32>
 *
 * An unusable `accessId` answers `403 SPECIAL_ACCESS_INVALID` (fixed by feature/53, verified
 * 2026-11-26) — no longer the `500` this module used to work around.
 *
 * ONLY `inspection_proof` is offered by the UI. `damage_evidence` is in the `AccessScope`
 * enum but NO endpoint accepts it, so a link minted with it would open nothing.
 *
 * The write calls authenticate with `withAuth()` — only a signed-in host mints a link. The
 * anonymous side is the GUEST's read, which lives in the access-aware fetchers (p7).
 */

export interface CreateAccessLinkInput {
  /** Only `inspection_proof` is offered — see the module note. */
  scope: "inspection_proof";
  reservationId: string;
  /**
   * Omitted by default so the backend's own default (12, range 1–72) applies. Sending a
   * hardcoded 12 would duplicate the server's rule and drift from it silently.
   */
  expiresInHours?: number;
}

export async function createSpecialAccess(
  input: CreateAccessLinkInput,
  signal?: AbortSignal,
): Promise<SpecialAccess | undefined> {
  const config = await withAuth(signal ? { signal } : {});
  const body: CreateSpecialAccess = {
    scope: input.scope,
    reservationId: input.reservationId,
  };

  if (input.expiresInHours !== undefined) {
    body.expiresInHours = input.expiresInHours;
  }

  const response = await postSpecialAccess({ ...config, body });

  return response.data?.access;
}

/**
 * Revoke by the `accessId` the create call returned. There is no list endpoint, so a link
 * minted in a previous session cannot be found or revoked here — the same limit D50 records
 * for cleaner tokens (D23).
 */
export async function revokeSpecialAccess(
  accessId: string,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await deleteSpecialAccessByAccessId({
    ...config,
    path: { accessId },
  });

  return response.data;
}

/**
 * D36/D37: the guest's reads. Each takes the `accessId` and sends it as the query parameter
 * the backend reads.
 *
 * These use `publicApi()` and NEVER `withAuth()`. `withAuth()` reads the Supabase session and
 * sends `Authorization: Bearer undefined` for a caller with no account, which turns a working
 * anonymous read into a 401 — the exact failure `fieldIncident.ts` and `queries/inspection.ts`
 * document for the other anonymous surfaces (invariant 11).
 *
 * The `as never` cast that used to live here is GONE (2026-11-26): the regenerated client
 * declares `accessId` as an optional query parameter on all thirteen token-enabled routes, so
 * the parameter is typed for real and a backend rename is now a compile error rather than a
 * silent 401.
 */
const accessQuery = (accessId: string) => ({ accessId });

export async function fetchReservationWithAccess(
  reservationId: string,
  accessId: string,
  signal?: AbortSignal,
) {
  const response = await getReservationsById({
    ...publicApi(signal ? { signal } : {}),
    path: { id: reservationId },
    query: accessQuery(accessId),
  });

  return response.data;
}

export async function fetchShotsWithAccess(
  apartmentId: string,
  accessId: string,
  signal?: AbortSignal,
) {
  const response = await getApartmentShotsApartmentByApartmentId({
    ...publicApi(signal ? { signal } : {}),
    path: { apartmentId },
    query: accessQuery(accessId),
  });

  return response.data;
}

export async function fetchReservationPhotosWithAccess(
  reservationId: string,
  accessId: string,
  signal?: AbortSignal,
) {
  const response = await getReservationsByIdPhotos({
    ...publicApi(signal ? { signal } : {}),
    path: { id: reservationId },
    query: accessQuery(accessId),
  });

  return response.data;
}

/** The claim read, for a guest holding a link (D3). */
export async function fetchIncidentWithAccess(
  incidentId: string,
  accessId: string,
  signal?: AbortSignal,
) {
  const response = await getIncidentsById({
    ...publicApi(signal ? { signal } : {}),
    path: { id: incidentId },
    query: accessQuery(accessId),
  });

  return response.data;
}

/** The apartment's assets, for a guest holding a link (D3). */
export async function fetchAssetsWithAccess(
  apartmentId: string,
  accessId: string,
  signal?: AbortSignal,
) {
  const response = await getAssetsApartmentByApartmentId({
    ...publicApi(signal ? { signal } : {}),
    path: { apartmentId },
    query: accessQuery(accessId),
  });

  return response.data ?? [];
}

/**
 * D8: the introspection read. A host inspecting a link, or a guard validating one
 * before render. It is anonymous — the `accessId` IS the credential — so it uses
 * `publicApi()`, and it answers `403 SPECIAL_ACCESS_INVALID` for an unusable link.
 */
export async function introspectSpecialAccess(
  accessId: string,
  signal?: AbortSignal,
) {
  const response = await getSpecialAccessByAccessId({
    ...publicApi(signal ? { signal } : {}),
    path: { accessId },
  });

  return response.data;
}

/** D6: the host's list of grants for one reservation. Bearer-authorized. */
export async function listSpecialAccess(
  reservationId: string,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getSpecialAccess({
    ...config,
    query: { reservationId },
  });

  return response.data ?? [];
}