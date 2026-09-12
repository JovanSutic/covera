import { useState } from "react";
import { Flag, Eye, CheckCircle2, X, Clock } from "lucide-react";
import type { ShotWithAssets } from "@/api/generated/requests/types.gen";

interface RoomPhotoItemProps {
  shot: ShotWithAssets;
  onFlagShot?: (shotId: string) => void;
}

const R2_IMAGE_URL = import.meta.env.VITE_R2_IMAGE_URL;

export function RoomPhotoItem({ shot, onFlagShot }: RoomPhotoItemProps) {
  const [isZoomed, setIsZoomed] = useState(false);
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
    <>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/40 to-white p-4 sm:p-5 shadow-xs dark:border-blue-900/30 dark:from-blue-950/20 dark:to-gray-900">
        {/* Header - Title & Top-Right Flag Action */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {shot.title}
          </h3>

          <button
            type="button"
            onClick={() => onFlagShot?.(shot.id)}
            title="Flag issue with this photo"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/80 hover:bg-rose-100 hover:text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-900/60 cursor-pointer transition-colors shrink-0"
          >
            <Flag className="h-3.5 w-3.5 stroke-[2]" />
            <span>Flag item</span>
          </button>
        </div>

        {/* Image Display Container */}
        <div className="relative aspect-16/9 w-full overflow-hidden rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
          {imageUrl ? (
            <div
              className="group relative h-full w-full cursor-zoom-in"
              onClick={() => setIsZoomed(true)}
            >
              <img
                src={imageUrl}
                alt={shot.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-[1px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-md">
                  <Eye className="h-3.5 w-3.5" /> Tap to zoom
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                No reference photo uploaded yet
              </p>
            </div>
          )}
        </div>

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

      {/* Tap-to-Zoom Modal */}
      {isZoomed && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={imageUrl}
            alt={shot.title}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}