import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { ReservationHeader } from "@/components/host/ReservationHeader";
import { ReservationActionsBar } from "@/components/host/ReservationActionsBar";
import { ReservationTimeSection } from "@/components/host/ReservationTimeSection";
import { ReservationProofSection } from "@/components/host/ReservationProofSection";
import { ReservationIncidentSection } from "@/components/host/incident/ReservationIncidentSection";
import { ReservationLinksSection } from "@/components/host/ReservationLinksSection";
import { CopyMessageSection } from "@/components/shared/CopyMessageSection";
import { SectionCard } from "@/components/shared/SectionCard";
import { useApartmentsHost } from "@/lib/api/queries/apartment";
import { useReservation } from "@/lib/api/queries/reservation";
import { absoluteUrl } from "@/lib/helpers/absoluteUrl";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import { appPaths, buildPath, useRouteParams } from "@/lib/router";
import { withLang } from "@/lib/router/lang";

export default function ReservationPage() {
  const { t, i18n } = useTranslation("host");
  const navigate = useNavigate();

  const { id, reservationId } = useRouteParams(appPaths.hostReservation) as {
    id: string;
    reservationId: string;
  };

  const { data: reservation, isLoading, isError } = useReservation(reservationId);

  // D15: matched from the section's already-prefetched list. No new request — the
  // `host` route group declares `apartmentsHost`, and prefetchCoverage credits the
  // chain, so this adds no gap.
  const { data: apartments } = useApartmentsHost();
  const apartment = apartments?.find((entry) => entry.id === reservation?.apartmentId);

  const apartmentPath = withLang(
    buildPath(appPaths.hostApartment, { id }),
    i18n.language,
  );

  if (isLoading) {
    return (
      <PageLayout size="lg">
        <PageTitle title={t("reservationPage.title")} />
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
          {t("reservationPage.loading")}
        </div>
      </PageLayout>
    );
  }

  // One branch for "no reservation": an unknown id and a reservation the caller
  // cannot read are the same thing to a host — a link that does not work.
  if (isError || !reservation) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("reservationPage.notFound.title")}
          subtitle={t("reservationPage.notFound.subtitle")}
        />
      </PageLayout>
    );
  }

  // Invariant 9: the ONE computation of the window. `now` is captured once per
  // render, exactly as the inline table cell did, and both consumers read this
  // same value — the time section's editability and the proof section's action.
  const now = Date.now();
  const proofWindow = getProofWindowState(reservation, now);

  return (
    <PageLayout size="lg">
      {/* Prep §3. The back link, the guest's name and email, the check-in and the
          apartment's name and address are all in here, which is why there is no
          `PageTitle` and no Guest section any more (D16) — `PageTitle` would render
          the guest name a second time, and a guest opening a shared link has no
          other way to know which apartment the reservation is for. */}
      <div className="space-y-6">
        <ReservationHeader reservation={reservation} apartment={apartment} />

        {/* D17: a toolbar above the sections, not a SectionCard. Prep §3 puts the
            general actions before every section, and a heading on a row of buttons
            would make the first thing on the page read as content. */}
        <ReservationActionsBar
          reservation={reservation}
          apartmentId={id}
          inspectionId={reservation.inspection?.id ?? null}
          // D17: the page this action is standing on is gone once the reservation
          // is, so the apartment is the only destination that still exists.
          onDeleted={() => navigate(apartmentPath)}
        />

        <ReservationLinksSection
          reservationId={reservationId}
          apartmentId={id}
        />

        <ReservationProofSection
          reservation={reservation}
          window={proofWindow}
          onTakeProofs={() =>
            navigate(
              withLang(
                buildPath(appPaths.inspectionGuide, {
                  apartmentId: id,
                  reservationId,
                }),
                i18n.language,
              ),
            )
          }
        />

        {/* The guest message, shown in place rather than behind a popover. It renders
            only when the guest inspection link exists — without a link there is nothing
            to send, so the section is absent rather than empty. The text is the same
            `guestInspectionMessage.messageTemplate` the table's kebab popover copies. */}
        {reservation.inspection?.id && (
          <CopyMessageSection
            title={t("reservationPage.guestMessage.title")}
            message={t("guestInspectionMessage.messageTemplate", {
              guestName: reservation.guestName,
              // Prep 4a: absolute, because the host pastes this into a message. The same
              // helper the table's popover uses, so the two cannot disagree.
              guestInspectionUrl: absoluteUrl(
                buildPath(appPaths.inspection, {
                  id: reservation.inspection.id,
                }),
                window.location.origin,
              ),
            })}
            copyLabel={t("guestInspectionMessage.copyButton")}
            copySuccess={t("guestInspectionMessage.toastCopySuccess")}
            copyError={t("guestInspectionMessage.toastCopyError")}
            hint={t("reservationPage.guestMessage.hint")}
            rows={6}
          />
        )}

        {/* D2: a compact status report that links to the claim page — the guidance
            copy lives there. `now` is the page's own single clock (D46), and the two
            ids come from the URL, which is also where the section's list read is
            keyed from. */}
        <ReservationIncidentSection
          apartmentId={id}
          reservationId={reservationId}
          now={now}
          checkOutDatetime={reservation.checkOutDatetime}
          alternativeCheckOutDatetime={reservation.alternativeCheckOutDatetime}
          onOpenClaim={() =>
            navigate(
              withLang(
                buildPath(appPaths.incidentClaim, { id, reservationId }),
                i18n.language,
              ),
            )
          }
        />

        <ReservationTimeSection
          reservationId={reservation.id}
          apartmentId={reservation.apartmentId}
          checkInDatetime={reservation.checkInDatetime}
          checkOutDatetime={reservation.checkOutDatetime}
          alternativeCheckInDatetime={reservation.alternativeCheckInDatetime}
          alternativeCheckOutDatetime={reservation.alternativeCheckOutDatetime}
          // Editing is refused once the effective check-in has passed — the
          // helper's own value, not a second derivation.
          canEdit={proofWindow.checkInTime !== null && proofWindow.checkInTime > now}
        />

        <SectionCard title={t("reservationPage.other.title")}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("reservationPage.other.platformId")}
              </dt>
              <dd className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                {reservation.platformReservationId ||
                  t("reservationPage.notAvailable")}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("reservationPage.other.createdAt")}
              </dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {new Date(reservation.createdAt).toLocaleString()}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("reservationPage.other.proofWindow")}
              </dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {t("reservationPage.other.proofWindowValue", {
                  hours: proofWindow.windowHours,
                })}
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </PageLayout>
  );
}
