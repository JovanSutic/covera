import { ShieldCheck, Camera, ChevronRight, Loader2, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExplanationCard } from "../shared/ExplorationBox";

import { GradientContainer } from "../shared/GradientContainer";

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

  const title = apartmentName
    ? t("inspectionIntro.titleNamed", { apartmentName })
    : t("inspectionIntro.titleDefault");

  return (
    <GradientContainer
      className="mt-4 mb-8"
      badgeText={t("inspectionIntro.badge")}
      title={title}
      description={t("inspectionIntro.description")}
    >
      {/* How It Works Box */}
      <ExplanationCard
        variant="info"
        className="mt-5"
        icon={<Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        title={t("inspectionIntro.howItWorks.title")}
        description={t("inspectionIntro.howItWorks.description")}
      />

      {/* Dual Value Pitch */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ExplanationCard
          variant="neutral"
          icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
          title={t("inspectionIntro.pitch.peaceOfMind.title")}
          description={t("inspectionIntro.pitch.peaceOfMind.description")}
        />

        <ExplanationCard
          variant="neutral"
          icon={<Camera className="h-5 w-5 text-blue-500" />}
          title={t("inspectionIntro.pitch.effortlessCheck.title")}
          description={t("inspectionIntro.pitch.effortlessCheck.description")}
        />
      </div>

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
    </GradientContainer>
  );
}
