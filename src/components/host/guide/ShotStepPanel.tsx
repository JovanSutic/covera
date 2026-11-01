import { useRef } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import Typography from "@/components/Typography";
import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { cn } from "@/lib/utils";
import { ShotStepActions } from "./ShotStepActions";

interface ShotStepPanelProps {
  shot: CapturedApartmentShot;
  /** Index within the room's own shots — the "3 of 5 in room" counter, as today. */
  shotIndexInRoom: number;
  roomShotCount: number;
  completedCount: number;
  totalCount: number;
  isCaptured: boolean;
  isViewingEarlierStep: boolean;
  hasNextStep: boolean;
  disabled: boolean;
  onCapture: (previewUrl: string, file: File) => void;
  onNext: () => void;
  onGoToCurrent: () => void;
  /**
   * D24b/D30: the camera is injected, and it is the *trigger*, not a view. Prep §2 puts the
   * native camera outside the app, so this control's job is to hand the OS a file input; the
   * default rendered below is that control, and a test replaces it with a stub. There is no
   * `onCancel`: a native picker is dismissed by the OS, so there is no in-app state to undo.
   */
  renderCamera?: (onCapture: (url: string, file: File) => void) => ReactNode;
}

/**
 * One step of the flow (prep §2). The structure is the same for every step; only the
 * instruction changes — which is exactly why the step is a component and not a branch
 * inside a page.
 *
 * D30: this panel is the flow's ONLY step view. The preview area and the camera control
 * are always both on screen; the control is the native camera's trigger, exactly as
 * `InlineCamera`'s `openCameraButton` was, so the host never passes through an intermediate
 * in-app camera screen.
 */
export function ShotStepPanel({
  shot,
  shotIndexInRoom,
  roomShotCount,
  completedCount,
  totalCount,
  isCaptured,
  isViewingEarlierStep,
  hasNextStep,
  disabled,
  onCapture,
  onNext,
  onGoToCurrent,
  renderCamera,
}: ShotStepPanelProps) {
  const { t } = useTranslation("assets");
  const inputRef = useRef<HTMLInputElement>(null);

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  /**
   * The same mechanism `InlineCamera` used: create the object URL at capture time (D19),
   * then clear the input so re-choosing the same file fires `change` again — which is what
   * makes a retake take a second photo rather than silently doing nothing.
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onCapture(URL.createObjectURL(file), file);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {/* Header & progress bar — markup unchanged from ShotsGuide.tsx. */}
      <div className="space-y-2 rounded-xl bg-white p-3 pt-0 sm:p-2 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">
              {t("shotGuide.header.currentLocation")}
            </span>
            <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base dark:text-gray-100">
              {t(`roomLocations.${shot.roomLocation}`, { defaultValue: shot.roomLocation })}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-[10px] text-gray-500 sm:text-xs dark:text-gray-400">
              {t("shotGuide.header.shotProgress", {
                current: shotIndexInRoom,
                total: roomShotCount,
              })}
            </span>
            <div className="text-xs font-semibold text-gray-900 sm:text-sm dark:text-gray-100">
              {t("shotGuide.header.completedCount", {
                completed: completedCount,
                total: totalCount,
              })}
            </div>
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* The step's own content. */}
      <div className="space-y-4 rounded-2xl bg-white lg:p-5 dark:bg-gray-900">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Typography
              type="h4"
              className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100"
            >
              {shot.title}
            </Typography>
            <span className="shrink-0 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t(`shotGuide.shotTypes.${shot.shotType}`, { defaultValue: shot.shotType })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-line text-xs text-gray-600 dark:text-gray-300">
            {shot.instructions}
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative flex aspect-16/12 w-full items-center justify-center overflow-hidden rounded-xl border border-gray-800 bg-gray-950 lg:aspect-16/9">
            {isCaptured ? (
              <img
                src={shot.capturedImageUrl}
                alt={shot.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="space-y-2 p-6 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400">
                  📷
                </div>
                <p className="text-xs text-gray-400">{t("shotGuide.camera.noPhoto")}</p>
              </div>
            )}
          </div>

          <fieldset disabled={disabled} className="contents">
            {renderCamera ? (
              renderCamera(onCapture)
            ) : (
              <label
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span>📷</span>
                <span>
                  {isCaptured
                    ? t("shotGuide.camera.retakePhoto")
                    : t("shotGuide.camera.openCamera")}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </fieldset>
        </div>

        <ShotStepActions
          isCaptured={isCaptured}
          isViewingEarlierStep={isViewingEarlierStep}
          hasNextStep={hasNextStep}
          disabled={disabled}
          onNext={onNext}
          onGoToCurrent={onGoToCurrent}
        />
      </div>
    </div>
  );
}