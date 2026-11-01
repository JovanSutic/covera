import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { InlineCamera } from "@/components/host/InlineCamera";
import Typography from "@/components/Typography";
import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import {
  advanceCursor,
  capturedCount,
  initialCursorIndex,
  isCaptured,
  isFlowComplete,
  isViewingEarlierStep,
  nextPendingIndex,
  selectStep,
  stripItems,
} from "@/lib/helpers/guideFlow";
import { GuideReviewScreen } from "./GuideReviewScreen";
import { PhotoStrip } from "./PhotoStrip";
import { ShotStepPanel } from "./ShotStepPanel";
import { useCapturedShots } from "./useCapturedShots";

interface InspectionGuideFlowProps {
  initialShots: CapturedApartmentShot[];
  isSubmitting?: boolean;
  onSubmit: (shots: CapturedApartmentShot[]) => void;
  /** D24b: the camera is injected; the default is the real one. */
  renderCamera?: (
    onCapture: (url: string, file: File) => void,
    onCancel: () => void,
  ) => ReactNode;
}

/**
 * The photo-proof flow (prep §1–3), composed from the pieces beside this file.
 *
 * It is the second-least-knowledgeable component in the feature: it owns the cursor, the
 * viewed index and whether the camera is open, asks `guideFlow.ts` every question, and
 * passes the answers down. No business logic is computed inline (invariant 13) because
 * every rule it would compute is a tested export of that module.
 *
 * Cursor vs viewed index is the whole of prep §1's jump-back behaviour: the cursor is
 * where sequential progress stopped, `viewedIndex` is what the host is looking at. They
 * are equal except while the host is inspecting an earlier photo (D21).
 *
 * `isSubmitting` is the page's mutation state. While it is true the page renders a
 * full-screen overlay above this component, so this file only has to keep the controls
 * disabled and hand the review screen its pending label.
 */
export function InspectionGuideFlow({
  initialShots,
  isSubmitting = false,
  onSubmit,
  renderCamera,
}: InspectionGuideFlowProps) {
  const { t } = useTranslation("assets");
  const { shots, capture } = useCapturedShots(initialShots);

  // D20: a fresh guide opens on step 0; a resumed one opens on its first pending step.
  const [cursorIndex, setCursorIndex] = useState(() => initialCursorIndex(initialShots));
  const [viewedIndex, setViewedIndex] = useState(() => initialCursorIndex(initialShots));
  const [isCameraOpen, setIsCameraOpen] = useState(true);

  if (shots.length === 0) {
    // Spec §Behaviour row 2 / decisions "Empty": the existing noShots panel, no strip.
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/20">
        <Typography type="h4">{t("shotGuide.noShots")}</Typography>
      </div>
    );
  }

  const shot = shots[viewedIndex];
  const isViewing = isViewingEarlierStep(cursorIndex, viewedIndex);
  const flowComplete = isFlowComplete(shots);
  const currentIsCaptured = isCaptured(shot);

  // Prep §1: the strip is on screen in every state except while the camera is open (D14),
  // and the review screen is only reachable once every step carries a photo (D16).
  const showStrip = !isCameraOpen;
  const showReview = flowComplete && !isViewing;

  const openStep = (index: number) => {
    const selected = selectStep(shots, index, cursorIndex);
    setViewedIndex(selected);
    setIsCameraOpen(!isCaptured(shots[selected]));
  };

  const handleCapture = (previewUrl: string, file?: File) => {
    capture(viewedIndex, previewUrl, file);
    setIsCameraOpen(false);
  };

  const handleNext = () => {
    const next = advanceCursor(shots, cursorIndex);
    setCursorIndex(next);
    setViewedIndex(next);
    setIsCameraOpen(!isCaptured(shots[next]));
  };

  const handleGoToCurrent = () => {
    setViewedIndex(cursorIndex);
    setIsCameraOpen(!isCaptured(shots[cursorIndex]));
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      {showStrip && (
        <PhotoStrip items={stripItems(shots, cursorIndex)} onSelect={openStep} />
      )}

      {showReview ? (
        <GuideReviewScreen
          totalCount={shots.length}
          isSubmitting={isSubmitting}
          onSubmit={() => onSubmit(shots)}
        />
      ) : (
        <ShotStepPanel
          shot={shot}
          shotIndexInRoom={
            shots
              .filter((candidate) => candidate.roomLocation === shot.roomLocation)
              .findIndex((candidate) => candidate.id === shot.id) + 1
          }
          roomShotCount={
            shots.filter((candidate) => candidate.roomLocation === shot.roomLocation)
              .length
          }
          completedCount={capturedCount(shots)}
          totalCount={shots.length}
          isCameraOpen={isCameraOpen}
          isCaptured={currentIsCaptured}
          isViewingEarlierStep={isViewing}
          hasNextStep={nextPendingIndex(shots, cursorIndex) !== null}
          disabled={isSubmitting}
          onCapture={handleCapture}
          onCameraCancel={() => setIsCameraOpen(false)}
          onOpenCamera={() => setIsCameraOpen(true)}
          onNext={handleNext}
          onGoToCurrent={handleGoToCurrent}
          renderCamera={
            renderCamera ??
            ((onCapture, onCancel) => (
              <InlineCamera onCapture={onCapture} onCancel={onCancel} />
            ))
          }
        />
      )}
    </div>
  );
}
