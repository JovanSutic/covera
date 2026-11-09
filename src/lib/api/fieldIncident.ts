import {
  postFieldIngestByTokenSubmit,
  postFieldIngestByTokenUploadTokens,
} from "@/api/generated/requests/sdk.gen";
import type {
  FieldSubmitPhoto,
  FieldSubmitResponse,
} from "@/api/generated/requests/types.gen";

/**
 * Invariant 10 / D12: this module NEVER imports `withAuth` or `publicApi`. The 32-hex
 * token in the path is the credential, and the caller it serves has no session at all —
 * `withAuth()` would read `undefined` from Supabase and send
 * `Authorization: Bearer undefined`, turning a working request into a 401 that nothing
 * on the field screen could explain. `queries/fieldIngest.ts` carries the same exception
 * for the read, and `queries/inspection.ts` set the precedent.
 *
 * `throwOnError: true` IS passed, and it is a deliberate difference from the read. The
 * read's failure is an expected answer — a rejected token is one of the three cases the
 * "link unusable" screen exists for (D23), so it must not throw. A WRITE's failure is
 * never expected, and `throwOnError` is what puts the backend's own sentence into
 * `error.error.message` where the page's toast reads it (D33), instead of leaving the
 * caller to unpack a `{ data, error }` union it would then have to guess about.
 */
export type FieldPhotoType = FieldSubmitPhoto["evidenceType"];

/**
 * Every evidence type this portal can produce — which is to say, every evidence type
 * there is, as far as a photo upload is concerned: the three photo views, because a
 * cleaner on a phone is not sending a police report or a retail quote.
 *
 * It is spelled out rather than derived from `isPhotoEvidence` (phase 1) for a reason that
 * costs a compile error to ignore: `FieldIngest.requiredEvidenceTypes` is `Array<string>`,
 * an ordinary runtime array with no union to narrow, so a list is needed somewhere. This is
 * the smallest place to put it, and it is the generated union — a backend type added to
 * `FieldSubmitPhoto` breaks the compile right here instead of going uncapturable.
 */
const SUBMITTABLE_PHOTO_TYPES: readonly FieldPhotoType[] = [
  "damage_photo_wide",
  "damage_photo_closeup",
  "theft_empty_space_photo",
];

/**
 * `FieldIngest.requiredEvidenceTypes` is `Array<string>` — the backend's own list, which
 * it validates submissions against. This narrows it to the three this portal can
 * actually produce.
 *
 * It is a predicate rather than a cast (D54): a cast would assert the shape and skip the
 * filtering entirely. The server's array may hold a document type, and an unrecognised
 * value must never be treated as REQUIRED. The submit gate below requires a capture for
 * every required type, so a type that can never be captured would disable the button for
 * good — a soft-lock the gate cannot see, which is exactly the failure D49 records for
 * the add-item form.
 */
export function isFieldPhotoType(type: string): type is FieldPhotoType {
  return (SUBMITTABLE_PHOTO_TYPES as readonly string[]).includes(type);
}

/** The server's list, filtered to what this portal can shoot, in the order it sent them. */
export function requiredFieldViews(
  requiredEvidenceTypes: readonly string[],
): FieldPhotoType[] {
  return requiredEvidenceTypes.filter(isFieldPhotoType);
}

export interface FieldUpload {
  evidenceType: FieldPhotoType;
  file: File;
}
/**
 * The device's own timestamp for the file, not `Date.now()` at upload time: the phone
 * knows when the photo was taken, and an upload-time stamp would silently claim a photo
 * shot yesterday was shot now. `0` means the platform did not supply one, and the field
 * is then omitted rather than sent as the epoch.
 *
 * Latitude and longitude are deliberately NOT sent (D56). The body accepts them, but
 * reading them needs a `navigator.geolocation` permission prompt on a page a cleaner
 * opens from a link — and a denied prompt is a dead end they cannot recover from, on a
 * page with no settings, no account and nobody to ask. The backend reads EXIF from the
 * uploaded bytes itself, which is where the host panel's `exifLatitude`/`exifLongitude`
 * come from, so the coordinates are not lost by omitting them.
 */
function capturedAtOf(file: File): string | undefined {
  return file.lastModified > 0 ? new Date(file.lastModified).toISOString() : undefined;
}

/**
 * Mint presigned URLs, `PUT` the bytes, submit the keys.
 *
 * The `PUT` carries no headers beyond the content type: the URL is presigned, so its
 * query string is the credential. Adding an `Authorization` header to a third-party
 * origin would be both useless and a leak of a session token this caller does not have.
 */
export async function submitFieldPhotos(
  token: string,
  uploads: readonly FieldUpload[],
): Promise<FieldSubmitResponse> {
  if (uploads.length === 0) throw new Error("No photos to submit.");

  const tokensResponse = await postFieldIngestByTokenUploadTokens({
    path: { token },
    // `photos`, NOT `files` — the host's `EvidenceUploadTokensBody` uses the other
    // word, and this body is verified in `types.gen.ts`.
    body: {
      photos: uploads.map((upload) => ({
        fileType: upload.file.type || "image/jpeg",
      })),
    },
    throwOnError: true,
  });

  const targets = tokensResponse.data?.tokens ?? [];

  const photos: FieldSubmitPhoto[] = await Promise.all(
    uploads.map(async (upload, index): Promise<FieldSubmitPhoto> => {
      const target = targets[index];

      if (!target?.uploadUrl) {
        throw new Error("Missing presigned URL for the photo upload.");
      }

      const putResponse = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": upload.file.type || "image/jpeg" },
        body: upload.file,
      });

      if (!putResponse.ok) {
        throw new Error("Failed to upload the photo.");
      }

      return {
        evidenceType: upload.evidenceType,
        storageKey: target.key,
        capturedAt: capturedAtOf(upload.file),
      };
    }),
  );

  const submitResponse = await postFieldIngestByTokenSubmit({
    path: { token },
    body: { photos },
    throwOnError: true,
  });

  if (!submitResponse.data) {
    throw new Error("The photos were uploaded but the report was not recorded.");
  }

  return submitResponse.data;
}
