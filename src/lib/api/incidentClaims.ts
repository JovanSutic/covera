import {
  deleteIncidentsByIdItemsByItemIdEvidenceByEvidenceId,
  patchIncidentsById,
  patchIncidentsByIdItemsByItemId,
  postIncidents,
  postIncidentsByIdConfirmAirbnbFiling,
  postIncidentsByIdItems,
  postIncidentsByIdItemsByItemIdEvidence,
  postIncidentsByIdItemsByItemIdReissueToken,
  postIncidentsByIdItemsByItemIdUploadTokens,
} from "@/api/generated/requests/sdk.gen";
import type {
  AttachEvidenceItem,
  CreateIncidentItem,
} from "@/api/generated/requests/types.gen";
import { publicApi, withAuth } from "@/lib/api/api";
import type { EvidenceType } from "@/lib/helpers/incidentEvidence";

/**
 * The claim write path (D13).
 *
 * These are plain async functions, NOT `ResourceDefinition`s and NOT registered in
 * `registry.ts`. A prefetch is speculative and there is nothing speculative about a
 * write; `ResourceDefinition` has no shape for one either. `submitPhotoProofs.ts`
 * is the existing precedent for a write module living flat in `src/lib/api/`, beside
 * `api.ts` and outside `queries/`.
 *
 * Every call here authenticates with `withAuth()` — the host is signed in — EXCEPT the evidence
 * upload chain, whose optional `accessId` switches it to `publicApi()` for a guest holding a
 * link (D3/D11). That is `attachIncidentEvidence` and `uploadIncidentEvidence`, which drives it.
 * The evidence DELETE is NOT in that set: the backend does not token-enable it, so
 * `removeIncidentEvidence` stays session-only and its control is not offered to a guest. The
 * field portal's three calls are the other anonymous exception and they live in
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

/**
 * D11: the guest's evidence write. `accessId` is optional and, when present, it is the ONLY
 * credential — the token path and the session path are mutually exclusive, so the session is
 * never read for a caller who arrived through a link (invariant 11).
 */
export async function attachIncidentEvidence(
  incidentId: string,
  itemId: string,
  evidence: AttachEvidenceItem[],
  accessId?: string,
  signal?: AbortSignal,
) {
  const config = accessId
    ? publicApi(signal ? { signal } : {})
    : await withAuth(signal ? { signal } : {});
  const response = await postIncidentsByIdItemsByItemIdEvidence({
    ...config,
    path: { id: incidentId, itemId },
    query: accessId ? { accessId } : undefined,
    body: { evidence },
  });

  return response.data;
}

/**
 * NOT access-aware, deliberately: `DELETE /incidents/{id}/items/{itemId}/evidence/{evidenceId}`
 * is the one evidence route the backend does NOT token-enable (verified against the deployed
 * `openapi.json` on 2026-11-28 — it is the only one of the three that carries no `accessId`
 * query parameter, and the generated type says so: `query?: never`). A guest's credential
 * therefore cannot authorize it, and `IncidentItemEvidence` does not offer the control to a
 * guest. Sending the parameter anyway would compile only behind a cast and 401 at runtime.
 */
export async function removeIncidentEvidence(
  incidentId: string,
  itemId: string,
  evidenceId: string,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await deleteIncidentsByIdItemsByItemIdEvidenceByEvidenceId({
    ...config,
    path: { id: incidentId, itemId, evidenceId },
  });

  return response.data;
}

/**
 * D50: the ONLY two responses that carry a `cleanerToken` are this one and the item
 * create. `GET /incidents/{id}` answers with `IncidentItem`, which has no token field,
 * so a reissued token has to be handed up to the page the moment it arrives — there is
 * no way to read it back later.
 */
export async function reissueItemToken(
  incidentId: string,
  itemId: string,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await postIncidentsByIdItemsByItemIdReissueToken({
    ...config,
    path: { id: incidentId, itemId },
  });

  return response.data;
}

/**
 * Mint presigned URLs, PUT the bytes, attach the keys. The three steps are
 * `submitPhotoProofs.ts`'s, in the same order and for the same reason.
 *
 * The `PUT` deliberately does NOT carry `withAuth()`'s header: the URL is presigned, so
 * its query string is the credential, and adding an Authorization header to a
 * third-party origin is both useless and a small leak of the session token. The same is
 * true of the guest's `PUT`, so the `accessId` never reaches it either.
 *
 * D3/D11: `accessId` is optional and decides the credential for the two API calls below. A
 * guest holding a link captures evidence exactly as a host does; the third-party `PUT` is
 * unchanged either way.
 */
export async function uploadIncidentEvidence(
  incidentId: string,
  itemId: string,
  uploads: readonly { evidenceType: EvidenceType; file: File }[],
  accessId?: string,
  signal?: AbortSignal,
) {
  if (uploads.length === 0) return null;

  // D11: the token path and the session path are mutually exclusive.
  const config = accessId
    ? publicApi(signal ? { signal } : {})
    : await withAuth(signal ? { signal } : {});

  const tokensResponse = await postIncidentsByIdItemsByItemIdUploadTokens({
    ...config,
    path: { id: incidentId, itemId },
    query: accessId ? { accessId } : undefined,
    body: {
      files: uploads.map((upload) => ({
        fileType: upload.file.type || "image/jpeg",
      })),
    },
  });

  const targets = tokensResponse.data?.tokens ?? [];

  const evidence = await Promise.all(
    uploads.map(async (upload, index): Promise<AttachEvidenceItem> => {
      const target = targets[index];

      if (!target?.uploadUrl) {
        throw new Error("Missing presigned URL for evidence upload.");
      }

      const putResponse = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": upload.file.type || "image/jpeg" },
        body: upload.file,
      });

      if (!putResponse.ok) {
        throw new Error("Failed to upload the evidence photo.");
      }

      return {
        evidenceType: upload.evidenceType,
        storageKey: target.key,
      };
    }),
  );

  return attachIncidentEvidence(incidentId, itemId, evidence, accessId, signal);
}

/**
 * The figure the host is asking the resolution centre for. `finalPayoutRequestedCents`
 * is the only field `UpdateIncident` carries, so a patch here cannot disturb the items
 * or the status — the backend's own `recomputeIncidentReadiness` owns those.
 */
export async function setIncidentPayout(
  incidentId: string,
  finalPayoutRequestedCents: number,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await patchIncidentsById({
    ...config,
    path: { id: incidentId },
    body: { finalPayoutRequestedCents },
  });

  return response.data;
}

/**
 * D9: the per-asset figure. `PATCH /incidents/{id}/items/{itemId}` carries
 * `estimatedPlaceholderValueCents`, and the route is gated by `isClaimEditable` on the
 * server — which is the "until the claim was sent" rule issue 4 asks for, enforced where
 * it cannot be bypassed. `UpdateIncidentItem` carries `type` too; it is omitted so a
 * write cannot silently change what happened to the asset.
 */
export async function setIncidentItemValue(
  incidentId: string,
  itemId: string,
  estimatedPlaceholderValueCents: number,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await patchIncidentsByIdItemsByItemId({
    ...config,
    path: { id: incidentId, itemId },
    body: { estimatedPlaceholderValueCents },
  });

  return response.data;
}

/**
 * The filing confirmation. It takes no body, and it is the write that sets
 * `guestResponseDeadlineAt = NOW() + 24h` — the clock the panel then counts down.
 *
 * It answers with `Incident`, NOT `IncidentWithItems` (verified in `types.gen.ts`).
 * The caller in step 8.3 merges rather than replaces for exactly that reason (D52).
 */
export async function confirmAirbnbFiling(
  incidentId: string,
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await postIncidentsByIdConfirmAirbnbFiling({
    ...config,
    path: { id: incidentId },
  });

  return response.data;
}