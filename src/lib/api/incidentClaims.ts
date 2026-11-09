import {
  deleteIncidentsByIdItemsByItemIdEvidenceByEvidenceId,
  postIncidents,
  postIncidentsByIdItems,
  postIncidentsByIdItemsByItemIdEvidence,
  postIncidentsByIdItemsByItemIdReissueToken,
  postIncidentsByIdItemsByItemIdUploadTokens,
} from "@/api/generated/requests/sdk.gen";
import type {
  AttachEvidenceItem,
  CreateIncidentItem,
} from "@/api/generated/requests/types.gen";
import { withAuth } from "@/lib/api/api";
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

export async function attachIncidentEvidence(
  incidentId: string,
  itemId: string,
  evidence: AttachEvidenceItem[],
  signal?: AbortSignal,
) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await postIncidentsByIdItemsByItemIdEvidence({
    ...config,
    path: { id: incidentId, itemId },
    body: { evidence },
  });

  return response.data;
}

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
 * third-party origin is both useless and a small leak of the session token.
 */
export async function uploadIncidentEvidence(
  incidentId: string,
  itemId: string,
  uploads: readonly { evidenceType: EvidenceType; file: File }[],
  signal?: AbortSignal,
) {
  if (uploads.length === 0) return null;

  const config = await withAuth(signal ? { signal } : {});

  const tokensResponse = await postIncidentsByIdItemsByItemIdUploadTokens({
    ...config,
    path: { id: incidentId, itemId },
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

  return attachIncidentEvidence(incidentId, itemId, evidence, signal);
}