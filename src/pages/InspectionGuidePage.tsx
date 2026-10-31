import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { ApartmentShotGuide } from "@/components/host/ShotsGuide";
import { BackLink } from "@/components/shared/BackLink";
import { useReservation } from "@/lib/api/queries/reservation";
import { useShots } from "@/lib/api/queries/shots";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import { addClientId } from "@/lib/helpers/uuid";
import {
  submitInspectionPhotos,
  type CapturedApartmentShot,
} from "@/lib/api/submitPhotoProofs";
import { appPaths, buildPath, useRouteParams } from "@/lib/router";

/**
 * D2/D8: the capture flow as a page rather than a dialog.
 *
 * It is NOT under the `host` section and it is NOT public. Both reads it makes
 * come from URL params alone — `reservationId` for the reservation, `apartmentId`
 * for the shots — which is the whole reason D2 keeps `apartmentId` in the pattern:
 * declared that way, both requests start alongside the chunk instead of the shots
 * waiting on the reservation to resolve.
 */
export default function InspectionGuidePage() {
  const { t } = useTranslation("host");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { apartmentId, reservationId } = useRouteParams(
    appPaths.inspectionGuide,
  ) as { apartmentId: string; reservationId: string };

  const {
    data: reservation,
    isLoading: reservationLoading,
    isError: reservationError,
  } = useReservation(reservationId);

  const { data: shots = [], isLoading: shotsLoading } = useShots(apartmentId);

  const preparedShots = useMemo(() => addClientId(shots), [shots]);

  const reservationPath = buildPath(appPaths.hostReservation, {
    id: apartmentId,
    reservationId,
  });

  const submitMutation = useMutation({
    mutationFn: (completedShots: CapturedApartmentShot[]) =>
      submitInspectionPhotos({
        apartmentId,
        reservationId,
        shots: completedShots,
      }),
    onSuccess: () => {
      // The same pair the reservation page's own actions invalidate: the detail
      // entry (which now reads COVERED) and the list that shows its status chip.
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_ID, reservationId],
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });
      toast.success(t("inspectionGuidePage.toast.submitSuccess"));
      // D17's destination: the reservation the proofs belong to, which now renders
      // the "already submitted" state and the photo control.
      navigate(reservationPath);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.message || t("inspectionGuidePage.toast.submitError"),
      );
    },
  });

  const backToReservation = (
    <BackLink
      to={appPaths.hostReservation}
      params={{ id: apartmentId, reservationId }}
      label={t("inspectionGuidePage.backToReservation")}
    />
  );

  if (reservationLoading || shotsLoading) {
    return (
      <PageLayout size="lg">
        <PageTitle title={t("inspectionGuidePage.title")} />
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
          {t("inspectionGuidePage.loading")}
        </div>
      </PageLayout>
    );
  }

  if (reservationError || !reservation) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("inspectionGuidePage.notFound.title")}
          subtitle={t("inspectionGuidePage.notFound.subtitle")}
        />
        {backToReservation}
      </PageLayout>
    );
  }

  // The refusal is explicit, not a silent redirect (the decisions file's "States"
  // section asks for exactly this). Invariant 9: the answer is the helper's, so the
  // page that refuses and the button that offered can never disagree.
  const window = getProofWindowState(reservation, Date.now());

  if (!window.canTakeShots) {
    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("inspectionGuidePage.unavailable.title")}
          subtitle={t(
            window.state === "ALREADY_SUBMITTED"
              ? "inspectionGuidePage.unavailable.alreadySubmitted"
              : window.state === "EXPIRED"
                ? "inspectionGuidePage.unavailable.expired"
                : window.state === "NOT_STARTED"
                  ? "inspectionGuidePage.unavailable.notStarted"
                  : "inspectionGuidePage.unavailable.tooEarly",
          )}
        />
        {backToReservation}
      </PageLayout>
    );
  }

  return (
    <PageLayout size="lg">
      <PageTitle
        title={t("inspectionGuidePage.title")}
        subtitle={t("inspectionGuidePage.subtitle", {
          guestName: reservation.guestName,
        })}
      />

      <div className="mb-6">{backToReservation}</div>

      {/* Unchanged from the dialog it replaces: same component, same props. The
          flow needed no rewrite, only a URL. */}
      <ApartmentShotGuide
        initialShots={preparedShots}
        isSubmitting={submitMutation.isPending}
        onSubmit={(completedShots) => submitMutation.mutate(completedShots)}
      />
    </PageLayout>
  );
}
