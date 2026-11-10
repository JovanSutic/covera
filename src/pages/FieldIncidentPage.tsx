/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { ActionButton } from "@/components/shared/ActionButton";
import { SectionCard } from "@/components/shared/SectionCard";
import { FieldBaselineReference } from "@/components/field/FieldBaselineReference";
import { FieldCaptureList } from "@/components/field/FieldCaptureList";
import type { FieldCapture } from "@/components/field/FieldCaptureList";
import { requiredFieldViews, submitFieldPhotos } from "@/lib/api/fieldIncident";
import { useFieldIngest } from "@/lib/api/queries/fieldIngest";
import { appPaths, useRouteParams } from "@/lib/router";
import type { FieldSubmitResponse } from "@/api/generated/requests/types.gen";

/**
 * The cleaner's portal — the spec's row 5, rendered OUTSIDE the app shell (D4), with no
 * navigation, no header and no account.
 *
 * The route declares `params: { token: "hex32" }`, so a malformed token never reaches
 * this page: `useRouteParams` throws and the router's own 404 renders instead. That is a
 * DIFFERENT screen from the one below on purpose (D23) — "this URL is not a field link"
 * and "this field link cannot be used" are different things to a cleaner, and the router
 * can only tell the first.
 *
 * D23 again, for the three cases the router cannot distinguish: the backend answers
 * `404 FIELD_TOKEN_INVALID` for an unknown token, an expired one and an already-used one
 * alike, so this page has ONE unusable branch for all three. It does not try to be more
 * informative than the API is.
 */
export default function FieldIncidentPage() {
  const { t } = useTranslation("guest");
  const { token } = useRouteParams(appPaths.fieldIncident) as { token: string };

  const { data: ingest, isLoading, isError } = useFieldIngest(token);

  const [captures, setCaptures] = useState<FieldCapture[]>([]);
  // D22: the post-submit state is LOCAL. The token is spent the moment the submit lands,
  // so navigating or re-reading would show the cleaner a failure screen at the one moment
  // their work is actually safe.
  const [result, setResult] = useState<FieldSubmitResponse | null>(null);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitFieldPhotos(
        token,
        captures.map((capture) => ({
          evidenceType: capture.evidenceType,
          file: capture.file,
        })),
      ),
    // No `invalidateQueries` here, and that is the point — see the note above.
    onSuccess: (response) => setResult(response),
    // D33: the backend's own sentence. No `error.code` switch — `StandardError.error.code`
    // is a plain `string` and there is no union to switch on.
    onError: (error: any) => {
      toast.error(error?.error?.message || t("fieldIncident.submitError"));
    },
  });

  const requiredTypes = ingest ? requiredFieldViews(ingest.requiredEvidenceTypes) : [];
  const isComplete = requiredTypes.every((type) =>
    captures.some((capture) => capture.evidenceType === type),
  );

  const addCapture = (capture: FieldCapture) => {
    // One slot per view: a re-shoot REPLACES the previous shot rather than queueing a
    // second upload of the same type, which is what the cleaner means by "Replace".
    setCaptures((previous) => [
      ...previous.filter((entry) => entry.evidenceType !== capture.evidenceType),
      capture,
    ]);
  };

  const removeCapture = (evidenceType: FieldCapture["evidenceType"]) => {
    setCaptures((previous) =>
      previous.filter((entry) => entry.evidenceType !== evidenceType),
    );
  };

  if (isLoading) {
    return (
      <PageLayout size="sm">
        <PageTitle title={t("fieldIncident.loading")} />
      </PageLayout>
    );
  }

  // One branch for all three causes (D23). `!ingest` covers the case the query resolved
  // with no data, which is what the anonymous read returns for a rejected token.
  if (isError || !ingest) {
    return (
      <PageLayout size="sm">
        <PageTitle
          title={t("fieldIncident.unusable.title")}
          subtitle={t("fieldIncident.unusable.body")}
        />
      </PageLayout>
    );
  }

  // D22 and the blueprint's "Validation Block Screen": the cleaner is told their work is
  // safe, that they may leave, and nothing else. No navigation, no retry, no new link.
  if (result) {
    return (
      <PageLayout size="sm">
        <SectionCard title={t("fieldIncident.done.title")}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="space-y-1">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {t("fieldIncident.done.body")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("fieldIncident.done.evidenceCount", {
                  count: result.evidenceCount,
                })}
              </p>
            </div>
          </div>
        </SectionCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout size="sm">
      <div className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {ingest.apartmentName}
          </p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {ingest.asset.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {/* `roomLocations` lives in the `assets` namespace, not `guest` — this `t` is
                bound to `guest`, so an unqualified key would render the raw key string.
                `defaultValue` keeps a location the catalogue has not translated readable
                rather than blank. */}
            {t(`assets:roomLocations.${ingest.asset.roomLocation}`, {
              defaultValue: ingest.asset.roomLocation,
            })}
          </p>
        </header>

        {ingest.asset.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {ingest.asset.description}
          </p>
        )}

        <SectionCard title={t("fieldIncident.baseline.title")}>
          {/* D19. Renders nothing at all when the backend sent no baseline — the spec's
              "framing reference absent" state is a real state, not an error. */}
          <FieldBaselineReference photos={ingest.baselinePhotos} />
          {ingest.baselinePhotos.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("fieldIncident.baseline.none")}
            </p>
          )}
        </SectionCard>

        <SectionCard title={t("fieldIncident.views.title")}>
          <FieldCaptureList
            requiredTypes={requiredTypes}
            attachedCounts={ingest.attachedEvidenceCounts}
            captures={captures}
            disabled={submitMutation.isPending}
            onCapture={addCapture}
            onRemove={removeCapture}
          />

          {requiredTypes.length === 0 && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t("fieldIncident.views.noneRequired")}
            </p>
          )}

          {/* The gate is "every view the server asked for has been shot". It is written
              over `requiredTypes` — the NARROWED list — and not over the server's raw
              array: gating on a string this portal can never produce would disable the
              button permanently (step 9.1). */}
          {!isComplete && requiredTypes.length > 0 && (
            <p className="mt-4 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("fieldIncident.views.missing")}
            </p>
          )}

          <div className="mt-4">
            <ActionButton
              variant="primary"
              size="md"
              icon={<Send className="h-4 w-4 shrink-0" />}
              label={
                submitMutation.isPending
                  ? t("fieldIncident.submitting")
                  : t("fieldIncident.submit")
              }
              loading={submitMutation.isPending}
              disabled={!isComplete || captures.length === 0}
              onClick={() => submitMutation.mutate()}
            />
          </div>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
