import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";

export default function NotFoundPage() {
  const { t } = useTranslation("general");

  return (
    <PageLayout size="lg">
      <PageTitle
        title={t("errorPage.notFoundTitle")}
        subtitle={t("errorPage.notFoundSubtitle")}
      />
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {t("errorPage.backToHome")}
      </Link>
    </PageLayout>
  );
}
