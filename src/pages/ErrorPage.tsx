import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import PageLayout from "@/components/layout/PageLayout";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";

export function ErrorPage() {
  const error = useRouteError();

  let title = "Unexpected Error";
  let subtitle = "Something went wrong while loading this page.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page Not Found";
      subtitle = "The requested inspection or page does not exist.";
    } else if (error.status === 500) {
      title = "Server Error";
      subtitle = "We encountered a problem on our end. Please try again later.";
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
            Back to Home
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}