import { CLAIM_OPEN_LEAD_MS, claimOpenState } from "@/lib/helpers/claimDeadline";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import type { ProofWindowSubject } from "@/lib/helpers/proofWindow";

/**
 * D13: the ONE rule table for the four reservation/incident actions described in
 * `docs/reservation-actions-access.md`. Every surface that renders one of these buttons reads
 * this module — the same reason `proofWindow.ts` and `reservationActions.ts` exist.
 *
 * Three of the four rules are bounded by a NEIGHBOURING stay in the same apartment, so the
 * caller passes the apartment's reservation list. This module is PURE: it takes the list and
 * `now`, and never reads a clock or a query client (invariant 10).
 *
 * The claim bounds are NOT recomputed here — `claimDeadline.claimOpenState` owns them, and this
 * module only adds the next-stay bound on top (invariant 9).
 *
 * The tooltips are i18n KEYS, resolved by the caller's `t()` — the convention
 * `reservationActions.ts` uses.
 */

/** D18: how long after the effective check-in a guest inspection link may still be issued. */
export const INSPECTION_GRACE_MS = 60 * 60 * 1000;

/** D26: the API's documented maximum page size — the sibling list's ceiling. */
export const SIBLING_LIMIT = 100;

/** The minimum a sibling reservation must expose to be a neighbour. */
export interface SiblingStay extends ProofWindowSubject {
  id: string;
}

export interface ActionWindowSubject extends ProofWindowSubject {
  id: string;
  /** D16: set by `confirmAirbnbFiling` in the same write that files the claim. */
  claimFiled?: boolean;
  /** The guest inspection link, when one exists. */
  hasInspection?: boolean;
}

export interface ActionWindowParams {
  reservation: ActionWindowSubject;
  /** Every reservation for the same apartment, including this one. */
  siblings: readonly SiblingStay[];
  /** Captured once by the caller at render (invariant 10). */
  now: number;
}

export interface ActionWindow {
  enabled: boolean;
  /** One of the `actionWindows.tooltip.*` keys. Always present. */
  tooltipKey: string;
}

export interface ActionWindows {
  /** Button 1 — the incident page's "manage claim photos". */
  manageClaimPhotos: ActionWindow;
  /** Button 2 — the reservation page's guest inspection link. */
  guestInspectionLink: ActionWindow;
  /** Button 3 — the reservation page's "start claim". */
  startClaim: ActionWindow;
  /** Button 4 — the reservation page's special photo access grant. */
  specialPhotoAccess: ActionWindow;
}

const TOOLTIP = {
  manageClaimPhotos: "actionWindows.tooltip.manageClaimPhotos",
  nextStayStarted: "actionWindows.tooltip.nextStayStarted",
  claimFiled: "actionWindows.tooltip.claimFiled",
  guestInspectionLink: "actionWindows.tooltip.guestInspectionLink",
  notCovered: "actionWindows.tooltip.notCovered",
  pastCheckInGrace: "actionWindows.tooltip.pastCheckInGrace",
  hasInspection: "actionWindows.tooltip.hasInspection",
  startClaim: "actionWindows.tooltip.startClaim",
  tooEarly: "actionWindows.tooltip.tooEarly",
  past30Days: "actionWindows.tooltip.past30Days",
  specialPhotoAccess: "actionWindows.tooltip.specialPhotoAccess",
  noPrecedingCheckout: "actionWindows.tooltip.noPrecedingCheckout",
  pastCheckIn: "actionWindows.tooltip.pastCheckIn",
} as const;

/**
 * D15: "next stay" is the sibling with the smallest effective check-in strictly after this
 * stay's effective check-out. "Previous stay" is the sibling with the largest effective
 * check-out strictly before this stay's effective check-in. Neighbours in TIME, not list
 * order — and the alternative date wins when set, matching `proofWindow.ts`'s precedence.
 *
 * A sibling with an unparseable date is skipped rather than treated as epoch 0, which would
 * make it look like a stay in 1970 and win every comparison.
 */
function effectiveCheckIn(stay: ProofWindowSubject): number | null {
  return toEpoch(stay.alternativeCheckInDatetime) ?? toEpoch(stay.checkInDatetime);
}

function effectiveCheckOut(stay: ProofWindowSubject): number | null {
  return toEpoch(stay.alternativeCheckOutDatetime) ?? toEpoch(stay.checkOutDatetime);
}

function toEpoch(value: string | null | undefined): number | null {
  if (!value) return null;

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : null;
}

export function nextStayAfter(
  reservation: ActionWindowSubject,
  siblings: readonly SiblingStay[],
): SiblingStay | null {
  const mine = effectiveCheckOut(reservation);
  if (mine === null) return null;

  let best: SiblingStay | null = null;
  let bestAt = Number.POSITIVE_INFINITY;

  for (const sibling of siblings) {
    if (sibling.id === reservation.id) continue;

    const starts = effectiveCheckIn(sibling);
    if (starts === null || starts <= mine) continue;

    if (starts < bestAt) {
      bestAt = starts;
      best = sibling;
    }
  }

  return best;
}

export function previousStayBefore(
  reservation: ActionWindowSubject,
  siblings: readonly SiblingStay[],
): SiblingStay | null {
  const mine = effectiveCheckIn(reservation);
  if (mine === null) return null;

  let best: SiblingStay | null = null;
  let bestAt = Number.NEGATIVE_INFINITY;

  for (const sibling of siblings) {
    if (sibling.id === reservation.id) continue;

    const ends = effectiveCheckOut(sibling);
    if (ends === null || ends >= mine) continue;

    if (ends > bestAt) {
      bestAt = ends;
      best = sibling;
    }
  }

  return best;
}

export function getActionWindows({
  reservation,
  siblings,
  now,
}: ActionWindowParams): ActionWindows {
  const window = getProofWindowState(reservation, now);

  // The effective check-in, already resolved by `getProofWindowState` — not a second
  // derivation, so this cannot disagree with the proof window's own answer.
  const checkIn = window.checkInTime;

  const next = nextStayAfter(reservation, siblings);
  const previous = previousStayBefore(reservation, siblings);
  const nextStarts = next ? effectiveCheckIn(next) : null;
  const previousEnds = previous ? effectiveCheckOut(previous) : null;

  const isCovered = reservation.status === "COVERED";
  const claimFiled = Boolean(reservation.claimFiled);

  // Button 1 (doc rule 1): collectible until the next guest's stay has started, and dead the
  // moment the claim is filed — the guest response window having been opened, running or not.
  const nextStayStarted = nextStarts !== null && now >= nextStarts;
  const canManageClaimPhotos = !nextStayStarted && !claimFiled;

  // Button 2 (doc rule 2): the guest runs the inspection, so the link opens once the
  // reservation is COVERED and closes one hour past the effective check-in.
  const pastCheckInGrace = checkIn !== null && now > checkIn + INSPECTION_GRACE_MS;
  const canCreateGuestInspectionLink =
    isCovered && !pastCheckInGrace && !reservation.hasInspection;

  // Button 3 (doc rule 3): the claim window's own bounds come from `claimDeadline`, and the
  // next stay's start is the only bound this module adds.
  const claimState = claimOpenState(
    reservation.checkOutDatetime ?? null,
    reservation.alternativeCheckOutDatetime ?? null,
    now,
  );
  const claimBoundsOpen = claimState === "OPEN" || claimState === "NO_GATE";
  const canStartClaim = claimBoundsOpen && !nextStayStarted;

  // Button 4 (doc rule 4): the cleaner collects the PRE-reservation state, so the window is
  // the gap before this stay — from one hour before the previous stay's check-out until this
  // stay's effective check-in. With no preceding stay there is no such gap, so the button is
  // unavailable rather than open-ended.
  const tooEarlyForAccess =
    previousEnds !== null && now < previousEnds - CLAIM_OPEN_LEAD_MS;
  const pastCheckIn = checkIn !== null && now >= checkIn;
  const canGrantSpecialPhotoAccess =
    previousEnds !== null && !tooEarlyForAccess && !pastCheckIn;

  return {
    manageClaimPhotos: {
      enabled: canManageClaimPhotos,
      tooltipKey: nextStayStarted
        ? TOOLTIP.nextStayStarted
        : claimFiled
          ? TOOLTIP.claimFiled
          : TOOLTIP.manageClaimPhotos,
    },
    guestInspectionLink: {
      enabled: canCreateGuestInspectionLink,
      tooltipKey: !isCovered
        ? TOOLTIP.notCovered
        : pastCheckInGrace
          ? TOOLTIP.pastCheckInGrace
          : reservation.hasInspection
            ? TOOLTIP.hasInspection
            : TOOLTIP.guestInspectionLink,
    },
    startClaim: {
      enabled: canStartClaim,
      tooltipKey: claimState === "TOO_EARLY"
        ? TOOLTIP.tooEarly
        : claimState === "PAST_WINDOW"
          ? TOOLTIP.past30Days
          : nextStayStarted
            ? TOOLTIP.nextStayStarted
            : TOOLTIP.startClaim,
    },
    specialPhotoAccess: {
      enabled: canGrantSpecialPhotoAccess,
      tooltipKey: previousEnds === null
        ? TOOLTIP.noPrecedingCheckout
        : tooEarlyForAccess
          ? TOOLTIP.tooEarly
          : pastCheckIn
            ? TOOLTIP.pastCheckIn
            : TOOLTIP.specialPhotoAccess,
    },
  };
}
