/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileWarning, Plus } from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { ActionButton } from "@/components/shared/ActionButton";
import { BackLink } from "@/components/shared/BackLink";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusChip } from "@/components/shared/StatusChip";
import { AddIncidentItemForm } from "@/components/host/incident/AddIncidentItemForm";
import { IncidentItemList } from "@/components/host/incident/IncidentItemList";
import { createIncident } from "@/lib/api/incidentClaims";
import { useIncident, incidentQueryKey } from "@/lib/api/queries/incident";
import { useIncidents, incidentsQueryKey } from "@/lib/api/queries/incidents";
import { useReservation } from "@/lib/api/queries/reservation";
import {
  claimStatusCopy,
  findIncidentForReservation,
  isIncidentEditable,
} from "@/lib/helpers/claimStatus";
import { appPaths, useRouteParams } from "@/lib/router";
import type { IncidentWithItems } from "@/api/generated/requests/types.gen";

/**
 * The claim page. The spec's rows 2 and 3 are this page; phase 8 adds the filing panel
 * that is row 4.
 *
 * The read order is forced by the API:
 *
 *   1. `useIncidents({ apartmentId })` — the apartment's claim list. There is NO
 *      incident-by-reservation endpoint (D11), so this is the only way to learn whether
 *      this reservation has a claim.
 *   2. `findIncidentForReservation` — phase 1's helper picks it out. Both host surfaces
 *      call it, so they cannot match differently.
 *   3. `useIncident(listed?.id)` — the detail, which is what carries `items`. It stays
 *      disabled until step 1 resolves, because the id is not in the URL.
 *
 * `claim = detail ?? listed`: the list's `IncidentWithItems` already has items, so the
 * page paints from the list immediately and refines once the detail lands. The detail is
 * still worth reading — it is the key the item writes invalidate (invariant 7).
 */
export default function IncidentPage() {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();

  const { id, reservationId } = useRouteParams(appPaths.incidentClaim) as {
    id: string;
    reservationId: string;
  };

  const {
    data: reservation,
    isLoading: isReservationLoading,
    isError: isReservationError,
  } = useReservation(reservationId);

  // D14: page 1, limit 100, `createdAt desc`. An apartment with more than 100 claims
  // could hide an older one — recorded as a PR deviation.
  const {
    data: incidentsPage,
    isLoading: isListLoading,
    isError: isListError,
  } = useIncidents({ apartmentId: id });

  const listed = findIncidentForReservation<IncidentWithItems>(
    incidentsPage?.data ?? [],
    reservationId,
  );

  const { data: detail } = useIncident(listed?.id);

  const claim = detail ?? listed ?? null;

  const createMutation = useMutation({
    mutationFn: () => createIncident(reservationId),
    onSuccess: (created) => {
      if (created) {
        // Seed the detail key so the page does not flash its "no claim" state on the
        // way back from the create call.
        queryClient.setQueryData(incidentQueryKey(created.id), created);
      }

      queryClient.invalidateQueries({
        queryKey: incidentsQueryKey({ apartmentId: id }),
      });

      toast.success(t("incidentPage.toasts.created"));
    },
    // D33: the backend's own sentence, not a `code` switch.
    onError: (error: any) => {
      toast.error(error?.error?.message || t("incidentPage.toasts.createError"));
    },
  });

  if (isReservationLoading || isListLoading) {
    return (
      <PageLayout size="lg">
        <PageTitle title={t("incidentPage.title")} />
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-gray-100" />
          {t("incidentPage.loading")}
        </div>
      </PageLayout>
    );
  }

  // One branch for "no reservation": an unknown id and one this host cannot read are the
  // same thing to a host — a link that does not work.
  if (isReservationError || !reservation) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("incidentPage.notFound.title")}
          subtitle={t("incidentPage.notFound.subtitle")}
        />
      </PageLayout>
    );
  }

  const editable = claim !== null && isIncidentEditable(claim);
  const claimedAssetIds = claim?.items.map((item) => item.assetId) ?? [];

  return (
    <PageLayout size="lg">
      <div className="space-y-6">
        <BackLink
          to={appPaths.hostReservation}
          params={{ id, reservationId }}
          label={t("incidentPage.backToReservation")}
        />

        <PageTitle
          title={t("incidentPage.title")}
          subtitle={reservation.guestName}
        />

        {isListError && !claim && (
          <SectionCard title={t("incidentPage.title")}>
            <p className="text-sm text-rose-500 dark:text-rose-400">
              {t("incidentPage.listError")}
            </p>
          </SectionCard>
        )}

        {!isListError && !claim && (
          <SectionCard title={t("incidentPage.empty.title")}>
            <div className="flex items-start gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("incidentPage.empty.body")}
              </p>
            </div>

            {/* The backend enforces one incident per reservation, so this state means
                CREATE, not choose. A second attempt is refused with
                INCIDENT_ALREADY_EXISTS, and the toast carries that sentence. */}
            <div className="mt-4">
              <ActionButton
                variant="primary"
                size="md"
                icon={<Plus className="h-4 w-4 shrink-0" />}
                label={t("incidentPage.empty.create")}
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              />
            </div>
          </SectionCard>
        )}

        {claim && (
          <>
            <SectionCard
              title={t("incidentPage.items.title")}
              action={
                <StatusChip
                  tone={claimStatusCopy(claim.status).tone}
                  label={t(claimStatusCopy(claim.status).labelKey)}
                />
              }
            >
              <IncidentItemList items={claim.items} />
            </SectionCard>

            {/* The add form is offered only while the claim is editable (phase 1's
                `isIncidentEditable`) — past filing the backend refuses an item write, so
                showing the form would be showing an action that cannot succeed. */}
            {editable && (
              <SectionCard title={t("incidentPage.addItem.title")}>
                <AddIncidentItemForm
                  apartmentId={id}
                  incidentId={claim.id}
                  claimedAssetIds={claimedAssetIds}
                />
              </SectionCard>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}