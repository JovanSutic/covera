import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";

export function ErrorPage() {
  const { t } = useTranslation("general");
  const error = useRouteError();

  let title = t("errorPage.unexpectedTitle");
  let subtitle = t("errorPage.unexpectedSubtitle");

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = t("errorPage.notFoundTitle");
      subtitle = t("errorPage.notFoundSubtitle");
    } else if (error.status === 500) {
      title = t("errorPage.serverErrorTitle");
      subtitle = t("errorPage.serverErrorSubtitle");
    }
  } else if (error instanceof Error) {
    subtitle = error.message;
  }

  return (
    <PageLayout size="lg">
      <Header />
      <div className="py-12 text-center">
        <PageTitle title={title} subtitle={subtitle} />
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {t("errorPage.backToHome")}
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}