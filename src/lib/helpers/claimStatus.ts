import type { Incident, IncidentItem } from "@/api/generated/requests/types.gen";

/**
 * D16: the ONE answer to "what does this status mean and what may be done next".
 * The reservation section, the claim page and the field portal all ask these
 * functions — the same reason `proofWindow.ts` and `reservationActions.ts` exist.
 * The labels are i18n KEYS, resolved by the caller's `t()`.
 */
export type ClaimTone = "neutral" | "warning" | "info" | "success" | "danger";

export interface ClaimCopy {
  tone: ClaimTone;
  labelKey: string;
}

/**
 * D15/blueprint View A. Three of these tones are the blueprint's own colours:
 * Draft = gray, Ready to File = yellow, Submitted to Guest = blue. The three
 * statuses the backend cannot currently produce are mapped anyway (out of scope
 * to OFFER, in scope to RENDER correctly if they ever arrive).
 */
const INCIDENT_STATUS: Record<Incident["status"], ClaimCopy> = {
  draft: { tone: "neutral", labelKey: "incidentPage.status.draft" },
  ready_to_file: { tone: "warning", labelKey: "incidentPage.status.readyToFile" },
  submitted_to_guest: {
    tone: "info",
    labelKey: "incidentPage.status.submittedToGuest",
  },
  escalated_to_aircover: {
    tone: "info",
    labelKey: "incidentPage.status.escalatedToAircover",
  },
  resolved: { tone: "success", labelKey: "incidentPage.status.resolved" },
  unfeasible: { tone: "danger", labelKey: "incidentPage.status.unfeasible" },
};

export function claimStatusCopy(status: Incident["status"]): ClaimCopy {
  return INCIDENT_STATUS[status];
}

/**
 * `documents_pending` has no writer in `covera-hono` today (D15) — it is mapped so
 * an item that arrives in it renders as itself rather than as "unknown".
 */
const ITEM_STATUS: Record<IncidentItem["status"], ClaimCopy> = {
  link_generated: { tone: "warning", labelKey: "incidentPage.itemStatus.linkGenerated" },
  photos_collected: { tone: "info", labelKey: "incidentPage.itemStatus.photosCollected" },
  documents_pending: {
    tone: "warning",
    labelKey: "incidentPage.itemStatus.documentsPending",
  },
  complete: { tone: "success", labelKey: "incidentPage.itemStatus.complete" },
};

export function itemStatusCopy(status: IncidentItem["status"]): ClaimCopy {
  return ITEM_STATUS[status];
}

/**
 * The backend's own `isClaimEditable`: `["draft", "ready_to_file"]`. Named here so
 * the UI's editable surface is the same set the API will accept a write for.
 */
export function isIncidentEditable(incident: Incident): boolean {
  return incident.status === "draft" || incident.status === "ready_to_file";
}

/**
 * The filing surface opens only at `ready_to_file`.
 *
 * The backend's guard on POST /incidents/{id}/confirm-airbnb-filing is wider — it
 * accepts `draft` too — but a draft is by definition a claim with an uncollected
 * item, and `syncIncidentReadiness` is what flips it. Offering "file this now" on a
 * draft would be offering an action whose own precondition the page has not met.
 */
export function canFileClaim(incident: Incident): boolean {
  return incident.status === "ready_to_file";
}

/**
 * D17: the item's field link is live only while the item is still in
 * `link_generated` AND the token has not passed. `recomputeItemStatus` burns the
 * token (`tokenExpiresAt = new Date()`) the moment the status leaves
 * `link_generated`, so the status check is not redundant with the date check — it
 * is the half that closes the link after a successful submit.
 *
 * An unparseable date reads as NOT live, matching `proofWindow.ts`'s rule that a
 * corrupt date is "no such instant" rather than epoch 0.
 */
export function isItemLinkLive(item: IncidentItem, now: number): boolean {
  if (item.status !== "link_generated") return false;

  const expires = new Date(item.tokenExpiresAt).getTime();

  return Number.isFinite(expires) && expires > now;
}

/**
 * D17: `reissueToken` matches only `status = 'link_generated'`, so a reissue
 * control anywhere else would call an endpoint that cannot succeed. This is
 * therefore "the link lapsed while still collectable" — and nothing else.
 */
export function canReissueItemLink(item: IncidentItem, now: number): boolean {
  return item.status === "link_generated" && !isItemLinkLive(item, now);
}

/**
 * D11: there is NO incident-by-reservation endpoint — `GET /incidents` requires an
 * `apartmentId` and returns a paginated list. Both host surfaces resolve "the claim
 * for this reservation" here, so they cannot match differently.
 *
 * Returns the first match, which under the list's `createdAt desc` sort is the
 * newest. One reservation can only have one incident (the backend refuses a second
 * with `INCIDENT_ALREADY_EXISTS`), so a second element would be a backend bug, not
 * a choice to make here.
 */
export function findIncidentForReservation<T extends { reservationId: string }>(
  incidents: readonly T[],
  reservationId: string,
): T | null {
  return incidents.find((incident) => incident.reservationId === reservationId) ?? null;
}
