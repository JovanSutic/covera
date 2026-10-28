import { getApartmentShotsApartmentByApartmentId } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface ShotsParams {
  apartmentId: string;
}

/** D6: replaces the string literal that used to live in IndividualApartment.tsx. */
export function shotsQueryKey(apartmentId: string) {
  return [...QUERY_ACTIONS.APARTMENT_SHOTS_GET_BY_APARTMENT, apartmentId] as const;
}

export async function fetchShots(apartmentId: string, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getApartmentShotsApartmentByApartmentId({
    ...config,
    path: { apartmentId },
  });
  return response.data || [];
}

export function useShots(apartmentId: string | undefined) {
  return useQuery({
    queryKey: shotsQueryKey(apartmentId ?? ""),
    queryFn: ({ signal }) => {
      if (!apartmentId) throw new Error("apartmentIdRequired");
      return fetchShots(apartmentId, signal);
    },
    enabled: !!apartmentId,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const shotsResource: ResourceDefinition = {
  action: QUERY_ACTIONS.APARTMENT_SHOTS_GET_BY_APARTMENT,
  key: ({ apartmentId }: ShotsParams) => shotsQueryKey(apartmentId),
  fetch: ({ apartmentId }: ShotsParams, { signal }) => fetchShots(apartmentId, signal),
};
