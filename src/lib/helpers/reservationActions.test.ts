import { describe, expect, it } from "vitest";

import { getReservationActionAvailability } from "./reservationActions";

const NOW = new Date("2026-06-01T10:00:00.000Z").getTime();
const HOUR = 60 * 60 * 1000;

/** A covered, photo-backed reservation checking in a day from `NOW`. */
function subject(overrides: Record<string, unknown> = {}) {
  return {
    checkInDatetime: new Date(NOW + 24 * HOUR).toISOString(),
    checkOutDatetime: new Date(NOW + 96 * HOUR).toISOString(),
    alternativeCheckInDatetime: null,
    alternativeCheckOutDatetime: null,
    status: "COVERED",
    hasPhotoProof: true,
    ...overrides,
  };
}

const rule = (overrides = {}, inspectionId: string | null = null) =>
  getReservationActionAvailability({
    reservation: subject(overrides),
    inspectionId,
    now: NOW,
  });

describe("create inspection link", () => {
  it("enables for a covered, photo-backed reservation with no link yet", () => {
    const result = rule();
    expect(result.createInspection.enabled).toBe(true);
    expect(result.createInspection.tooltipKey).toBe(
      "reservationPage.actions.tooltip.createInspection",
    );
  });

  it("disables once a link exists, and says so", () => {
    const result = rule({}, "inspection-1");
    expect(result.createInspection.enabled).toBe(false);
    expect(result.createInspection.tooltipKey).toBe(
      "reservationPage.actions.tooltip.hasInspection",
    );
  });

  it("disables while the reservation is not COVERED", () => {
    const result = rule({ status: "PENDING_PROOF" });
    expect(result.createInspection.enabled).toBe(false);
    expect(result.createInspection.tooltipKey).toBe(
      "reservationPage.actions.tooltip.notCovered",
    );
  });

  it("disables without a satisfied photo proof, which the backend also refuses", () => {
    const result = rule({ hasPhotoProof: false });
    expect(result.createInspection.enabled).toBe(false);
    expect(result.createInspection.tooltipKey).toBe(
      "reservationPage.actions.tooltip.noPhotoProof",
    );
  });

  it("reports the past reason ahead of every other reason", () => {
    const result = rule(
      {
        checkInDatetime: new Date(NOW - HOUR).toISOString(),
        status: "PENDING_PROOF",
        hasPhotoProof: false,
      },
      "inspection-1",
    );
    expect(result.createInspection.enabled).toBe(false);
    expect(result.createInspection.tooltipKey).toBe(
      "reservationPage.actions.tooltip.actionPast",
    );
  });
});

describe("copy guest message", () => {
  it("enables only with a link, COVERED, and before check-in", () => {
    expect(rule({}, "inspection-1").copyMessage.enabled).toBe(true);
  });

  it("disables without a link, and explains why", () => {
    const result = rule();
    expect(result.copyMessage.enabled).toBe(false);
    expect(result.copyMessage.tooltipKey).toBe(
      "reservationPage.actions.tooltip.noInspection",
    );
  });

  it("disables when the reservation is not COVERED", () => {
    const result = rule({ status: "PENDING_PROOF" }, "inspection-1");
    expect(result.copyMessage.enabled).toBe(false);
    expect(result.copyMessage.tooltipKey).toBe(
      "reservationPage.actions.tooltip.copyNotCovered",
    );
  });
});

describe("the effective check-in is the deadline, not the plain one", () => {
  it("keeps the actions alive when a LATER alternative check-in is still ahead", () => {
    // The plain check-in has passed; the alternative pushes it into the future, which is
    // the whole reason prep §7 says the alternative wins.
    const result = rule({
      checkInDatetime: new Date(NOW - HOUR).toISOString(),
      alternativeCheckInDatetime: new Date(NOW + 2 * HOUR).toISOString(),
    });

    expect(result.delete.enabled).toBe(true);
    expect(result.createInspection.enabled).toBe(true);
  });

  it("kills them once the alternative itself has passed", () => {
    const result = rule({
      checkInDatetime: new Date(NOW + 5 * HOUR).toISOString(),
      alternativeCheckInDatetime: new Date(NOW - HOUR).toISOString(),
    });

    expect(result.delete.enabled).toBe(false);
    expect(result.createInspection.enabled).toBe(false);
    expect(result.copyMessage.enabled).toBe(false);
  });

  it("disables everything when there is no usable check-in at all", () => {
    const result = rule({ checkInDatetime: null });
    expect(result.delete.enabled).toBe(false);
    expect(result.copyMessage.enabled).toBe(false);
    expect(result.createInspection.enabled).toBe(false);
  });
});

describe("delete", () => {
  it("carries no tooltip — deleting is self-explanatory (prep §2)", () => {
    expect(rule().delete.tooltipKey).toBeUndefined();
  });

  it("is enabled before the effective check-in regardless of status", () => {
    expect(rule({ status: "PENDING_PROOF" }).delete.enabled).toBe(true);
    expect(rule({ status: "RESOLVED" }).delete.enabled).toBe(true);
  });
});
