import { useState } from "react";
import { Flag, Eye, ChevronRight, X, Clock } from "lucide-react";
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
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        {/* Simplified Header - Title Only */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {shot.title}
          </h3>
        </div>

        {/* Full-Width Image Display Container */}
        <div className="relative aspect-16/9 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white shadow-md">
                  <Eye className="h-3.5 w-3.5" /> Tap to zoom
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
                No image uploaded for this shot yet
              </p>
            </div>
          )}

          {/* Dimmed Red Flag Action Button Overlaid on Top Right */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFlagShot?.(shot.id);
            }}
            title="Flag issue with this photo"
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-red-800 backdrop-blur-xs transition-all hover:bg-red-600 hover:text-white dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Timestamp Below Image */}
        {captureTimestamp && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>Captured on {captureTimestamp}</span>
          </div>
        )}

        {/* Asset Checklist Section */}
        {shot.assets && shot.assets.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {isSweep
                ? "Verify these items are clearly visible in the photo:"
                : "Verify this item is clearly visible in the photo:"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {shot.assets.map((asset) => (
                <span
                  key={asset.id}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-300"
                >
                  <ChevronRight className="h-3 w-3 text-gray-400" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs"
          onClick={() => setIsZoomed(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setIsZoomed(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={imageUrl}
            alt={shot.title}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}