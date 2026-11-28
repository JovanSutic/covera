import { useQuery } from "@tanstack/react-query";

import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import {
  fetchAssetsWithAccess,
  fetchIncidentWithAccess,
  fetchReservationPhotosWithAccess,
  fetchReservationWithAccess,
} from "@/lib/api/specialAccess";
import { PREFETCH_STALE_TIME_MS } from "./shared";

/**
 * D3: the guest's four reads, through an access link. `InspectionGuidePage` keeps its own
 * page-local copies of three of them; this module is for the claim-proofs page, which reads a
 * different four.
 *
 * WHY THIS IS ITS OWN MODULE, rather than four additions beside the host hooks in
 * `queries/{incident,reservation,assets,reservationPhotos}.ts` (where step 6.1 of
 * `docs/actions-access/p6.md` first put them): `queries/manifest.ts` walks EVERY export of every
 * module in its `MODULES` map and throws at load for a `use…` export whose name does not resolve
 * to a resource registered in `QUERY_RESOURCES` and exported by that same module.
 * `useIncidentWithAccess` resolves to `incidentWithAccess`, which is not registered, so the
 * manifest — and everything importing it, `coverage.ts` included — fails at import. A module
 * `MODULES` does not list is invisible to both, exactly as `InspectionGuidePage`'s local hooks
 * are (see that file's D36/D37 comment). Registering four access-aware resources instead would
 * pull `prefetchCoverage.test.ts` in too, because `coverage.ts` maps a hook to its owning
 * resource and would then require every route rendering this page to declare them.
 *
 * Invariant 11: every hook here reads through `publicApi()` (inside `specialAccess.ts`) and
 * NEVER `withAuth()`, which would send `Bearer undefined` for a caller with no account and turn
 * a working anonymous read into a 401.
 */

/**
 * D3: the guest's read of the same resource, through an access link. It uses `publicApi()`
 * and NEVER `withAuth()` (invariant 11), and the `accessId` is IN the key so two links cannot
 * read each other's cache.
 *
 * `enabled` requires BOTH ids: without an accessId there is nothing to authenticate with, and
 * without the resource id there is nothing to read.
 */
export function useIncidentWithAccess(
  id: string | undefined,
  accessId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [...QUERY_ACTIONS.INCIDENTS_GET_ID, id ?? "", accessId ?? ""] as const,
    queryFn: ({ signal }) => {
      if (!id || !accessId) throw new Error("incidentIdRequired");
      return fetchIncidentWithAccess(id, accessId, signal);
    },
    enabled: Boolean(id) && Boolean(accessId) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

/** The stay step of the chain: where `apartmentId` comes from (the claim does not carry it). */
export function useReservationWithAccess(
  id: string | undefined,
  accessId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_ID, id ?? "", accessId ?? ""] as const,
    queryFn: ({ signal }) => {
      if (!id || !accessId) throw new Error("reservationIdRequired");
      return fetchReservationWithAccess(id, accessId, signal);
    },
    enabled: Boolean(id) && Boolean(accessId) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

/** The apartment's assets, for the item names and types the claim list renders. */
export function useAssetsWithAccess(
  apartmentId: string | undefined,
  accessId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT,
      apartmentId ?? "",
      accessId ?? "",
    ] as const,
    queryFn: ({ signal }) => {
      if (!apartmentId || !accessId) throw new Error("apartmentIdRequired");
      return fetchAssetsWithAccess(apartmentId, accessId, signal);
    },
    enabled: Boolean(apartmentId) && Boolean(accessId) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

/** The stay's own before photos — the "before" strip above each item's evidence. */
export function useReservationPhotosWithAccess(
  id: string | undefined,
  accessId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...QUERY_ACTIONS.RESERVATIONS_GET_PHOTOS,
      id ?? "",
      accessId ?? "",
    ] as const,
    queryFn: ({ signal }) => {
      if (!id || !accessId) throw new Error("reservationIdRequired");
      return fetchReservationPhotosWithAccess(id, accessId, signal);
    },
    enabled: Boolean(id) && Boolean(accessId) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}
