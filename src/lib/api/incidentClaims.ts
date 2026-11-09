import {
  postIncidents,
  postIncidentsByIdItems,
} from "@/api/generated/requests/sdk.gen";
import type { CreateIncidentItem } from "@/api/generated/requests/types.gen";
import { withAuth } from "@/lib/api/api";

/**
 * The claim write path (D13).
 *
 * These are plain async functions, NOT `ResourceDefinition`s and NOT registered in
 * `registry.ts`. A prefetch is speculative and there is nothing speculative about a
 * write; `ResourceDefinition` has no shape for one either. `submitPhotoProofs.ts`
 * is the existing precedent for a write module living flat in `src/lib/api/`, beside
 * `api.ts` and outside `queries/`.
 *
 * Every call here authenticates with `withAuth()` — the host is signed in. The field
 * portal's three calls are the anonymous exception and they live in
 * `src/lib/api/fieldIncident.ts` (phase 9), not here (D12).
 *
 * Errors are NOT caught and re-worded here. The generated client is configured with
 * `throwOnError: true` (see `withAuth`), so a failure rejects with the backend's own
 * payload and the caller's `onError` reads `error?.error?.message` — the backend's
 * own sentence (D33). There is no `error.code` switch anywhere in this feature.
 */

export async function createIncident(
  reservationId: string,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await postIncidents({
    ...config,
    body: { reservationId },
  });

  return response.data;
}

/**
 * D48: the form adds exactly ONE item per submission, so there is no loop here and
 * none at the call site. Adding three assets is three calls, each with its own
 * pending state.
 *
 * It takes the already-shaped `CreateIncidentItem` rather than an asset id, because
 * the item's `type` is the caller's decision and `estimatedPlaceholderValueCents` is
 * optional — `AddIncidentItemForm` decides both, and omits the value entirely when
 * the host has not priced the item (phase 2's `parseCentsFromInput` returns `null`
 * for "not said yet", which is not the same answer as zero).
 */
export async function addIncidentItem(
  incidentId: string,
  item: CreateIncidentItem,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await postIncidentsByIdItems({
    ...config,
    path: { id: incidentId },
    body: item,
  });

  return response.data;
}