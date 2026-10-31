import { getProofWindowState } from "@/lib/helpers/proofWindow";
import type { ProofWindowSubject } from "@/lib/helpers/proofWindow";

/**
 * D10: the ONE rule table for the three reservation actions, shared by the page's
 * `ReservationActionsBar` and the table's `ReservationActionsMenu`. Before this the two
 * surfaces each spelled the rules out inline, which is how the table's menu ended up
 * hiding rows the bar disabled, and how the create-inspection button ended up offering
 * an action the backend refuses.
 *
 * The tooltips are i18n KEYS, resolved by the caller's `t()` — the same convention
 * `reservationDates.ts` uses.
 *
 * Every key is returned even when the action is enabled: the tooltip is also the
 * explanation of what the button does. Only `delete` has none (prep §2: deleting is
 * self-explanatory, and a tooltip that only ever says "delete" is noise).
 */
export interface ActionAvailability {
  enabled: boolean;
  /** One of the `reservationPage.actions.tooltip.*` keys. Absent for `delete`. */
  tooltipKey?: string;
}

export interface ReservationActionAvailability {
  createInspection: ActionAvailability;
  copyMessage: ActionAvailability;
  delete: ActionAvailability;
}

export interface ReservationActionParams {
  reservation: ProofWindowSubject;
  /** The guest-inspection id, when one exists. */
  inspectionId?: string | null;
  /** Captured once by the caller at render (invariant 10). */
  now: number;
}

const TOOLTIP = {
  createInspection: "reservationPage.actions.tooltip.createInspection",
  hasInspection: "reservationPage.actions.tooltip.hasInspection",
  notCovered: "reservationPage.actions.tooltip.notCovered",
  noPhotoProof: "reservationPage.actions.tooltip.noPhotoProof",
  copyGuestMessage: "reservationPage.actions.tooltip.copyGuestMessage",
  noInspection: "reservationPage.actions.tooltip.noInspection",
  copyNotCovered: "reservationPage.actions.tooltip.copyNotCovered",
  past: "reservationPage.actions.tooltip.actionPast",
} as const;

export function getReservationActionAvailability({
  reservation,
  inspectionId,
  now,
}: ReservationActionParams): ReservationActionAvailability {
  const window = getProofWindowState(reservation, now);

  const hasInspection = Boolean(inspectionId);
  const isCovered = reservation.status === "COVERED";
  const hasPhotoProof = Boolean(reservation.hasPhotoProof);

  // D8 / prep §7: every action dies at the EFFECTIVE check-in. `getProofWindowState` has
  // already resolved the alternative-over-plain precedence, so this is not a second
  // derivation and cannot disagree with the proof window's own answer.
  const isPast = window.checkInTime === null || window.checkInTime <= now;

  // D2: exactly the backend's guard for POST /inspections
  // (`covera-hono/src/core/utils/db-validator.ts` `assertCanCreateInspection`), so an
  // enabled button cannot produce a 400.
  const canCreateInspection = !isPast && !hasInspection && isCovered && hasPhotoProof;

  // D7 / prep §7: present but disabled without a link, and without COVERED.
  const canCopyMessage = !isPast && hasInspection && isCovered;

  // Unchanged rule: deleting is allowed strictly before the effective check-in.
  const canDelete = !isPast;

  return {
    createInspection: {
      enabled: canCreateInspection,
      tooltipKey: isPast
        ? TOOLTIP.past
        : hasInspection
          ? TOOLTIP.hasInspection
          : !isCovered
            ? TOOLTIP.notCovered
            : !hasPhotoProof
              ? TOOLTIP.noPhotoProof
              : TOOLTIP.createInspection,
    },
    copyMessage: {
      enabled: canCopyMessage,
      tooltipKey: isPast
        ? TOOLTIP.past
        : !hasInspection
          ? TOOLTIP.noInspection
          : !isCovered
            ? TOOLTIP.copyNotCovered
            : TOOLTIP.copyGuestMessage,
    },
    // No `tooltipKey` — prep §2.
    delete: { enabled: canDelete },
  };
}
