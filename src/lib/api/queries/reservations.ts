import { getReservationsApartmentByApartmentId } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export const RESERVATIONS_DEFAULT_PAGE = 1;
export const RESERVATIONS_DEFAULT_LIMIT = 10;

export interface ReservationsParams {
  apartmentId: string;
  page?: number;
  limit?: number;
}

/**
 * §4: this key reproduces `ReservationsSection`'s literal EXACTLY — same element
 * count and order, including the trailing "asc". The request below sends
 * `order: "desc"`; the key's "asc" is pre-existing (see Noticed) and is preserved
 * because changing it would change cache identity and invalidate nothing.
 */
export function reservationsQueryKey({
  apartmentId,
  page = RESERVATIONS_DEFAULT_PAGE,
  limit = RESERVATIONS_DEFAULT_LIMIT,
}: ReservationsParams) {
  return [
    ...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT,
    apartmentId,
    page,
    limit,
    "checkInDatetime",
    "asc",
  ] as const;
}

export async function fetchReservations(
  { apartmentId, page = RESERVATIONS_DEFAULT_PAGE, limit = RESERVATIONS_DEFAULT_LIMIT }: ReservationsParams,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getReservationsApartmentByApartmentId({
    ...config,
    path: { apartmentId },
    query: {
      page,
      limit,
      sortBy: "checkInDatetime",
      history: true,
      order: "desc",
    },
  });
  return response.data;
}

export function useReservations(params: ReservationsParams) {
  return useQuery({
    queryKey: reservationsQueryKey(params),
    queryFn: ({ signal }) => fetchReservations(params, signal),
    enabled: !!params.apartmentId,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const reservationsResource: ResourceDefinition = {
  action: QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT,
  key: (params: ReservationsParams) => reservationsQueryKey(params),
  fetch: (params: ReservationsParams, { signal }) => fetchReservations(params, signal),
};
