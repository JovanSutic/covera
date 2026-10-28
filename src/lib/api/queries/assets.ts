import { getAssetsApartmentByApartmentId } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface AssetsParams {
  apartmentId: string;
}

export function assetsQueryKey(apartmentId: string) {
  return [...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, apartmentId] as const;
}

export async function fetchAssets(apartmentId: string, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getAssetsApartmentByApartmentId({
    ...config,
    path: { apartmentId },
  });
  return response.data || [];
}

export function useAssets(apartmentId: string | undefined) {
  return useQuery({
    queryKey: assetsQueryKey(apartmentId ?? ""),
    queryFn: ({ signal }) => {
      if (!apartmentId) throw new Error("apartmentIdRequired");
      return fetchAssets(apartmentId, signal);
    },
    enabled: !!apartmentId,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const assetsResource: ResourceDefinition = {
  action: QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT,
  key: ({ apartmentId }: AssetsParams) => assetsQueryKey(apartmentId),
  fetch: ({ apartmentId }: AssetsParams, { signal }) => fetchAssets(apartmentId, signal),
};
