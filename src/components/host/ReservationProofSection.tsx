import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  TriangleAlert,
} from "lucide-react";

import Typography from "@/components/Typography";
import { useInspection } from "@/lib/api/queries/inspection";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import type { DetailedInspection } from "@/api/generated/requests/types.gen";
import type { ReservationWithInspection } from "@/api/generated/requests/types.gen";
import { ReservationPhotoGallery } from "./ReservationPhotoGallery";

interface ReservationProofSectionProps {
  reservation: ReservationWithInspection;
  onTakeProofs: () => void;
}

/**
 * D10: the coverage photos are read ONLY when the host opens the control.
 * `ReservationProofPhotos` is a separate component so the `useInspection` call
 * lives BELOW the open/closed boundary — it cannot mount, and therefore cannot
 * request, until the control is opened. The route declares the `inspection`
 * resource with `params: () => null`, so the prefetch starts nothing either: the
 * two halves of "never fetched on page load".
 *
 * The window answer comes from the helper, never from arithmetic here
 * (invariant 9). This is the one action whose availability is that answer.
 */
export function ReservationProofSection({
  reservation,
  onTakeProofs,
}: ReservationProofSectionProps) {
  const { t } = useTranslation("host");
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);

  const window = getProofWindowState(reservation, Date.now());
  const status = reservation.status ?? "PENDING_PROOF";

  const statusIcon =
    status === "COVERED" ? (
      <CheckCircle2 className="w-3.5 h-3.5" />
    ) : window.state === "EXPIRED" || window.state === "NOT_STARTED" ? (
      <TriangleAlert className="w-3.5 h-3.5" />
    ) : (
      <Clock className="w-3.5 h-3.5" />
    );

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900">
      <Typography type="h3" className="mb-4">
        {t("reservationPage.proof.title")}
      </Typography>

      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          status === "COVERED"
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        }`}
      >
        {statusIcon}
        {t(`apartmentReservationsManager.status.${status}`, {
          defaultValue: status.replace(/_/g, " "),
        })}
      </span>

      <div className="mt-4">
        {window.canTakeShots ? (
          <button
            type="button"
            onClick={onTakeProofs}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/70 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            {t("reservationPage.proof.takeProofs")}
          </button>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {window.state === "ALREADY_SUBMITTED" &&
              t("reservationPage.proof.alreadySubmitted")}
            {window.state === "TOO_EARLY" &&
              t("reservationPage.proof.tooEarly", {
                windowHours: window.windowHours,
                hoursUntilWindow: window.hoursUntilWindow,
              })}
            {window.state === "EXPIRED" && t("reservationPage.proof.expired")}
            {window.state === "NOT_STARTED" &&
              t("reservationPage.proof.notStarted")}
          </p>
        )}
      </div>

      {/* The collapsed photo control. Rendered only when an inspection exists —
          without one there is nothing to show, and a disabled control would be a
          dead affordance. */}
      {reservation.inspection?.id && (
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setIsPhotosOpen((open) => !open)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer transition-colors"
          >
            {isPhotosOpen ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {isPhotosOpen
              ? t("reservationPage.proof.hidePhotos")
              : t("reservationPage.proof.showPhotos")}
          </button>

          {isPhotosOpen && (
            <ReservationProofPhotos inspectionId={reservation.inspection.id} />
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Mounted only when the control is open (D10) — the whole reason this is a child
 * component rather than an `enabled` flag on a hook called above it.
 */
function ReservationProofPhotos({ inspectionId }: { inspectionId: string }) {
  const { t } = useTranslation("host");
  const { data, isLoading, isError } = useInspection(inspectionId);

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
        {t("reservationPage.proof.photosLoading")}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="mt-4 text-sm text-rose-500 dark:text-rose-400">
        {t("reservationPage.proof.photosError")}
      </p>
    );
  }

  // `GetInspectionsByIdResponse` is `Inspection | DetailedInspection`, and plain
  // `Inspection` has no `shots` field at all — so the narrow is required, not
  // decorative. `InspectionPage.tsx` performs the same one.
  const shots = (data as DetailedInspection | undefined)?.shots ?? [];

  if (shots.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {t("reservationPage.proof.photosEmpty")}
      </p>
    );
  }

  return <ReservationPhotoGallery shots={shots} />;
}
