import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import Typography from "@/components/Typography";
import { ReservationHeaderActions } from "@/components/host/ReservationHeaderActions";
import { ReservationTimeSection } from "@/components/host/ReservationTimeSection";
import { ReservationProofSection } from "@/components/host/ReservationProofSection";
import { useReservation } from "@/lib/api/queries/reservation";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import { appPaths, buildPath, useRouteParams } from "@/lib/router";

export default function ReservationPage() {
  const { t } = useTranslation("host");
  const navigate = useNavigate();

  const { id, reservationId } = useRouteParams(appPaths.hostReservation) as {
    id: string;
    reservationId: string;
  };

  const { data: reservation, isLoading, isError } = useReservation(reservationId);

  const apartmentPath = buildPath(appPaths.hostApartment, { id });

  const backToApartment = (
    <button
      type="button"
      onClick={() => navigate(apartmentPath)}
      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors"
    >
      {t("reservationPage.backToApartment")}
    </button>
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
        {backToApartment}
      </PageLayout>
    );
  }

  // Invariant 9: the ONE computation of the window. `now` is captured once per
  // render, exactly as the inline table cell did, and both consumers read this
  // same value — the time section's editability and the proof section's action.
  const now = Date.now();
  const window = getProofWindowState(reservation, now);

  return (
    <PageLayout size="lg">
      <PageTitle
        title={reservation.guestName}
        subtitle={t("reservationPage.subtitle", {
          checkIn: new Date(reservation.checkInDatetime).toLocaleDateString(),
        })}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        {backToApartment}
        <ReservationHeaderActions
          reservation={reservation}
          apartmentId={id}
          // D17: the page this action is standing on is gone once the reservation
          // is, so the apartment is the only destination that still exists.
          onDeleted={() => navigate(apartmentPath)}
        />
      </div>

      <div className="space-y-6">
        <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900">
          <Typography type="h3" className="mb-4">
            {t("reservationPage.guest.title")}
          </Typography>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("reservationPage.guest.name")}
              </dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {reservation.guestName}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t("reservationPage.guest.email")}
              </dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {reservation.guestEmail || t("reservationPage.notAvailable")}
              </dd>
            </div>
          </dl>
        </section>

        <ReservationTimeSection
          reservationId={reservation.id}
          apartmentId={reservation.apartmentId}
          checkInDatetime={reservation.checkInDatetime}
          checkOutDatetime={reservation.checkOutDatetime}
          alternativeCheckInDatetime={reservation.alternativeCheckInDatetime}
          alternativeCheckOutDatetime={reservation.alternativeCheckOutDatetime}
          // Editing is refused once the effective check-in has passed — the
          // helper's own value, not a second derivation.
          canEdit={window.checkInTime !== null && window.checkInTime > now}
        />

        <ReservationProofSection
          reservation={reservation}
          onTakeProofs={() =>
            navigate(
              buildPath(appPaths.inspectionGuide, {
                apartmentId: id,
                reservationId,
              }),
            )
          }
        />

        <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900">
          <Typography type="h3" className="mb-4">
            {t("reservationPage.other.title")}
          </Typography>

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
                  hours: window.windowHours,
                })}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </PageLayout>
  );
}
