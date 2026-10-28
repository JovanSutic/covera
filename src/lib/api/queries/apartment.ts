import { getApartmentsById, getApartmentsHostMe } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface ApartmentParams {
  id: string;
}

export function apartmentQueryKey(id: string) {
  return [...QUERY_ACTIONS.APARTMENTS_GET_ID, id] as const;
}

export async function fetchApartment(id: string, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getApartmentsById({ ...config, path: { id } });
  return response.data;
}

export function useApartment(id: string | undefined) {
  return useQuery({
    queryKey: apartmentQueryKey(id ?? ""),
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("apartmentIdRequired");
      return fetchApartment(id, signal);
    },
    enabled: Boolean(id),
    // D5: the same window the route's prefetch uses, from the one constant.
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

/** R15: the host's own apartment list — the `host` section prefetches this once. */
export function apartmentsHostQueryKey() {
  return [...QUERY_ACTIONS.APARTMENTS_GET_HOST] as const;
}

export async function fetchApartmentsHost(signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getApartmentsHostMe(config);
  return response.data;
}

export function useApartmentsHost() {
  return useQuery({
    queryKey: apartmentsHostQueryKey(),
    queryFn: ({ signal }) => fetchApartmentsHost(signal),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const apartmentResource: ResourceDefinition = {
  action: QUERY_ACTIONS.APARTMENTS_GET_ID,
  key: ({ id }: ApartmentParams) => apartmentQueryKey(id),
  fetch: ({ id }: ApartmentParams, { signal }) => fetchApartment(id, signal),
};

export const apartmentsHostResource: ResourceDefinition = {
  action: QUERY_ACTIONS.APARTMENTS_GET_HOST,
  key: () => apartmentsHostQueryKey(),
  fetch: (_params: unknown, { signal }) => fetchApartmentsHost(signal),
};
