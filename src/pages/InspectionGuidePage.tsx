import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PageLayout from "@/components/layout/PageLayout";
import PageTitle from "@/components/PageTitle";
import { InspectionGuideFlow } from "@/components/host/guide/InspectionGuideFlow";
import { ReservationPhotoGallery } from "@/components/host/ReservationPhotoGallery";
import { BackLink } from "@/components/shared/BackLink";
import { SectionCard } from "@/components/shared/SectionCard";
import { useReservation } from "@/lib/api/queries/reservation";
import { useShots } from "@/lib/api/queries/shots";
import { PREFETCH_STALE_TIME_MS } from "@/lib/api/queries/shared";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import {
  fetchReservationPhotosWithAccess,
  fetchReservationWithAccess,
  fetchShotsWithAccess,
} from "@/lib/api/specialAccess";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import { addClientId } from "@/lib/helpers/uuid";
import {
  submitInspectionPhotos,
  type CapturedApartmentShot,
} from "@/lib/api/submitPhotoProofs";
import { appPaths, buildPath, useRouteParams } from "@/lib/router";
import { withLang } from "@/lib/router/lang";

/**
 * D2/D8: the capture flow as a page rather than a dialog.
 *
 * It is NOT under the `host` section: the section carries `canOpenHost` as a rule
 * every child inherits, so a guide nested there could only ever be host-only.
 *
 * D38 (feature/54): the route is `public`, because a host-appointed photographer
 * holding an access link has no account. The page decides between its two readers
 * itself — a host session reads through the authed hooks, an `?accessId=` link reads
 * through the access-aware fetchers (D26; a rule name cannot see a query parameter).
 *
 * The two host reads come from URL params alone — `reservationId` for the reservation,
 * `apartmentId` for the shots — which is the whole reason D2 keeps `apartmentId` in the
 * pattern: declared that way, both requests start alongside the chunk instead of the
 * shots waiting on the reservation to resolve.
 */

/**
 * D36/D37: the guest's three reads, defined HERE rather than in a query module, for a
 * structural reason. `queries/manifest.ts` throws at load if a `use…` export does not
 * resolve to a resource registered in `QUERY_RESOURCES`, and these cannot be registered:
 * a `ResourceDefinition`'s key is computed from route params and cannot see a query
 * parameter. A page is not a query module, so nothing inspects its hook names, and
 * `prefetchCoverage.test.ts` only compares a page's imports *from registered modules* —
 * a locally-defined hook is invisible to it.
 */
function useReservationWithAccess(
  reservationId: string | undefined,
  accessId: string | null,
) {
  return useQuery({
    // The accessId is IN the key: two different links must not read each other's cache, and
    // neither may share an entry with the authed `reservationQueryKey`.
    queryKey: [
      ...QUERY_ACTIONS.RESERVATIONS_GET_ID,
      "access",
      accessId ?? "",
      reservationId ?? "",
    ],
    queryFn: ({ signal }) =>
      fetchReservationWithAccess(reservationId!, accessId!, signal),
    enabled: Boolean(reservationId) && Boolean(accessId),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

function useShotsWithAccess(
  apartmentId: string | undefined,
  accessId: string | null,
) {
  return useQuery({
    queryKey: [
      ...QUERY_ACTIONS.APARTMENT_SHOTS_GET_BY_APARTMENT,
      "access",
      accessId ?? "",
      apartmentId ?? "",
    ],
    queryFn: ({ signal }) => fetchShotsWithAccess(apartmentId!, accessId!, signal),
    enabled: Boolean(apartmentId) && Boolean(accessId),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

function useReservationPhotosWithAccess(
  reservationId: string | undefined,
  accessId: string | null,
) {
  return useQuery({
    queryKey: [
      ...QUERY_ACTIONS.RESERVATIONS_GET_PHOTOS,
      "access",
      accessId ?? "",
      reservationId ?? "",
    ],
    queryFn: ({ signal }) =>
      fetchReservationPhotosWithAccess(reservationId!, accessId!, signal),
    enabled: Boolean(reservationId) && Boolean(accessId),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export default function InspectionGuidePage() {
  const { t, i18n } = useTranslation("host");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { apartmentId, reservationId } = useRouteParams(
    appPaths.inspectionGuide,
  ) as { apartmentId: string; reservationId: string };

  const [searchParams] = useSearchParams();
  const accessId = searchParams.get("accessId");

  /**
   * D38: the accessId is the guest's ONLY credential, and it decides which set of reads
   * this page is allowed to make. A guest must never reach `withAuth()` — it sends
   * `Bearer undefined` for a caller with no account and turns a working anonymous read
   * into a 401 (invariant 8). The host hooks are therefore disabled while a link is
   * present, rather than merely unused.
   */
  const isGuest = accessId !== null;

  const {
    data: reservation,
    isLoading: reservationLoading,
    isError: reservationError,
  } = useReservation(isGuest ? undefined : reservationId);

  const { data: shots = [], isLoading: shotsLoading } = useShots(
    isGuest ? undefined : apartmentId,
  );

  const guestReservation = useReservationWithAccess(
    isGuest ? reservationId : undefined,
    accessId,
  );
  const guestShots = useShotsWithAccess(isGuest ? apartmentId : undefined, accessId);
  const guestPhotos = useReservationPhotosWithAccess(
    isGuest ? reservationId : undefined,
    accessId,
  );

  const preparedShots = useMemo(() => addClientId(shots), [shots]);

  const reservationPath = withLang(
    buildPath(appPaths.hostReservation, {
      id: apartmentId,
      reservationId,
    }),
    i18n.language,
  );

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
      // D28: the shots are read under this key, and the eager count phase 4 renders
      // comes from it. Without this the host returns to a stale "no photos captured
      // yet" — exactly the bug prep §4 asks to fix.
      queryClient.invalidateQueries({
        queryKey: [
          ...QUERY_ACTIONS.INSPECTION_GET_BY_ID,
          reservation?.inspection?.id ?? "",
        ],
      });
      toast.success(t("inspectionGuidePage.toast.submitSuccess"));
      // D17's destination: the reservation the proofs belong to, which now renders
      // the "already submitted" state and the photo control.
      navigate(reservationPath);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("inspectionGuidePage.toast.submitError"),
      );
    },
  });

  /**
   * D38/D39: the guest branch. It returns BEFORE the host path's loading, error and
   * proof-window branches, and it renders no control that cannot succeed:
   *
   * - No submit. The submit path is three calls (`photos/upload-tokens`,
   *   `photos/confirm`, `PATCH /reservations`) that all reject an access link (probed
   *   2026-11-23), so `submitMutation` is unreachable from here by construction — the
   *   flow that owns it is never rendered.
   * - No proof-window gate. The window asks "may proofs be taken", which is the host's
   *   question; a guest reading an already-submitted stay must still be able to look.
   */
  if (isGuest) {
    if (guestReservation.isLoading) {
      return (
        <PageLayout size="lg">
          <PageTitle title={t("inspectionGuidePage.title")} />
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-gray-100" />
            {t("inspectionGuidePage.loading")}
          </div>
        </PageLayout>
      );
    }

    // The backend answers an unknown or expired accessId with a `500`, not the
    // documented `403 SPECIAL_ACCESS_INVALID` (spec §Behaviour, defect 1). The copy is
    // therefore the page's own "could not be read" state: it does not claim the link is
    // invalid, because the server did not say that (D45).
    if (guestReservation.isError || !guestReservation.data) {
      return (
        <PageLayout size="lg">
          <PageTitle
            title={t("inspectionGuidePage.notFound.title")}
            subtitle={t("inspectionGuidePage.notFound.subtitle")}
          />
        </PageLayout>
      );
    }

    const guestShotsList = guestShots.data ?? [];
    const guestPhotoList = guestPhotos.data ?? [];

    return (
      <PageLayout size="lg">
        <PageTitle
          title={t("inspectionGuidePage.title")}
          subtitle={t("inspectionGuidePage.subtitle", {
            guestName: guestReservation.data.guestName,
          })}
        />

        {/* D39: the honest statement of what this reader may do. The submit belongs to
            the host, so the guest is told that rather than left hunting for a button. */}
        <p className="mb-6 rounded-xl bg-blue-50 p-3.5 text-sm leading-relaxed text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          {t("inspectionGuidePage.guest.readOnly")}
        </p>

        <div className="space-y-6">
          {/* The shot plan: what the stay's proofs consist of. Read-only — the guest is
              collecting them for the host, not editing the apartment's configuration. */}
          <SectionCard title={t("assets:shotGuide.strip.ariaLabel")}>
            {guestShotsList.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("assets:shotGuide.noShots")}
              </p>
            ) : (
              <ul className="space-y-2">
                {guestShotsList.map((shot) => (
                  <li
                    key={shot.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {shot.title}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                      {t(`assets:roomLocations.${shot.roomLocation}`, {
                        defaultValue: shot.roomLocation,
                      })}{" "}
                      ·{" "}
                      {t(`assets:shotGuide.shotTypes.${shot.shotType}`, {
                        defaultValue: shot.shotType,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* The before photos, rendered by the same read-only gallery the host's own
              reservation page uses (`mode="host"`), so a guest and a host looking at the
              same proofs see the same thing. */}
          <SectionCard title={t("incidentProofsPage.before.title")}>
            {guestPhotoList.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("reservationPage.proof.photosEmpty")}
              </p>
            ) : (
              <ReservationPhotoGallery shots={guestPhotoList} />
            )}
          </SectionCard>
        </div>
      </PageLayout>
    );
  }

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

      {/* Phase 5: the flow is now composed from src/components/host/guide/. The page's
          own responsibilities — the two reads, the window gate, the mutation, the
          toasts, the three invalidations, the back link — are unchanged, and so is the
          prop boundary: the flow takes the shots, the pending flag and the submit
          callback, and nothing else. */}
      <InspectionGuideFlow
        initialShots={preparedShots}
        isSubmitting={submitMutation.isPending}
        onSubmit={(completedShots) => submitMutation.mutate(completedShots)}
      />
    </PageLayout>
  );
}
