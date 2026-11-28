import type { SpecialAccess } from "@/api/generated/requests/types.gen";

/**
 * D6: what a listed grant's state is, and the i18n key that says it. One function, so the
 * list and any future surface cannot disagree — the same reason `claimStatus.ts` exists.
 *
 * The order of the checks IS the behaviour: a revoked link that has also expired is
 * "revoked" — that is the fact the host acted on, and the one they can act on again.
 */
export type GrantState = "active" | "used" | "revoked" | "expired";

const LABEL_KEYS: Record<GrantState, string> = {
  active: "reservationPage.links.state.active",
  used: "reservationPage.links.state.used",
  revoked: "reservationPage.links.state.revoked",
  expired: "reservationPage.links.state.expired",
};

export function grantState(grant: SpecialAccess, now: number): GrantState {
  if (grant.revokedAt !== null) return "revoked";
  if (grant.usedAt !== null) return "used";

  const expires = new Date(grant.expiresAt).getTime();

  // An unparseable expiry reads as expired, not as "valid forever" — the safe direction for a
  // credential. This is the one place in the feature where a corrupt date fails CLOSED.
  if (!Number.isFinite(expires) || expires <= now) return "expired";

  return "active";
}

export function grantStateLabelKey(state: GrantState): string {
  return LABEL_KEYS[state];
}

/** D6: only an active grant is worth revoking — the rest are already dead. */
export function isRevocable(state: GrantState): boolean {
  return state === "active";
}
