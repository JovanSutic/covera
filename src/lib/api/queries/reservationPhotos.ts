import { getReservationsByIdPhotos } from "@/api/generated/requests/sdk.gen";
import type { ReservationPhotos } from "@/api/generated/requests/types.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface ReservationPhotosParams {
  id: string;
}

export function reservationPhotosQueryKey(id: string) {
  return [...QUERY_ACTIONS.RESERVATIONS_GET_PHOTOS, id] as const;
}

/**
 * The reservation's own photo proofs, in the same shape `DetailedInspection.shots`
 * uses — so `ReservationPhotoGallery` renders either source with no branching.
 *
 * Reservation-scoped rather than inspection-scoped on purpose: `apartment_images` is
 * keyed by `reservationId`, and an inspection row only exists once a host has run a
 * separate action the backend refuses before the reservation is COVERED. Reading
 * through the inspection is what left a covered reservation's photos unreachable.
 */
export async function fetchReservationPhotos(id: string, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getReservationsByIdPhotos({ ...config, path: { id } });

  if (!response.data) {
    throw new Error("Reservation photos not found");
  }

  return response.data;
}

export function useReservationPhotos(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: reservationPhotosQueryKey(id ?? ""),
    queryFn: ({ signal }) => {
      if (!id) throw new Error("reservationIdRequired");
      return fetchReservationPhotos(id, signal);
    },
    enabled: Boolean(id) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const reservationPhotosResource: ResourceDefinition = {
  action: QUERY_ACTIONS.RESERVATIONS_GET_PHOTOS,
  key: ({ id }: ReservationPhotosParams) => reservationPhotosQueryKey(id),
  fetch: ({ id }: ReservationPhotosParams, { signal }) =>
    fetchReservationPhotos(id, signal),
};

export type { ReservationPhotos };
