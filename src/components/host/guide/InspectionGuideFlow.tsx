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
  confirmationIndex,
  initialCursorIndex,
  inspectionGuideSteps,
  isCaptured,
  isViewingEarlierStep,
  selectStep,
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
  renderCamera?: (onCapture: (url: string, file: File) => void) => ReactNode;
}

export function InspectionGuideFlow({
  initialShots,
  isSubmitting = false,
  onSubmit,
  renderCamera,
}: InspectionGuideFlowProps) {
  const { t } = useTranslation("assets");
  const { shots, capture } = useCapturedShots(initialShots);

  const [cursorIndex, setCursorIndex] = useState(() => initialCursorIndex(initialShots));
  const [viewedIndex, setViewedIndex] = useState(() => initialCursorIndex(initialShots));

  const canLeave = canLeaveGuide(shots, isSubmitting);
  const blocker = useGuideExitGuard(canLeave);

  if (shots.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/20">
        <Typography type="h4">{t("shotGuide.noShots")}</Typography>
      </div>
    );
  }

  const confirmation = confirmationIndex(shots);
  const isOnConfirmation = viewedIndex === confirmation;
  const shot = isOnConfirmation ? undefined : shots[viewedIndex];
  const isViewing = isViewingEarlierStep(cursorIndex, viewedIndex);
  const completed = capturedCount(shots);

  const openStep = (index: number) => {
    setViewedIndex(selectStep(shots, index, cursorIndex));
  };

  const handleCapture = (previewUrl: string, file?: File) => {
    capture(viewedIndex, previewUrl, file);
  };

  const handleNext = () => {
    const next = advanceCursor(shots, cursorIndex);
    const target = next === cursorIndex ? cursorIndex + 1 : next;
    setCursorIndex(target);
    setViewedIndex(target);
  };

  const handleGoToCurrent = () => {
    setViewedIndex(cursorIndex);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      <PhotoStrip
        items={inspectionGuideSteps(shots, cursorIndex, viewedIndex)}
        photoCount={shots.length}
        onSelect={openStep}
      />

      {isOnConfirmation ? (
        <GuideReviewScreen
          totalCount={shots.length}
          isSubmitting={isSubmitting}
          onSubmit={() => onSubmit(shots)}
        />
      ) : (
        <ShotStepPanel
          shot={shot as CapturedApartmentShot}
          shotIndexInRoom={
            shots
              .filter((candidate) => candidate.roomLocation === (shot as CapturedApartmentShot).roomLocation)
              .findIndex((candidate) => candidate.id === (shot as CapturedApartmentShot).id) + 1
          }
          roomShotCount={
            shots.filter(
              (candidate) => candidate.roomLocation === (shot as CapturedApartmentShot).roomLocation,
            ).length
          }
          completedCount={completed}
          totalCount={shots.length}
          isCaptured={isCaptured(shot)}
          isViewingEarlierStep={isViewing}
          hasNextStep={cursorIndex < confirmation}
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
