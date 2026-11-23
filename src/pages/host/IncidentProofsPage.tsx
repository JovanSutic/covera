import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { IncidentItemEvidence } from "@/components/host/incident/IncidentItemEvidence";
import { BackLink } from "@/components/shared/BackLink";
import { SectionCard } from "@/components/shared/SectionCard";
import { useAssets } from "@/lib/api/queries/assets";
import { useIncident } from "@/lib/api/queries/incident";
import { useReservation } from "@/lib/api/queries/reservation";
import { useReservationPhotos } from "@/lib/api/queries/reservationPhotos";
import { assetBeforePhotos } from "@/lib/helpers/assetBeforePhotos";
import { appPaths, useRouteParams } from "@/lib/router";
import type { IncidentItem } from "@/api/generated/requests/types.gen";

/**
 * D25/D26 (feature/54): the claim's proof page. Prep 3 moves photo capture off the
 * claim page and onto this one, so the claim page can be display-only.
 *
 * The read order is forced by the API and cannot be shortened:
 *
 *   1. `useIncident(incidentId)` — the URL param IS the claim id. `Incident` carries
 *      `reservationId` but NOT `apartmentId`, so neither of the other two ids is
 *      reachable from this read alone.
 *   2. `useReservation(claim.reservationId)` — where `apartmentId` comes from.
 *   3. `useAssets(apartmentId)` and `useReservationPhotos(reservationId)` — both held
 *      until step 2 has resolved.
 *
 * The claim id being in the URL is why this page never performs the list-then-match
 * dance `IncidentPage` needs (there is no incident-by-reservation endpoint, D11).
 *
 * The guest branch is checked FIRST, before the claim read's state branches, so a
 * visitor holding an access link sees the refusal immediately rather than a spinner
 * that cannot resolve — no `/incidents` endpoint accepts `?accessId=` (probed
 * 2026-11-23), so their claim read would never return anything.
 */
export default function IncidentProofsPage() {
  const { t } = useTranslation("host");

  const { incidentId } = useRouteParams(appPaths.incidentProofs) as {
    incidentId: string;
  };

  const [searchParams] = useSearchParams();
  const accessId = searchParams.get("accessId");

  const {
    data: claim,
    isLoading: isClaimLoading,
    isError: isClaimError,
  } = useIncident(incidentId);

  const {
    data: reservation,
    isLoading: isReservationLoading,
  } = useReservation(claim?.reservationId);

  const { data: assets } = useAssets(reservation?.apartmentId);
  const { data: reservationPhotos } = useReservationPhotos(reservation?.id);

  // D31: the honest state for a guest. The route accepts `?accessId=` so the URL shape
  // stays stable for when the backend lands, but no read on this page can be made with
  // it, so the page says so instead of pretending to load. Rendered before any of the
  // reads above can matter — and, because none of them is enabled without an id, this
  // branch makes no anonymous request on the guest's behalf (invariant 8).
  if (accessId) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("incidentProofsPage.guestUnavailable.title")}
          subtitle={t("incidentProofsPage.guestUnavailable.body")}
        />
      </PageLayout>
    );
  }

  if (isClaimLoading || isReservationLoading) {
    return (
      <PageLayout size="lg">
        <PageTitle title={t("incidentProofsPage.title")} />
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-gray-100" />
          {t("incidentProofsPage.loading")}
        </div>
      </PageLayout>
    );
  }

  if (isClaimError || !claim) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("incidentProofsPage.notFound.title")}
          subtitle={t("incidentProofsPage.notFound.subtitle")}
        />
      </PageLayout>
    );
  }

  // The reservation is only for `apartmentId` and the before photos; a claim whose
  // reservation read failed still has items worth showing.
  const assetNames = new Map(
    (assets ?? []).map((asset) => [asset.id, asset.name]),
  );

  return (
    <PageLayout size="lg">
      <div className="space-y-6">
        <BackLink
          to={appPaths.hostReservation}
          params={{ id: reservation?.apartmentId ?? "", reservationId: claim.reservationId }}
          label={t("incidentProofsPage.backToClaim")}
        />

        <PageTitle
          title={t("incidentProofsPage.title")}
          subtitle={t("incidentProofsPage.subtitle")}
        />

        {claim.items.length === 0 && (
          <SectionCard title={t("incidentProofsPage.title")}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("incidentProofsPage.empty")}
            </p>
          </SectionCard>
        )}

        {claim.items.map((item: IncidentItem) => {
          const before = assetBeforePhotos(reservationPhotos, item.assetId);

          return (
            <SectionCard
              key={item.id}
              title={assetNames.get(item.assetId) ?? item.asset.name}
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("incidentProofsPage.before.title")}
                </p>

                {before.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("incidentProofsPage.before.none")}
                  </p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {before.map((photo) => (
                      <li
                        key={photo.id}
                        className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <img
                          src={`${import.meta.env.VITE_R2_IMAGE_URL}/${photo.storageKey}`}
                          alt={t("incidentProofsPage.before.title")}
                          className="h-16 w-16 object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("incidentProofsPage.slots.title")}
                </p>

                {/* D30: the capture seam is reused, not reimplemented. WITHOUT `readOnly`:
                    this is the page where capture and delete are live (prep 3). The page
                    owns the before strip above, so none is passed here. */}
                <IncidentItemEvidence incidentId={claim.id} item={item} />
              </div>
            </SectionCard>
          );
        })}
      </div>
    </PageLayout>
  );
}
