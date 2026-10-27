import { getApartmentsById } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";

/**
 * The apartment detail query, defined ONCE so the route's `prefetch` and the
 * page's `useQuery` cannot drift apart (§4: same key = same args, or the cache
 * sees two entries and fetches twice).
 */
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
    // Prefetched queries must be fresh for a while, or the page's hook refetches
    // on mount and the prefetch was for nothing (D37, §4).
    staleTime: 30_000,
  });
}
