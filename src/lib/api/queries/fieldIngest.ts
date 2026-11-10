import { getFieldIngestByToken } from "@/api/generated/requests/sdk.gen";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface FieldIngestParams {
  token: string;
}

export function fieldIngestQueryKey(token: string) {
  return [...QUERY_ACTIONS.FIELD_INGEST_GET_BY_TOKEN, token ?? ""] as const;
}

/**
 * D12: NO withAuth() here, deliberately — and this module's own reason for existing
 * is just that. This URL is the credential: it is pasted to a cleaner who has no
 * Covera account, so the request must be anonymous. `withAuth()` would attach
 * `Bearer undefined` and the request would fail for a reason nothing in the UI could
 * explain. `queries/inspection.ts` carries the same exception for the same reason.
 *
 * The backend answers `404 FIELD_TOKEN_INVALID` for an unknown token, an expired one
 * and an already-used one alike (D23). This function therefore does not classify the
 * failure — it lets the error through, and the page renders one unusable-link screen
 * for all three.
 */
export async function fetchFieldIngest(token: string, signal?: AbortSignal) {
  const response = await getFieldIngestByToken({
    path: { token },
    ...(signal ? { signal } : {}),
  });

  return response.data;
}

export function useFieldIngest(token: string | undefined) {
  return useQuery({
    queryKey: fieldIngestQueryKey(token ?? ""),
    queryFn: ({ signal }) => {
      if (!token) throw new Error("fieldTokenRequired");
      return fetchFieldIngest(token, signal);
    },
    enabled: Boolean(token),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const fieldIngestResource: ResourceDefinition = {
  action: QUERY_ACTIONS.FIELD_INGEST_GET_BY_TOKEN,
  key: ({ token }: FieldIngestParams) => fieldIngestQueryKey(token),
  fetch: ({ token }: FieldIngestParams, { signal }) => fetchFieldIngest(token, signal),
};
