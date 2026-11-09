import { describe, expect, it } from "vitest";

import {
  canFileClaim,
  canReissueItemLink,
  claimStatusCopy,
  findIncidentForReservation,
  isIncidentEditable,
  isItemLinkLive,
  itemStatusCopy,
} from "./claimStatus";
import type { Incident, IncidentItem } from "@/api/generated/requests/types.gen";

const NOW = Date.parse("2026-11-08T12:00:00.000Z");

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "incident-1",
    reservationId: "reservation-1",
    status: "draft",
    isEmergencyMode: false,
    placeholderTotalAmountCents: 0,
    finalPayoutRequestedCents: 0,
    resolutionCenterSubmittedAt: null,
    guestResponseDeadlineAt: null,
    aircoverEscalationDeadlineAt: "2026-12-08T12:00:00.000Z",
    createdAt: "2026-11-08T12:00:00.000Z",
    updatedAt: "2026-11-08T12:00:00.000Z",
    ...overrides,
  };
}

function item(overrides: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "item-1",
    incidentId: "incident-1",
    assetId: "asset-1",
    type: "damage",
    status: "link_generated",
    tokenExpiresAt: "2026-11-08T20:00:00.000Z",
    estimatedPlaceholderValueCents: 0,
    descriptionByCleaner: null,
    createdAt: "2026-11-08T12:00:00.000Z",
    updatedAt: "2026-11-08T12:00:00.000Z",
    asset: {} as IncidentItem["asset"],
    evidence: [],
    ...overrides,
  };
}

describe("claimStatusCopy", () => {
  it("maps all six incident statuses to a label key, and the blueprint's three tones", () => {
    expect(claimStatusCopy("draft")).toEqual({
      tone: "neutral",
      labelKey: "incidentPage.status.draft",
    });
    expect(claimStatusCopy("ready_to_file").tone).toBe("warning");
    expect(claimStatusCopy("submitted_to_guest").tone).toBe("info");
  });

  it("renders the statuses the backend cannot currently produce", () => {
    // D15: unreachable today, mapped anyway — an item that arrives in one of these
    // must not render as "unknown".
    for (const status of ["escalated_to_aircover", "resolved", "unfeasible"] as const) {
      const copy = claimStatusCopy(status);
      expect(copy.tone, status).toBeTruthy();
      expect(copy.labelKey, status).toContain("incidentPage.status.");
    }
  });
});

describe("itemStatusCopy", () => {
  it("maps all four item statuses", () => {
    for (const status of [
      "link_generated",
      "photos_collected",
      "documents_pending",
      "complete",
    ] as const) {
      expect(itemStatusCopy(status).labelKey).toContain("incidentPage.itemStatus.");
    }
  });
});

describe("isIncidentEditable / canFileClaim", () => {
  it("mirrors the backend's editable set", () => {
    expect(isIncidentEditable(incident({ status: "draft" }))).toBe(true);
    expect(isIncidentEditable(incident({ status: "ready_to_file" }))).toBe(true);
  });

  it("refuses every status past filing", () => {
    for (const status of [
      "submitted_to_guest",
      "escalated_to_aircover",
      "resolved",
      "unfeasible",
    ] as const) {
      expect(isIncidentEditable(incident({ status })), status).toBe(false);
    }
  });

  it("opens filing only at ready_to_file, not at draft", () => {
    expect(canFileClaim(incident({ status: "ready_to_file" }))).toBe(true);
    expect(canFileClaim(incident({ status: "draft" }))).toBe(false);
  });
});

describe("isItemLinkLive / canReissueItemLink", () => {
  it("is live while link_generated and unexpired", () => {
    expect(isItemLinkLive(item(), NOW)).toBe(true);
    expect(canReissueItemLink(item(), NOW)).toBe(false);
  });

  it("is reissueable when the token lapsed while still collectable", () => {
    const lapsed = item({ tokenExpiresAt: "2026-11-08T11:00:00.000Z" });

    expect(isItemLinkLive(lapsed, NOW)).toBe(false);
    expect(canReissueItemLink(lapsed, NOW)).toBe(true);
  });

  it("is neither live nor reissueable once the status has moved on", () => {
    // The submit burns the token by moving the status; reissue cannot match it.
    for (const status of ["photos_collected", "documents_pending", "complete"] as const) {
      const collected = item({ status, tokenExpiresAt: "2026-11-08T11:00:00.000Z" });

      expect(isItemLinkLive(collected, NOW), status).toBe(false);
      expect(canReissueItemLink(collected, NOW), status).toBe(false);
    }
  });

  it("treats an unparseable expiry as not live", () => {
    const broken = item({ tokenExpiresAt: "not-a-date" });

    expect(isItemLinkLive(broken, NOW)).toBe(false);
    expect(canReissueItemLink(broken, NOW)).toBe(true);
  });
});

describe("findIncidentForReservation", () => {
  it("matches by reservationId", () => {
    const found = findIncidentForReservation(
      [incident({ id: "a", reservationId: "other" }), incident({ id: "b" })],
      "reservation-1",
    );

    expect(found?.id).toBe("b");
  });

  it("returns null when the apartment has no claim for this reservation", () => {
    expect(
      findIncidentForReservation([incident({ reservationId: "other" })], "reservation-1"),
    ).toBeNull();
  });

  it("returns null for an empty list rather than throwing", () => {
    expect(findIncidentForReservation([], "reservation-1")).toBeNull();
  });
});
