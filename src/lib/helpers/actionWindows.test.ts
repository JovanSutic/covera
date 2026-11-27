import { describe, expect, it } from "vitest";

import { getActionWindows } from "./actionWindows";
import type { ActionWindowSubject, SiblingStay } from "./actionWindows";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-06-15T12:00:00.000Z");

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString();
}

function stay(overrides: Partial<ActionWindowSubject> & { id: string }): ActionWindowSubject {
  return {
    checkInDatetime: iso(7 * DAY),
    checkOutDatetime: iso(14 * DAY),
    status: "COVERED",
    hasPhotoProof: true,
    ...overrides,
  };
}

function windows(
  reservation: ActionWindowSubject,
  siblings: readonly SiblingStay[] = [],
) {
  return getActionWindows({ reservation, siblings, now: NOW });
}

describe("button 1 — manage claim photos", () => {
  it("is enabled while no newer stay has started and the claim is unfiled", () => {
    expect(windows(stay({ id: "a" })).manageClaimPhotos.enabled).toBe(true);
  });

  it("dies once the claim is filed, window running or not", () => {
    const result = windows(stay({ id: "a", claimFiled: true }));

    expect(result.manageClaimPhotos.enabled).toBe(false);
    expect(result.manageClaimPhotos.tooltipKey).toBe("actionWindows.tooltip.claimFiled");
  });

  it("dies once a newer stay in the same apartment has started", () => {
    // A valid booking chain: this stay ended, the next guest started after it and is already in.
    const mine = stay({ id: "a", checkOutDatetime: iso(-2 * DAY) });
    const next = stay({ id: "b", checkInDatetime: iso(-1 * DAY) });

    const result = windows(mine, [mine, next]);

    expect(result.manageClaimPhotos.enabled).toBe(false);
    expect(result.manageClaimPhotos.tooltipKey).toBe("actionWindows.tooltip.nextStayStarted");
  });

  it("ignores a stay that has not started yet", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(-1 * DAY) });
    const next = stay({ id: "b", checkInDatetime: iso(1 * DAY) });

    expect(windows(mine, [mine, next]).manageClaimPhotos.enabled).toBe(true);
  });
});

describe("button 2 — guest inspection link", () => {
  it("opens once the reservation is covered", () => {
    expect(windows(stay({ id: "a" })).guestInspectionLink.enabled).toBe(true);
  });

  it("stays shut until the reservation is covered", () => {
    const result = windows(stay({ id: "a", status: "PENDING_PROOF" }));

    expect(result.guestInspectionLink.enabled).toBe(false);
    expect(result.guestInspectionLink.tooltipKey).toBe("actionWindows.tooltip.notCovered");
  });

  it("closes one hour past the effective check-in", () => {
    const mine = stay({ id: "a", checkInDatetime: iso(-2 * HOUR) });

    const result = windows(mine);

    expect(result.guestInspectionLink.enabled).toBe(false);
    expect(result.guestInspectionLink.tooltipKey).toBe(
      "actionWindows.tooltip.pastCheckInGrace",
    );
  });

  it("is still open inside the one-hour grace", () => {
    const mine = stay({ id: "a", checkInDatetime: iso(-30 * 60 * 1000) });

    expect(windows(mine).guestInspectionLink.enabled).toBe(true);
  });

  it("prefers the alternative check-in when one is set", () => {
    const mine = stay({
      id: "a",
      checkInDatetime: iso(-2 * HOUR),
      alternativeCheckInDatetime: iso(2 * HOUR),
    });

    expect(windows(mine).guestInspectionLink.enabled).toBe(true);
  });

  it("is shut once a link already exists", () => {
    const result = windows(stay({ id: "a", hasInspection: true }));

    expect(result.guestInspectionLink.enabled).toBe(false);
    expect(result.guestInspectionLink.tooltipKey).toBe("actionWindows.tooltip.hasInspection");
  });
});

describe("button 3 — start claim", () => {
  it("opens one hour before the effective check-out", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(-30 * 60 * 1000) });

    expect(windows(mine).startClaim.enabled).toBe(true);
  });

  it("is shut more than an hour before check-out", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(2 * HOUR) });

    const result = windows(mine);

    expect(result.startClaim.enabled).toBe(false);
    expect(result.startClaim.tooltipKey).toBe("actionWindows.tooltip.tooEarly");
  });

  it("closes 30 days after the check-out", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(-31 * DAY) });

    const result = windows(mine);

    expect(result.startClaim.enabled).toBe(false);
    expect(result.startClaim.tooltipKey).toBe("actionWindows.tooltip.past30Days");
  });

  it("is still open at 29 days", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(-29 * DAY) });

    expect(windows(mine).startClaim.enabled).toBe(true);
  });

  it("closes when the next stay starts, even inside the 30 days", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(-2 * DAY) });
    const next = stay({ id: "b", checkInDatetime: iso(-1 * HOUR) });

    const result = windows(mine, [mine, next]);

    expect(result.startClaim.enabled).toBe(false);
    expect(result.startClaim.tooltipKey).toBe("actionWindows.tooltip.nextStayStarted");
  });
});

describe("button 4 — grant special photo access", () => {
  it("opens one hour before the previous stay's check-out", () => {
    const previous = stay({ id: "p", checkOutDatetime: iso(-30 * 60 * 1000) });
    const mine = stay({ id: "a", checkInDatetime: iso(3 * HOUR) });

    expect(windows(mine, [previous, mine]).specialPhotoAccess.enabled).toBe(true);
  });

  it("is shut when there is no preceding stay", () => {
    const mine = stay({ id: "a" });

    const result = windows(mine, [mine]);

    expect(result.specialPhotoAccess.enabled).toBe(false);
    expect(result.specialPhotoAccess.tooltipKey).toBe(
      "actionWindows.tooltip.noPrecedingCheckout",
    );
  });

  it("is shut more than an hour before the previous check-out", () => {
    const previous = stay({ id: "p", checkOutDatetime: iso(2 * HOUR) });
    const mine = stay({ id: "a", checkInDatetime: iso(3 * HOUR) });

    const result = windows(mine, [previous, mine]);

    expect(result.specialPhotoAccess.enabled).toBe(false);
    expect(result.specialPhotoAccess.tooltipKey).toBe("actionWindows.tooltip.tooEarly");
  });

  it("is shut once this stay's check-in has arrived", () => {
    const previous = stay({ id: "p", checkOutDatetime: iso(-3 * HOUR) });
    const mine = stay({ id: "a", checkInDatetime: iso(-1 * HOUR) });

    const result = windows(mine, [previous, mine]);

    expect(result.specialPhotoAccess.enabled).toBe(false);
    expect(result.specialPhotoAccess.tooltipKey).toBe("actionWindows.tooltip.pastCheckIn");
  });

  it("handles the same-day checkout/check-in case the doc calls out", () => {
    // One stay checks out the morning the next checks in — the cleaner's window is the gap.
    const previous = stay({
      id: "p",
      checkInDatetime: iso(-7 * DAY),
      checkOutDatetime: iso(-30 * 60 * 1000),
    });
    const mine = stay({ id: "a", checkInDatetime: iso(2 * HOUR) });

    expect(windows(mine, [previous, mine]).specialPhotoAccess.enabled).toBe(true);
  });
});

describe("neighbour selection", () => {
  it("skips a sibling with an unparseable date rather than treating it as epoch 0", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(1 * DAY) });
    const broken = stay({ id: "b", checkInDatetime: "garbage" });

    expect(windows(mine, [mine, broken]).manageClaimPhotos.enabled).toBe(true);
  });

  it("ignores this reservation when it appears in the list", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(1 * DAY) });

    expect(windows(mine, [mine]).manageClaimPhotos.enabled).toBe(true);
  });

  it("picks the NEAREST neighbour, not the first in the list", () => {
    const mine = stay({ id: "a", checkOutDatetime: iso(-2 * DAY) });
    const far = stay({ id: "far", checkInDatetime: iso(10 * DAY) });
    const near = stay({ id: "near", checkInDatetime: iso(-1 * HOUR) });

    // `far` is listed first and starts later; `near` is the one that has started.
    const result = windows(mine, [mine, far, near]);

    expect(result.manageClaimPhotos.enabled).toBe(false);
  });
});
