import { HelpCircle, Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function InstructionsShort() {
  const [showGuide, setShowGuide] = useState(false);
  const { t } = useTranslation("guest");

  return (
    <>
      {showGuide && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-gray-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-gray-300">
          <div className="mb-2 flex items-center gap-2 font-medium text-blue-900 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>{t("instructionsShort.title")}</span>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            <li>{t("instructionsShort.steps.step1")}</li>
            <li>{t("instructionsShort.steps.step2")}</li>
            <li>{t("instructionsShort.steps.step3")}</li>
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowGuide((prev) => !prev)}
        className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <HelpCircle className="h-4 w-4" />
        <span>
          {showGuide
            ? t("instructionsShort.buttons.hide")
            : t("instructionsShort.buttons.show")}
        </span>
      </button>
    </>
  );
}

export default InstructionsShort;