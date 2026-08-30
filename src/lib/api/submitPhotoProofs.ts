/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  postApartmentsByIdPhotosUploadTokens,
  postApartmentsByIdPhotosConfirm,
  patchReservationsById,
} from "@/api/generated/requests/services.gen";
import type { ApartmentShot } from "@/api/generated/requests/types.gen";
import { withAuth } from "./api";

export type CapturedApartmentShot = ApartmentShot & {
  capturedImageUrl?: string;
  rawFile?: File;
};

interface UploadParams {
  apartmentId: string;
  reservationId: string;
  shots: CapturedApartmentShot[];
  type?: "checkin_state" | "damage";
}

export async function submitInspectionPhotos({
  apartmentId,
  reservationId,
  shots,
  type = "checkin_state",
}: UploadParams) {
  const completedShots = shots.filter(
    (shot): shot is CapturedApartmentShot & { rawFile: File } =>
      Boolean(shot.rawFile && shot.capturedImageUrl),
  );

  if (completedShots.length === 0) {
    throw new Error("No photos to upload.");
  }

  // Get auth headers/config for OpenAPI fetchers
  const config = await withAuth();

  // 1. Get presigned upload tokens
  const tokensRes = await postApartmentsByIdPhotosUploadTokens({
    ...config,
    path: { id: apartmentId },
    body: {
      fileTypes: completedShots.map(
        (shot) => shot.rawFile.type || "image/jpeg",
      ),
    },
  });

  if ("error" in tokensRes && tokensRes.error) {
    throw new Error(
      (tokensRes.error as any)?.message || "Failed to fetch upload tokens.",
    );
  }

  const uploadTargets = tokensRes.data?.tokens ?? [];

  // 2. Upload binaries to S3/R2 (Presigned PUT URLs handle their own signature, no auth header needed here)
  const uploadPromises = completedShots.map(async (shot, index) => {
    const target = uploadTargets[index];
    if (!target?.uploadUrl) {
      throw new Error(`Missing presigned URL for shot: ${shot.title}`);
    }

    const s3Res = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": shot.rawFile.type || "image/jpeg",
      },
      body: shot.rawFile, // Raw binary preserves EXIF payload
    });

    if (!s3Res.ok) {
      throw new Error(`Failed to upload photo for ${shot.title}`);
    }

    return {
      shotId: shot.id,
      uploadedKey: target.key,
    };
  });

  const photos = await Promise.all(uploadPromises);

  // 3. Confirm photos
  const confirmRes = await postApartmentsByIdPhotosConfirm({
    ...config,
    path: { id: apartmentId },
    body: {
      reservationId,
      type,
      photos,
    },
  });

  if ("error" in confirmRes && confirmRes.error) {
    throw new Error(
      (confirmRes.error as any)?.message ||
        "Failed to confirm uploaded photos.",
    );
  }

  // 4. Update reservation status
  const patchRes = await patchReservationsById({
    ...config,
    path: { id: reservationId },
    body: {
      hasPhotoProof: true,
      status: "COVERED",
    },
  });

  if ("error" in patchRes &&  patchRes.error) {
    throw new Error(
      (patchRes.error as any)?.message ||
        "Failed to update reservation status.",
    );
  }

  return confirmRes.data;
}
