import type { Incident } from "@/api/generated/requests/types.gen";

/**
 * D32: the deadline arithmetic, defined once. `now` is a PARAMETER, never
 * `Date.now()` inside — the same rule `getProofWindowState` follows, so the
 * behaviour is testable without faking timers and the caller owns the clock.
 *
 * The backend owns both deadlines: `confirmAirbnbFiling` sets
 * `guestResponseDeadlineAt = NOW() + 24h`, and item creation sets
 * `aircoverEscalationDeadlineAt = effectiveCheckOut + 30 days`
 * (`ESCALATION_DAYS`, `covera-hono/src/modules/incidents/incidents.service.ts`).
 * Nothing here recomputes them; it only reads them.
 */
export const GUEST_RESPONSE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ClaimDeadlineState {
  /** Epoch ms of `guestResponseDeadlineAt`, or `null` when the claim is unfiled. */
  guestDeadlineTime: number | null;
  /** Milliseconds remaining; `0` once passed. Never negative. */
  msUntilGuestDeadline: number;
  /** Whole minutes remaining, rounded up — the countdown's display unit. */
  minutesUntilGuestDeadline: number;
  /** True only when there IS a deadline and it has passed. */
  isGuestResponseOverdue: boolean;
  /** Epoch ms of `aircoverEscalationDeadlineAt`, or `null` when unusable. */
  aircoverDeadlineTime: number | null;
  /** Whole days remaining, rounded up; `0` once passed. */
  daysUntilAircover: number;
  isAircoverOverdue: boolean;
}

/**
 * `Number.isFinite`, not a truthiness check: `new Date("garbage").getTime()` is
 * NaN, and a corrupt date must read as "no such instant" — never as epoch 0, which
 * would report every claim as decades overdue.
 */
function toEpoch(value: string | null): number | null {
  if (!value) return null;

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : null;
}

export function getClaimDeadlineState(incident: Incident, now: number): ClaimDeadlineState {
  const guestDeadlineTime = toEpoch(incident.guestResponseDeadlineAt);
  const aircoverDeadlineTime = toEpoch(incident.aircoverEscalationDeadlineAt);

  const msUntilGuestDeadline =
    guestDeadlineTime === null ? 0 : Math.max(0, guestDeadlineTime - now);
  const msUntilAircover =
    aircoverDeadlineTime === null ? 0 : Math.max(0, aircoverDeadlineTime - now);

  return {
    guestDeadlineTime,
    msUntilGuestDeadline,
    // Rounded UP, not down: with 30 seconds left "0 minutes" reads as already over.
    minutesUntilGuestDeadline: Math.ceil(msUntilGuestDeadline / 60_000),
    isGuestResponseOverdue: guestDeadlineTime !== null && guestDeadlineTime <= now,
    aircoverDeadlineTime,
    daysUntilAircover: Math.ceil(msUntilAircover / (24 * 60 * 60 * 1000)),
    isAircoverOverdue: aircoverDeadlineTime !== null && aircoverDeadlineTime <= now,
  };
}

/**
 * The countdown's own numbers, so the component never divides by 60 000. A partial
 * hour is shown as an hour — "23h 0m" with 22h 40m left would understate the time
 * the host has, which is the opposite of what this feature is for.
 */
export function countdownParts(ms: number): { hours: number; minutes: number } {
  const clamped = Math.max(0, ms);

  return {
    hours: Math.floor(clamped / (60 * 60 * 1000)),
    minutes: Math.ceil((clamped % (60 * 60 * 1000)) / 60_000) % 60,
  };
}

/**
 * D18-adjacent: how the filing banner chooses its urgency. Three bands, because
 * the copy differs at each — an emergency check-in, a deadline inside a day, and
 * anything longer.
 */
export type ClaimUrgency = "emergency" | "soon" | "normal";

export function claimUrgency(incident: Incident, now: number): ClaimUrgency {
  if (incident.isEmergencyMode) return "emergency";

  const { msUntilGuestDeadline } = getClaimDeadlineState(incident, now);

  return msUntilGuestDeadline > 0 && msUntilGuestDeadline < GUEST_RESPONSE_WINDOW_MS
    ? "soon"
    : "normal";
}
