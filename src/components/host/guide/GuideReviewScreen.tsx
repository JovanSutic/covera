import { useTranslation } from "react-i18next";

interface GuideReviewScreenProps {
  totalCount: number;
  isSubmitting: boolean;
  onSubmit: () => void;
}

/**
 * The last screen before the submit (prep §3). Text only: it tells the host that every
 * photo is collected and to check the transparency list above before submitting. The
 * strip stays visible above it (D15) — the copy tells the host to look at the list, so
 * hiding the list on this screen would contradict the sentence.
 *
 * It is the flow's ONLY submit surface (D16): there is no Finish & Save on the last step
 * any more, and no other component calls `onSubmit`.
 */
export function GuideReviewScreen({
  totalCount,
  isSubmitting,
  onSubmit,
}: GuideReviewScreenProps) {
  const { t } = useTranslation("assets");

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="space-y-2 text-center">
        <div className="text-3xl" aria-hidden="true">
          ✅
        </div>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
          {t("shotGuide.review.title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("shotGuide.review.description", { total: totalCount })}
        </p>
      </div>

      <p className="rounded-xl bg-amber-500/10 p-3.5 text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-400">
        {t("shotGuide.review.checklist")}
      </p>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-800"
      >
        {isSubmitting
          ? t("shotGuide.actions.uploading")
          : t("shotGuide.review.submit")}
      </button>
    </div>
  );
}
