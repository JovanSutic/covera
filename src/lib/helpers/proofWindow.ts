/** D9: the window arithmetic, defined once. See `getProofWindowState` below. */
export const PROOF_WINDOW_FALLBACK_HOURS = 4;

/** After check-in the window stays open exactly this long, then closes for good. */
export const PROOF_WINDOW_GRACE_MS = 60 * 60 * 1000;

export type ProofWindowStateName =
  | "NOT_STARTED"
  | "TOO_EARLY"
  | "OPEN"
  | "EXPIRED"
  | "ALREADY_SUBMITTED";

/**
 * Everything the three surfaces need in order to agree about "can this host take
 * shots": the answer, why not, and the numbers the copy needs.
 */
export interface ProofWindowState {
  state: ProofWindowStateName;
  /** `checkInDatetime`, or `alternativeCheckInDatetime` when one is set (D9). */
  effectiveCheckInDatetime: string | null;
  /** Epoch ms of the effective check-in, or `null` when there is no usable date. */
  checkInTime: number | null;
  /** The window's opening instant, in epoch ms, or `null` when there is no check-in. */
  windowStartTime: number | null;
  /** The closing instant — check-in plus one hour — or `null`. */
  windowEndTime: number | null;
  windowHours: number;
  /** Whole hours until the window opens; `0` unless the state is `TOO_EARLY`. */
  hoursUntilWindow: number;
  /** Whether the host has already satisfied the reservation. */
  hasSubmittedProofs: boolean;
  /** True only for `OPEN`. The single answer to "may I take shots". */
  canTakeShots: boolean;
}

/**
 * A reservation as far as this helper is concerned. Structural, not nominal: the
 * page passes a `ReservationWithInspection`, the table passes a `ReservationRow`,
 * and both satisfy this — so neither has to be widened to call it.
 */
export interface ProofWindowSubject {
  checkInDatetime: string | null;
  alternativeCheckInDatetime?: string | null;
  proofWindowHours?: number | null;
  hasPhotoProof?: boolean | null;
  status?: string | null;
  alternativeCheckOutDatetime?: string | null;
}

/**
 * D9: the ONLY computation of "can this host take shots". The table's menu, the
 * reservation page's proof section and the guide page's own precondition all call
 * this. It is the arithmetic that used to be inline in `ReservationActionsCell`
 * (effective check-in; `proofWindowHours ?? 4`; check-in − windowHours through
 * check-in + 1h; the too-early/too-late/already-submitted flags), lifted verbatim
 * so the button that offers the action and the page that refuses it cannot drift.
 *
 * `now` is a parameter, not `Date.now()`, so the caller owns the clock and the
 * behaviour is testable without faking timers. Callers render once with `Date.now()`
 * captured at render — the same thing the old inline version did.
 *
 * ORDER OF THE CHECKS IS THE BEHAVIOUR. `ALREADY_SUBMITTED` is tested before the
 * window bounds: a host who has submitted must see "already submitted" even if the
 * clock has since run past the close, which is what the inline version did.
 */
export function getProofWindowState(
  reservation: ProofWindowSubject,
  now: number,
): ProofWindowState {
  const effectiveCheckInDatetime =
    reservation.alternativeCheckInDatetime || reservation.checkInDatetime || null;

  const parsed = effectiveCheckInDatetime
    ? new Date(effectiveCheckInDatetime).getTime()
    : Number.NaN;

  // Number.isFinite, not a truthiness check: `new Date("garbage").getTime()` is
  // NaN, and an unparseable date must read as "no window", not as epoch 0 —
  // which would make every bound comparison silently false and report OPEN.
  const checkInTime = Number.isFinite(parsed) ? parsed : null;

  const windowHours = reservation.proofWindowHours ?? PROOF_WINDOW_FALLBACK_HOURS;

  const windowStartTime =
    checkInTime === null
      ? null
      : checkInTime - windowHours * 60 * 60 * 1000;

  const windowEndTime =
    checkInTime === null ? null : checkInTime + PROOF_WINDOW_GRACE_MS;

  const hasSubmittedProofs =
    Boolean(reservation.hasPhotoProof) || reservation.status === "COVERED";

  const state = resolveState({
    checkInTime,
    windowStartTime,
    windowEndTime,
    hasSubmittedProofs,
    now,
  });

  const isTooEarly = state === "TOO_EARLY";

  return {
    state,
    effectiveCheckInDatetime,
    checkInTime,
    windowStartTime,
    windowEndTime,
    windowHours,
    hoursUntilWindow:
      isTooEarly && windowStartTime !== null
        ? Math.ceil((windowStartTime - now) / (1000 * 60 * 60))
        : 0,
    hasSubmittedProofs,
    canTakeShots: state === "OPEN",
  };
}

function resolveState({
  checkInTime,
  windowStartTime,
  windowEndTime,
  hasSubmittedProofs,
  now,
}: {
  checkInTime: number | null;
  windowStartTime: number | null;
  windowEndTime: number | null;
  hasSubmittedProofs: boolean;
  now: number;
}): ProofWindowStateName {
  if (hasSubmittedProofs) return "ALREADY_SUBMITTED";

  // No usable check-in: nothing to open a window around.
  if (
    checkInTime === null ||
    windowStartTime === null ||
    windowEndTime === null
  ) {
    return "NOT_STARTED";
  }

  if (now < windowStartTime) return "TOO_EARLY";
  if (now > windowEndTime) return "EXPIRED";

  return "OPEN";
}
