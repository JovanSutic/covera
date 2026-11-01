import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import Typography from "@/components/Typography";
import { useGuideExitGuard } from "@/hooks/useGuideExitGuard";
import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { canLeaveGuide } from "@/lib/helpers/guideExit";
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
import { LeaveGuideDialog } from "./LeaveGuideDialog";
import { PhotoStrip } from "./PhotoStrip";
import { ShotStepPanel } from "./ShotStepPanel";
import { useCapturedShots } from "./useCapturedShots";

interface InspectionGuideFlowProps {
  initialShots: CapturedApartmentShot[];
  isSubmitting?: boolean;
  onSubmit: (shots: CapturedApartmentShot[]) => void;
  /**
   * D24b/D30: the camera is injected as the *control*, not as a view — it hands the OS a
   * file input. The real one is `ShotStepPanel`'s own default, so this prop exists only for
   * a test to replace it with a stub.
   */
  renderCamera?: (onCapture: (url: string, file: File) => void) => ReactNode;
}

/**
 * The photo-proof flow (prep §1–3), composed from the pieces beside this file.
 *
 * It is the second-least-knowledgeable component in the feature: it owns the cursor and the
 * viewed index, asks `guideFlow.ts` every question, and passes the answers down. No business
 * logic is computed inline (invariant 13) because every rule it would compute is a tested
 * export of that module.
 *
 * Cursor vs viewed index is the whole of prep §1's jump-back behaviour: the cursor is
 * where sequential progress stopped, `viewedIndex` is what the host is looking at. They
 * are equal except while the host is inspecting an earlier photo (D21).
 *
 * D30/D14 as amended: there is no in-app camera view. The step panel is the only step
 * surface and its control is the native camera's trigger, so the strip — which prep §1 wants
 * "always in the view" — is rendered in every flow state, the review screen included (D15).
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

  // D9/D10: one answer, two exits. The hook blocks an in-app navigation and warns on a tab
  // close; the dialog below is what the in-app block renders.
  const canLeave = canLeaveGuide(shots, isSubmitting);
  const blocker = useGuideExitGuard(canLeave);

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

  // D16: the review screen is only reachable once every step carries a photo, and only
  // while the host is not off inspecting an earlier one.
  const showReview = flowComplete && !isViewing;

  const openStep = (index: number) => {
    setViewedIndex(selectStep(shots, index, cursorIndex));
  };

  const handleCapture = (previewUrl: string, file?: File) => {
    capture(viewedIndex, previewUrl, file);
  };

  const handleNext = () => {
    const next = advanceCursor(shots, cursorIndex);
    setCursorIndex(next);
    setViewedIndex(next);
  };

  const handleGoToCurrent = () => {
    setViewedIndex(cursorIndex);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      <PhotoStrip items={stripItems(shots, cursorIndex)} onSelect={openStep} />

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
          isCaptured={currentIsCaptured}
          isViewingEarlierStep={isViewing}
          hasNextStep={nextPendingIndex(shots, cursorIndex) !== null}
          disabled={isSubmitting}
          onCapture={handleCapture}
          onNext={handleNext}
          onGoToCurrent={handleGoToCurrent}
          renderCamera={renderCamera}
        />
      )}

      <LeaveGuideDialog
        isOpen={blocker.state === "blocked"}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}