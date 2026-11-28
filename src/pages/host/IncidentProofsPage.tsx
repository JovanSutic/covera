import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { IncidentItemEvidence } from "@/components/host/incident/IncidentItemEvidence";
import { BackLink } from "@/components/shared/BackLink";
import { SectionCard } from "@/components/shared/SectionCard";
import {
  useAssetsWithAccess,
  useIncidentWithAccess,
  useReservationPhotosWithAccess,
  useReservationWithAccess,
} from "@/lib/api/queries/access";
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
 *   1. the claim — the URL param IS the claim id. `Incident` carries `reservationId` but
 *      NOT `apartmentId`, so neither of the other two ids is reachable from this read
 *      alone.
 *   2. the reservation — where `apartmentId` comes from.
 *   3. the assets and the reservation photos — both held until step 2 has resolved.
 *
 * The claim id being in the URL is why this page never performs the list-then-match
 * dance `IncidentPage` needs (there is no incident-by-reservation endpoint, D11).
 *
 * D3/D26: the page has TWO readers, and they are decided here rather than by a route rule —
 * a rule name cannot see a query parameter. A host session reads through the authed hooks; a
 * photographer holding `?accessId=` reads the same four resources through
 * `@/lib/api/queries/access`, which uses `publicApi()` and never `withAuth()`. Capture is live
 * for both (D3): the evidence writes carry the same credential down through
 * `IncidentItemEvidence`.
 */
export default function IncidentProofsPage() {
  const { t } = useTranslation("host");

  const { incidentId } = useRouteParams(appPaths.incidentProofs) as {
    incidentId: string;
  };

  const [searchParams] = useSearchParams();
  const accessId = searchParams.get("accessId");

  /**
   * D3/D11: the `accessId` is the guest's ONLY credential, and it decides which set of reads
   * this page is allowed to make. A guest must never reach `withAuth()` — it sends
   * `Bearer undefined` for a caller with no account and turns a working anonymous read into a
   * 401 (invariant 11). The authed hooks are therefore DISABLED while a link is present,
   * rather than merely unused.
   */
  const isGuest = accessId !== null;

  // 1. The claim — the only entry point into the chain on either path.
  const hostClaim = useIncident(isGuest ? undefined : incidentId);
  const guestClaim = useIncidentWithAccess(isGuest ? incidentId : undefined, accessId);
  const claim = isGuest ? guestClaim.data : hostClaim.data;

  // 2. The stay, where `apartmentId` comes from. Both hooks are always called; the one
  //    belonging to the other reader is disabled, so it issues no request.
  const reservationId = claim?.reservationId;

  const hostReservation = useReservation(isGuest ? undefined : reservationId);
  const guestReservation = useReservationWithAccess(
    isGuest ? reservationId : undefined,
    accessId,
  );
  const reservation = isGuest ? guestReservation.data : hostReservation.data;

  // 3. The apartment's assets (item names) and the stay's own photos (the before strip).
  const apartmentId = reservation?.apartmentId;

  const hostAssets = useAssets(isGuest ? undefined : apartmentId);
  const guestAssets = useAssetsWithAccess(isGuest ? apartmentId : undefined, accessId);
  const assets = isGuest ? guestAssets.data : hostAssets.data;

  const hostReservationPhotos = useReservationPhotos(
    isGuest ? undefined : reservationId,
  );
  const guestReservationPhotos = useReservationPhotosWithAccess(
    isGuest ? reservationId : undefined,
    accessId,
  );
  const reservationPhotos = isGuest
    ? guestReservationPhotos.data
    : hostReservationPhotos.data;

  if (isGuest ? guestClaim.isLoading : hostClaim.isLoading || hostReservation.isLoading) {
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

  /**
   * The two refusals are different sentences, and D5 is why.
   *
   * A guest holding an unusable link gets the link-specific copy: the backend answers
   * `403 SPECIAL_ACCESS_INVALID` for it (probed 2026-11-26), and a link holder has no claim
   * of their own to "not find". A host keeps the existing not-found branch. The bare `!claim`
   * covers the host path's missing claim as it always did, and a guest whose read never ran
   * because the URL carried no id.
   */
  if (!claim || (isGuest && guestClaim.isError) || (!isGuest && hostClaim.isError)) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t(
            isGuest
              ? "incidentProofsPage.invalidLink.title"
              : "incidentProofsPage.notFound.title",
          )}
          subtitle={t(
            isGuest
              ? "incidentProofsPage.invalidLink.subtitle"
              : "incidentProofsPage.notFound.subtitle",
          )}
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
                    owns the before strip above, so none is passed here.

                    D3: `accessId` is threaded through so a guest's upload and delete use
                    `publicApi()` — the same component, the same controls, two credentials. */}
                <IncidentItemEvidence
                  incidentId={claim.id}
                  item={item}
                  accessId={accessId ?? undefined}
                />
              </div>
            </SectionCard>
          );
        })}
      </div>
    </PageLayout>
  );
}
