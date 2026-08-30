import { useState, useMemo } from "react";
import Typography from "@/components/Typography";
import { InlineCamera } from "./InlineCamera";
import {
  submitInspectionPhotos,
  type CapturedApartmentShot,
} from "@/lib/api/submitPhotoProofs"; // Import helper and type
import type { ApartmentShot } from "@/api/generated/requests/types.gen";
import { toast } from "sonner";

const SHOT_TYPE_LABELS: Record<ApartmentShot["shotType"], string> = {
  SWEEP_ONLY: "Wide Sweep",
  CLOSEUP: "Close-up",
  FUNCTIONAL_ACTION: "Functional / In-Action",
};

function formatRoomLocation(room: ApartmentShot["roomLocation"]): string {
  return room
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface ApartmentShotGuideProps {
  apartmentId: string;
  reservationId: string;
  initialShots: CapturedApartmentShot[];
  onCompleteAll: (shots: CapturedApartmentShot[]) => void;
}

export function ApartmentShotGuide({
  apartmentId,
  reservationId,
  initialShots,
  onCompleteAll,
}: ApartmentShotGuideProps) {
  const [shots, setShots] = useState<CapturedApartmentShot[]>(initialShots);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentShot = shots[currentIndex];

  const roomGroups = useMemo(() => {
    const groups: Record<string, CapturedApartmentShot[]> = {};
    shots.forEach((shot) => {
      if (!groups[shot.roomLocation]) groups[shot.roomLocation] = [];
      groups[shot.roomLocation].push(shot);
    });
    return groups;
  }, [shots]);

  const currentRoomShots = roomGroups[currentShot?.roomLocation] || [];
  const shotIndexInRoom =
    currentRoomShots.findIndex((s) => s.id === currentShot?.id) + 1;

  // Receives previewUrl AND raw file from InlineCamera
  const handleCaptureImage = (previewUrl: string, file?: File) => {
    setShots((prev) =>
      prev.map((s, idx) =>
        idx === currentIndex
          ? { ...s, capturedImageUrl: previewUrl, rawFile: file }
          : s
      )
    );
    setIsCameraActive(false);

    if (currentIndex < shots.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleFinishAll = async () => {
    setIsSubmitting(true);
    try {
      await submitInspectionPhotos({ apartmentId, reservationId, shots });
      onCompleteAll(shots);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to submit inspection photos.");
      console.error("Failed to submit photos:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = shots.filter((s) => s.capturedImageUrl).length;
  const progressPercent = Math.round((completedCount / shots.length) * 100);

  if (!currentShot) {
    return (
      <div className="p-8 text-center border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/20">
        <Typography type="h4">No shots required for this apartment</Typography>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-2">
      <div className="bg-white dark:bg-gray-900 p-3 pt-0 sm:p-2 rounded-xl space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-xs font-semibold tracking-wider text-gray-400 uppercase truncate">
              Current Location
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {formatRoomLocation(currentShot.roomLocation)}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="block text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              Shot {shotIndexInRoom} of {currentRoomShots.length} in room
            </span>
            <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
              {completedCount} / {shots.length} Completed
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl lg:p-5 space-y-4">
        {isCameraActive ? (
          <InlineCamera
            onCapture={handleCaptureImage}
            onCancel={() => setIsCameraActive(false)}
          />
        ) : (
          <div className="relative aspect-16/12 lg:aspect-16/9 w-full bg-gray-950 rounded-xl flex items-center justify-center overflow-hidden border border-gray-800">
            {currentShot.capturedImageUrl ? (
              <img
                src={currentShot.capturedImageUrl}
                alt={currentShot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 text-gray-400">
                  📷
                </div>
                <p className="text-xs text-gray-400">No photo captured yet.</p>
              </div>
            )}

            <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-xs font-medium rounded-full border border-white/10">
              {SHOT_TYPE_LABELS[currentShot.shotType] || currentShot.shotType}
            </span>
          </div>
        )}

        {!isCameraActive && (
          <div className="space-y-4">
            <div>
              <Typography
                type="h4"
                className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {currentShot.title}
              </Typography>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">
                {currentShot.instructions}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCameraActive(true)}
              className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              <span>📷</span>
              <span>
                {currentShot.capturedImageUrl ? "Retake Photo" : "Take Photo"}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        <button
          type="button"
          onClick={() => {
            setIsCameraActive(false);
            setCurrentIndex((prev) => Math.max(0, prev - 1));
          }}
          disabled={currentIndex === 0 || isSubmitting}
          className="px-5 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ← Previous
        </button>

        {currentIndex === shots.length - 1 ? (
          <button
            type="button"
            onClick={handleFinishAll}
            disabled={completedCount === 0 || isSubmitting}
            className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {isSubmitting ? "Uploading..." : "Finish & Save All"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsCameraActive(false);
              setCurrentIndex((prev) => Math.min(shots.length - 1, prev + 1));
            }}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}