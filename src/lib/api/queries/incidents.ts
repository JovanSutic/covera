import { getIncidents } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

/**
 * D14: one page, the maximum the API allows. Paging the claim list is out of scope,
 * and the sort is `createdAt desc` so the newest claims — the ones a host is acting
 * on — are on page 1. An apartment with more than 100 incidents could therefore hide
 * an older one from this surface; that is recorded as a deviation in the PR.
 */
export const INCIDENTS_DEFAULT_PAGE = 1;
export const INCIDENTS_DEFAULT_LIMIT = 100;

export interface IncidentsParams {
  apartmentId: string;
  page?: number;
  limit?: number;
}

/**
 * `apartmentId` is REQUIRED by the API (`GetIncidentsData.query.apartmentId`) and is
 * the only filter this feature uses. The composite key keeps page and limit in the
 * identity so a future caller with different paging cannot collide with this one.
 *
 * The `?? ""` fallback is not cosmetic: `registry.test.ts` calls every resource's
 * `key({})`, and a key builder that threw on missing params would fail that check. A
 * key is a cache address, not a validation — the fetch below is what refuses.
 */
export function incidentsQueryKey({
  apartmentId,
  page = INCIDENTS_DEFAULT_PAGE,
  limit = INCIDENTS_DEFAULT_LIMIT,
}: IncidentsParams) {
  return [...QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT, apartmentId ?? "", page, limit] as const;
}

export async function fetchIncidents(
  {
    apartmentId,
    page = INCIDENTS_DEFAULT_PAGE,
    limit = INCIDENTS_DEFAULT_LIMIT,
  }: IncidentsParams,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getIncidents({
    ...config,
    query: { apartmentId, page, limit, sortBy: "createdAt", order: "desc" },
  });

  return response.data;
}

export function useIncidents(params: IncidentsParams) {
  return useQuery({
    queryKey: incidentsQueryKey(params),
    queryFn: ({ signal }) => {
      if (!params.apartmentId) throw new Error("apartmentIdRequired");
      return fetchIncidents(params, signal);
    },
    enabled: Boolean(params.apartmentId),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const incidentsResource: ResourceDefinition = {
  action: QUERY_ACTIONS.INCIDENTS_GET_BY_APARTMENT,
  key: (params: IncidentsParams) => incidentsQueryKey(params),
  fetch: (params: IncidentsParams, { signal }) => fetchIncidents(params, signal),
};
