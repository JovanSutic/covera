import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { SectionCard } from "@/components/shared/SectionCard";

const SECTIONS = ["immediate", "photos", "costs", "deadlines", "airbnb"] as const;

export default function DamageClaimGuidePage() {
  const { t } = useTranslation("host");

  return (
    <PageLayout size="lg">
      <div className="space-y-6">
        <PageTitle
          title={t("incidentPage.guide.title")}
          subtitle={t("incidentPage.guide.subtitle")}
        />

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("incidentPage.guide.intro")}
        </p>

        {SECTIONS.map((section) => (
          <SectionCard
            key={section}
            title={t(`incidentPage.guide.sections.${section}.title`)}
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t(`incidentPage.guide.sections.${section}.body`)}
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              {(
                t(`incidentPage.guide.sections.${section}.points`, {
                  returnObjects: true,
                }) as unknown as string[]
              ).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </PageLayout>
  );
}