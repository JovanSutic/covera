import { useTranslation } from "react-i18next";
import { ChevronRight, FileWarning, TriangleAlert } from "lucide-react";

import { ActionButton } from "@/components/shared/ActionButton";
import { SectionCard } from "@/components/shared/SectionCard";
import { useIncidents } from "@/lib/api/queries/incidents";
import { countdownParts, getClaimDeadlineState } from "@/lib/helpers/claimDeadline";
import { claimTotals, formatCents } from "@/lib/helpers/claimMoney";
import { claimStatusCopy, findIncidentForReservation } from "@/lib/helpers/claimStatus";
import { cn } from "@/lib/utils";
import type { ClaimTone } from "@/lib/helpers/claimStatus";
import type { IncidentWithItems } from "@/api/generated/requests/types.gen";

/**
 * The chip's palette, VERBATIM from `ReservationProofSection`'s `TONE_CLASSES` so the
 * same tone is the same colour on the same page. The two unions are structurally
 * identical today (`ClaimTone` and `ProofStatusTone` are both
 * neutral | info | warning | danger | success), and the duplication is deliberate
 * (D44): hoisting one shared map would mean editing a component with its own passing
 * test in a phase that is otherwise purely additive, and it would remove the ability
 * of the two vocabularies to diverge. A third copy is the point at which that
 * reasoning stops holding.
 */
const TONE_CLASSES: Record<ClaimTone, string> = {
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

/**
 * Takes an already-translated label, the way `SectionCard` takes an already-translated
 * title — the primitive owns no copy and no key naming.
 */
function ClaimStatusChip({ tone, label }: { tone: ClaimTone; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}

interface ReservationIncidentSectionProps {
  /** From the URL. The list read is keyed by the APARTMENT, not the reservation. */
  apartmentId: string;
  /** From the URL. Used to pick this stay's claim out of the apartment's list. */
  reservationId: string;
  /**
   * The page's single clock. Passed in rather than read here (D46): the reservation
   * page already computes one `now` for the proof window, and two `Date.now()` calls
   * in one render is two answers to the same question.
   */
  now: number;
  /** The page owns navigation and the path build, exactly as `ReservationProofSection`
   *  owns `onTakeProofs`. */
  onOpenClaim: () => void;
}

/**
 * The reservation page's claim section. It answers "is there a claim on this stay, and
 * where do I go" — nothing more. The figures, the copy block and the filing controls
 * are all on the claim page (D2), because the host's guidance copy is long and this
 * section is a status report, not a workspace.
 *
 * Four states, and the branching is on DATA, never on a status string (invariant 9):
 *
 *   error      — the list could not be read, so "no claim" is not a safe conclusion
 *   loading    — no cached answer yet
 *   no claim   — `findIncidentForReservation` returned null
 *   has claim  — a chip from `claimStatusCopy`, the figures from `claimTotals`, and,
 *                once the claim is filed, the guest-response clock
 *
 * "Filed" is `guestDeadlineTime !== null`, not a status comparison: the backend sets
 * `guestResponseDeadlineAt` in the same write that files the claim
 * (`confirmAirbnbFiling`), so the deadline existing IS the fact. The status string
 * would be a second way of saying it.
 */
export function ReservationIncidentSection({
  apartmentId,
  reservationId,
  now,
  onOpenClaim,
}: ReservationIncidentSectionProps) {
  const { t } = useTranslation("host");

  // Prefetched by the reservation route's `data:` declaration (phase 4), so on a
  // hover or an in-app navigation this is a cache read and starts no request.
  const { data, isLoading, isError } = useIncidents({ apartmentId });

  const incident = findIncidentForReservation<IncidentWithItems>(
    data?.data ?? [],
    reservationId,
  );

  if (isError && !incident) {
    // No CTA on this branch. Offering "start a claim" to a host who may already have
    // one is worse than saying the read failed — and a click would reach a backend
    // that answers `INCIDENT_ALREADY_EXISTS`.
    return (
      <SectionCard title={t("reservationPage.incident.title")}>
        <p className="text-sm text-rose-500 dark:text-rose-400">
          {t("reservationPage.incident.error")}
        </p>
      </SectionCard>
    );
  }

  if (isLoading && !incident) {
    return (
      <SectionCard title={t("reservationPage.incident.title")}>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 dark:border-gray-100 border-t-transparent" />
          {t("reservationPage.incident.loading")}
        </div>
      </SectionCard>
    );
  }

  if (!incident) {
    return (
      <SectionCard title={t("reservationPage.incident.title")}>
        <div className="flex items-start gap-3">
          <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("reservationPage.incident.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("reservationPage.incident.emptyBody")}
            </p>
          </div>
        </div>

        {/* Navigation, not creation. The claim page's own "no incident" state is the
            create form (spec row 2), so this button only has to get the host there. */}
        <div className="mt-4">
          <ActionButton
            variant="primary"
            size="md"
            icon={<ChevronRight className="h-4 w-4 shrink-0" />}
            label={t("reservationPage.incident.startClaim")}
            onClick={onOpenClaim}
          />
        </div>
      </SectionCard>
    );
  }

  const copy = claimStatusCopy(incident.status);
  const totals = claimTotals(incident, incident.items);
  const deadline = getClaimDeadlineState(incident, now);
  const { hours, minutes } = countdownParts(deadline.msUntilGuestDeadline);

  return (
    <SectionCard
      title={t("reservationPage.incident.title")}
      action={<ClaimStatusChip tone={copy.tone} label={t(copy.labelKey)} />}
    >
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {t("reservationPage.incident.itemCount", { count: incident.items.length })}
        {" · "}
        {t("reservationPage.incident.total")} {formatCents(totals.requestedCents)}
      </p>

      {/* The guest-response clock, and only once there is one to report. Three
          branches, in urgency order — the AirCover window is the outer deadline, so
          it is the one that matters once the guest's has closed. */}
      {deadline.guestDeadlineTime !== null && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          {deadline.isAircoverOverdue || deadline.isGuestResponseOverdue ? (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          ) : null}
          {deadline.isAircoverOverdue
            ? t("reservationPage.incident.aircoverOverdue")
            : deadline.isGuestResponseOverdue
              ? t("reservationPage.incident.guestOverdue", {
                  days: deadline.daysUntilAircover,
                })
              : t("reservationPage.incident.awaitingGuest", { hours, minutes })}
        </p>
      )}

      <div className="mt-4">
        <ActionButton
          variant="neutral"
          size="md"
          icon={<ChevronRight className="h-4 w-4 shrink-0" />}
          label={t("reservationPage.incident.openClaim")}
          onClick={onOpenClaim}
        />
      </div>
    </SectionCard>
  );
}
