import { isRouteErrorResponse, useRouteError } from "react-router";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";

export const CHUNK_RELOAD_KEY = "covera:chunk-reload";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "ChunkLoadError" ||
    /dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(
      error.message,
    )
  );
}

/**
 * Reloads once per session for a stale chunk (R8). A storage failure means
 * "do not reload" — a browser that blocks sessionStorage must never loop.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function reloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/** Cleared by the router factory after the next successful idle navigation. */
// eslint-disable-next-line react-refresh/only-export-components
export function clearStaleChunkFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // Storage unavailable: nothing to clear, and nothing to leak.
  }
}

export function RouteError() {
  const { t } = useTranslation("general");
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 403) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("errorPage.forbiddenTitle")}
          subtitle={t("errorPage.forbiddenSubtitle")}
        />
      </PageLayout>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("errorPage.notFoundTitle")}
          subtitle={t("errorPage.notFoundSubtitle")}
        />
      </PageLayout>
    );
  }

  if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
    // The reload is in flight; render nothing so the user does not see a flash.
    return null;
  }

  return (
    <PageLayout size="lg">
      <PageTitle
        title={t("errorPage.unexpectedTitle")}
        subtitle={error instanceof Error ? error.message : t("errorPage.unexpectedSubtitle")}
      />
    </PageLayout>
  );
}
