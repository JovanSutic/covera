import { useTranslation } from "react-i18next";

interface ShotStepActionsProps {
  /** True when this step carries a photo — the step's own state, not the flow's. */
  isCaptured: boolean;
  /** D4: true while viewing a captured step that is not the cursor. */
  isViewingEarlierStep: boolean;
  /** D5: false when no pending step follows — the review screen is the next surface. */
  hasNextStep: boolean;
  disabled: boolean;
  onNext: () => void;
  onGoToCurrent: () => void;
}

/**
 * The step's exits (prep §2). At most two are ever rendered, and which two is entirely
 * decided by the caller — this component compares nothing.
 *
 *   normal          → Next            (disabled until the step carries a photo, D5)
 *   viewing earlier → Go to current   (never Next, D4)
 *   last pending    → neither; the hint says why, and the review screen follows a capture
 */
export function ShotStepActions({
  isCaptured,
  isViewingEarlierStep,
  hasNextStep,
  disabled,
  onNext,
  onGoToCurrent,
}: ShotStepActionsProps) {
  const { t } = useTranslation("assets");

  if (isViewingEarlierStep) {
    return (
      <button
        type="button"
        onClick={onGoToCurrent}
        disabled={disabled}
        className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        {t("shotGuide.actions.goToCurrent")}
      </button>
    );
  }

  if (!hasNextStep) {
    return (
      <p className="py-2 text-center text-xs text-gray-500 dark:text-gray-400">
        {isCaptured
          ? t("shotGuide.review.checklist")
          : t("shotGuide.actions.takePhotoFirst")}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!isCaptured || disabled}
      className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
    >
      {t("shotGuide.actions.next")}
    </button>
  );
}
