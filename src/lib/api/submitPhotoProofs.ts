import {
  postApartmentsByIdPhotosUploadTokens,
  postApartmentsByIdPhotosConfirm,
} from "@/api/generated/requests/services.gen";
import type { ApartmentShot } from "@/api/generated/requests/types.gen";

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
  // 1. Get shots that have a newly captured rawFile
  const completedShots = shots.filter(
    (shot): shot is CapturedApartmentShot & { rawFile: File } =>
      Boolean(shot.rawFile && shot.capturedImageUrl)
  );

  if (completedShots.length === 0) {
    throw new Error("No photos to upload.");
  }

  // 2. Request upload tokens / presigned URLs using fileTypes array
  const tokensRes = await postApartmentsByIdPhotosUploadTokens({
    path: { id: apartmentId },
    body: {
      fileTypes: completedShots.map(
        (shot) => shot.rawFile.type || "image/jpeg"
      ),
    },
  });

  const uploadTargets = tokensRes.data?.tokens ?? [];

  // 3. Upload binary directly to S3/Cloudflare R2 and collect uploaded keys
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

    // Return the key returned by the tokens endpoint (using .key instead of .fileKey)
    return target.key;
  });

  const uploadedKeys = await Promise.all(uploadPromises);


  const confirmRes = await postApartmentsByIdPhotosConfirm({
    path: { id: apartmentId },
    body: {
      reservationId,
      shotId: completedShots[0].id,
      uploadedKeys,
      type,
    },
  });

  return confirmRes.data;
}