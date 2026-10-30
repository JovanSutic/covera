import { getReservationsById } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface ReservationParams {
  id: string;
}

export function reservationQueryKey(id: string) {
  return [...QUERY_ACTIONS.RESERVATIONS_GET_ID, id] as const;
}

export async function fetchReservation(id: string, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getReservationsById({ ...config, path: { id } });
  return response.data;
}

/**
 * `enabled` lets the caller hold the request. The reservation page does not need it,
 * but keeping the parameter here means a future surface can gate the read without a
 * second hook.
 */
export function useReservation(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: reservationQueryKey(id ?? ""),
    queryFn: ({ signal }) => {
      if (!id) throw new Error("reservationIdRequired");
      return fetchReservation(id, signal);
    },
    enabled: Boolean(id) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const reservationResource: ResourceDefinition = {
  action: QUERY_ACTIONS.RESERVATIONS_GET_ID,
  key: ({ id }: ReservationParams) => reservationQueryKey(id),
  fetch: ({ id }: ReservationParams, { signal }) => fetchReservation(id, signal),
};
