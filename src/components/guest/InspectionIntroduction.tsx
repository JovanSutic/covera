import { Sparkles, ShieldCheck, Camera, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import InstructionsShort from "./InstructionsShort";

interface InspectionIntroductionProps {
  apartmentName?: string;
  onStartWalkthrough: () => void;
  isLoading?: boolean;
}

export function InspectionIntroduction({
  apartmentName,
  onStartWalkthrough,
  isLoading = false,
}: InspectionIntroductionProps) {
  const { t } = useTranslation("guest");

  return (
    <div className="mt-4 mb-8 rounded-2xl border border-blue-100/80 bg-gradient-to-b from-blue-50/60 to-white p-6 shadow-xs dark:border-blue-900/40 dark:from-blue-950/20 dark:to-gray-900 sm:p-8">
      {/* Hero Welcome */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{t("inspectionIntro.badge")}</span>
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        {apartmentName
          ? t("inspectionIntro.titleNamed", { apartmentName })
          : t("inspectionIntro.titleDefault")}
      </h1>

      <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
        {t("inspectionIntro.description")}
      </p>

      {/* Dual Value Pitch */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800/50">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("inspectionIntro.pitch.peaceOfMind.title")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("inspectionIntro.pitch.peaceOfMind.description")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-xs dark:border-gray-800 dark:bg-gray-800/50">
          <Camera className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("inspectionIntro.pitch.effortlessCheck.title")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("inspectionIntro.pitch.effortlessCheck.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Deep-Dive Instructions Toggle */}
      <InstructionsShort />

      {/* Action CTA */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStartWalkthrough}
          disabled={isLoading}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>
            {isLoading
              ? t("inspectionIntro.buttons.loading")
              : t("inspectionIntro.buttons.start")}
          </span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}