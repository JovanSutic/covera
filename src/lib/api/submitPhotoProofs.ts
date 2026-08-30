import {
  postApartmentsByIdPhotosUploadTokens,
  postApartmentsByIdPhotosConfirm,
  patchReservationsById,
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
  const completedShots = shots.filter(
    (shot): shot is CapturedApartmentShot & { rawFile: File } =>
      Boolean(shot.rawFile && shot.capturedImageUrl)
  );

  if (completedShots.length === 0) {
    throw new Error("No photos to upload.");
  }

  const tokensRes = await postApartmentsByIdPhotosUploadTokens({
    path: { id: apartmentId },
    body: {
      fileTypes: completedShots.map(
        (shot) => shot.rawFile.type || "image/jpeg"
      ),
    },
  });

  const uploadTargets = tokensRes.data?.tokens ?? [];

  // 2. Upload binaries to S3/Cloudflare R2 and map to the required photo object shape
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

    // Map each shotId to its corresponding uploaded key directly
    return {
      shotId: shot.id,
      uploadedKey: target.key,
    };
  });

  const photos = await Promise.all(uploadPromises);

  // 3. Confirm photos using the updated body structure
  const confirmRes = await postApartmentsByIdPhotosConfirm({
    path: { id: apartmentId },
    body: {
      reservationId,
      type,
      photos,
    },
  });

  await patchReservationsById({
    path: { id: reservationId },
    body: {
      hasPhotoProof: true,
      status: "COVERED",
    },
  });

  return confirmRes.data;
}