import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  TriangleAlert,
} from "lucide-react";

import { Modal } from "@/components/Modal";
import { ActionButton } from "@/components/shared/ActionButton";
import { SectionCard } from "@/components/shared/SectionCard";
import { useReservationPhotos } from "@/lib/api/queries/reservationPhotos";
import { proofStatusCopy, summarizeShotProofs } from "@/lib/helpers/proofSummary";
import { cn } from "@/lib/utils";
import type { ProofStatusTone } from "@/lib/helpers/proofSummary";
import type { ProofWindowState } from "@/lib/helpers/proofWindow";
import type { ReservationWithInspection } from "@/api/generated/requests/types.gen";
import { ReservationPhotoGallery } from "./ReservationPhotoGallery";

interface ReservationProofSectionProps {
  reservation: ReservationWithInspection;
  /** The page's single `getProofWindowState` answer (invariant 9) — not recomputed here. */
  window: ProofWindowState;
  onTakeProofs: () => void;
}

/**
 * The status chip's palette, VERBATIM from `ReservationsTable`'s
 * `STATUS_BADGE_CLASSES` so the same status is the same colour in the table and
 * here. `proofStatusCopy` chooses the tone; this maps it to classes.
 */
const TONE_CLASSES: Record<ProofStatusTone, string> = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  danger:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  neutral:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

function ToneIcon({ tone }: { tone: ProofStatusTone }) {
  if (tone === "danger") return <TriangleAlert className="w-3.5 h-3.5" />;
  if (tone === "success") return <CheckCircle2 className="w-3.5 h-3.5" />;

  return <Clock className="w-3.5 h-3.5" />;
}

/**
 * Prep §4. The section HOLDS STILL: both controls render on every visit, in the
 * same place, and only their `disabled` state changes. The previous version hid
 * the take-proofs button whenever the window was not open and hid the photo
 * control entirely without an inspection — which is the layout shift the prep
 * asks to remove.
 *
 * The photo control is enabled when photos exist OR the reservation is COVERED (D9) —
 * the second half of prep §5, and the reason a host returning from the inspection guide
 * sees an enabled control immediately rather than a disabled one waiting on a refetch.
 *
 * What the section reports is derived, never recomputed: the window answer arrives
 * as a prop, the status label and its explanation come from `proofStatusCopy`, and
 * the count and last capture time come from `summarizeShotProofs`.
 *
 * The controls carry no `InfoTooltip`. Prep §3 asks for the info affordance on the
 * page's *general action buttons*; here the explanation is the body line below the
 * chip, rendered once rather than attached to each of two buttons (D33).
 *
 * The photos are read from the reservation, never from the inspection (invariant 9).
 * `apartment_images.reservationId` is the key that always exists; `inspectionId` is
 * absent on a reservation whose host has not yet run the separate inspection action.
 */
export function ReservationProofSection({
  reservation,
  window,
  onTakeProofs,
}: ReservationProofSectionProps) {
  const { t } = useTranslation("host");
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);

  // Eager and unconditional: the read is scoped to the reservation, so it needs no
  // inspection to exist. That is the whole fix — `apartment_images` is keyed by
  // `reservationId`, and a covered reservation whose photos were submitted without a
  // follow-up inspection has them on disk and, before this, nowhere to read them.
  const {
    data: shots = [],
    isLoading: isPhotosLoading,
    isError: isPhotosError,
  } = useReservationPhotos(reservation.id);

  const { photoCount, lastCapturedAt } = summarizeShotProofs(shots);

  const copy = proofStatusCopy({
    state: window.state,
    status: reservation.status ?? null,
  });

  // D9 / prep §5: photos exist, OR the reservation is COVERED — which means the backend
  // already recorded a satisfied photo proof, so the photos are there to look at even
  // while the inspection read is still in flight. `status` is already a prop, so this
  // adds no request and no second clock.
  const canViewPhotos = photoCount > 0 || reservation.status === "COVERED";
  const canTakeProofs = window.canTakeShots;

  return (
    <SectionCard
      title={t("reservationPage.proof.title")}
      action={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            TONE_CLASSES[copy.tone],
          )}
        >
          <ToneIcon tone={copy.tone} />
          {t(copy.statusKey)}
        </span>
      }
    >
      {/* The explanation, first — it is the answer to "what should I do next", and
          it is also why a disabled button below is disabled. */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t(copy.bodyKey, {
          windowHours: window.windowHours,
          hoursUntilWindow: window.hoursUntilWindow,
        })}
      </p>

      {/* How many, and when the last one arrived (prep §4). `lastCaptured` takes a
          real Date: i18next's `datetime` formatter runs Intl's formatter, which
          rejects a string — the same reason `RoomPhotoItem` passes a Date. */}
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        {photoCount === 0
          ? t("reservationPage.proof.lastCapturedNever")
          : `${t("reservationPage.proof.photoCount", { count: photoCount })} · ${t(
              "reservationPage.proof.lastCaptured",
              {
                date: new Date(lastCapturedAt ?? ""),
                formatParams: {
                  date: { dateStyle: "medium", timeStyle: "short" },
                },
              },
            )}`}
      </p>

      {/* Both controls, always, side by side and identical in shape (D31). On a
          phone they wrap rather than scroll: two buttons fit. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ActionButton
          variant="neutral"
          size="md"
          icon={<Camera className="w-4 h-4 shrink-0" />}
          label={t("reservationPage.proof.takeProofs")}
          disabled={!canTakeProofs}
          onClick={onTakeProofs}
        />

        <ActionButton
          variant="neutral"
          size="md"
          icon={<Eye className="w-4 h-4 shrink-0" />}
          label={t("reservationPage.proof.viewProofs")}
          disabled={!canViewPhotos}
          onClick={() => setIsPhotosOpen(true)}
        />
      </div>

      {/* D7: one rendering of the photos, in a dialog. `Modal` brings the backdrop,
          Escape, the scroll lock and `role="dialog"`; the section's own inline
          toggle is gone, so there is exactly one path to this payload. */}
      <Modal
        isOpen={isPhotosOpen}
        onClose={() => setIsPhotosOpen(false)}
        title={t("reservationPage.proof.photosTitle")}
        size="lg"
        bodyClassName="p-6"
      >
        {isPhotosLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
            {t("reservationPage.proof.photosLoading")}
          </div>
        ) : isPhotosError ? (
          <p className="text-sm text-rose-500 dark:text-rose-400">
            {t("reservationPage.proof.photosError")}
          </p>
        ) : shots.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("reservationPage.proof.photosEmpty")}
          </p>
        ) : (
          <ReservationPhotoGallery shots={shots} />
        )}
      </Modal>
    </SectionCard>
  );
}
