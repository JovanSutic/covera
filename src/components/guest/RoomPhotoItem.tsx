import { Flag, CheckCircle2, Clock } from "lucide-react";
import type { ShotWithAssets } from "@/api/generated/requests/types.gen";
import { ExpandableImage } from "../shared/ExpendableImage";

interface RoomPhotoItemProps {
  shot: ShotWithAssets;
  onFlagShot?: (shotId: string) => void;
  isFlagDisabled: boolean;
}

const R2_IMAGE_URL = import.meta.env.VITE_R2_IMAGE_URL;

export function RoomPhotoItem({ shot, onFlagShot, isFlagDisabled }: RoomPhotoItemProps) {
  const activeImage = shot.images.find(
    (img) => img.status === "active" && !img.deletedAt,
  );

  const imageUrl = activeImage
    ? `${R2_IMAGE_URL}/${activeImage.storageKey}`
    : null;

  // Format captured timestamp
  const captureTimestamp = activeImage?.uploadedAt
    ? new Date(activeImage.uploadedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const isSweep = shot.shotType === "SWEEP_ONLY";

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/40 to-white p-4 sm:p-5 shadow-xs dark:border-blue-900/30 dark:from-blue-950/20 dark:to-gray-900">
      {/* Header - Title & Top-Right Flag Action */}
      <div className="mb-3 flex items-center justify-end gap-3">
        {/* <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
          {shot.title}
        </h3> */}

        <button
          type="button"
          onClick={() => onFlagShot?.(shot.id)}
          title="Flag issue with this photo"
          disabled={isFlagDisabled}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/80 hover:bg-rose-100 cursor-pointer hover:text-rose-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Flag className="h-3.5 w-3.5 stroke-[2]" />
          <span>Flag item</span>
        </button>
      </div>

      {/* Extracted Image Component */}
      <ExpandableImage
        src={imageUrl ?? ""}
        alt={shot.title}
        className="aspect-16/9 w-full"
      />

      {/* Timestamp Below Image */}
      {captureTimestamp && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          <span>Captured on {captureTimestamp}</span>
        </div>
      )}

      {/* Asset Checklist Section */}
      {shot.assets && shot.assets.length > 0 && (
        <div className="mt-3.5 border-t border-gray-100/80 dark:border-gray-800/80 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            {isSweep
              ? "Verify these items are clearly visible in the space:"
              : "Verify this item is clearly visible in the space:"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {shot.assets.map((asset) => (
              <span
                key={asset.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                {asset.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}