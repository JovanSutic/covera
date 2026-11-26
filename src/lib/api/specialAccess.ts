import {
  deleteSpecialAccessByAccessId,
  getApartmentShotsApartmentByApartmentId,
  getReservationsById,
  getReservationsByIdPhotos,
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
 * VERIFIED 2026-11-23 by probing the live API: `?accessId=x` is handled as an access attempt
 * (an unknown id answers 500) while `?foo=bar` is not (401 AUTH_TOKEN_MISSING). The
 * generated endpoint types pin `query?: never`, so passing it needs the `as never` cast
 * below — and the `url:` override does NOT compile (TS2353), which is why the cast is used
 * rather than a hand-built URL.
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
 * the backend reads (verified 2026-11-23).
 *
 * These use `publicApi()` and NEVER `withAuth()`. `withAuth()` reads the Supabase session and
 * sends `Authorization: Bearer undefined` for a caller with no account, which turns a working
 * anonymous read into a 401 — the exact failure `fieldIncident.ts` and `queries/inspection.ts`
 * document for the other anonymous surfaces (invariant 8).
 *
 * The generated endpoint types pin `query?: never`, so the accessId needs the `as never` cast.
 * A `url:` override does NOT compile (TS2353) — verified by trial-compiling both.
 */
const accessQuery = (accessId: string) => ({ accessId }) as never;

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