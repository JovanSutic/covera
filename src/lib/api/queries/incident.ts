import { getIncidentsById } from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface IncidentParams {
  id: string;
}

export function incidentQueryKey(id: string) {
  return [...QUERY_ACTIONS.INCIDENTS_GET_ID, id ?? ""] as const;
}

/**
 * The detail read, and the one that carries the items: `IncidentWithItems`. Every
 * host surface that renders an item reads it from here rather than from the list,
 * because the two are the same shape but only this key is invalidated by an item
 * write — and after phase 7 the field portal writes items from another surface
 * entirely.
 */
export async function fetchIncident(id: string, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getIncidentsById({ ...config, path: { id } });

  return response.data;
}

/**
 * `enabled` mirrors `useInspection`'s signature: without it a caller passing
 * `undefined` gets `isLoading: true` forever, because `enabled: Boolean(undefined)`
 * is false and the query never runs and never resolves.
 */
export function useIncident(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: incidentQueryKey(id ?? ""),
    queryFn: ({ signal }) => {
      if (!id) throw new Error("incidentIdRequired");
      return fetchIncident(id, signal);
    },
    enabled: Boolean(id) && enabled,
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const incidentResource: ResourceDefinition = {
  action: QUERY_ACTIONS.INCIDENTS_GET_ID,
  key: ({ id }: IncidentParams) => incidentQueryKey(id),
  fetch: ({ id }: IncidentParams, { signal }) => fetchIncident(id, signal),
};
