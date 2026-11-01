import { useTranslation } from "react-i18next";

interface LeaveGuideDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * D12: not `Modal`. `Modal.tsx` closes on a backdrop click and on Escape, both of which
 * would silently discard the confirmation — the host would think they had been warned and
 * find their photos gone. This asks a question and requires an answer, so neither gesture
 * closes it.
 *
 * The overlay's classes are the ones `ShotsGuide.tsx` used for its uploading modal, so the
 * two overlays this screen can show look like the same thing.
 */
export function LeaveGuideDialog({
  isOpen,
  onConfirm,
  onCancel,
}: LeaveGuideDialogProps) {
  const { t } = useTranslation("assets");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-md">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-guide-title"
        className="w-full max-w-md animate-in space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl fade-in zoom-in-95 duration-200 sm:p-8 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="text-3xl" aria-hidden="true">
          ⚠️
        </div>

        <div className="space-y-2">
          <h3
            id="leave-guide-title"
            className="text-lg font-bold text-gray-900 sm:text-xl dark:text-gray-100"
          >
            {t("shotGuide.leave.title")}
          </h3>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-gray-500 sm:text-sm dark:text-gray-400">
            {t("shotGuide.leave.description")}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="cursor-pointer rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {t("shotGuide.leave.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t("shotGuide.leave.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
