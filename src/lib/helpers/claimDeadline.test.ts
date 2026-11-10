import { describe, expect, it } from "vitest";

import {
  GUEST_RESPONSE_WINDOW_MS,
  claimUrgency,
  countdownParts,
  getClaimDeadlineState,
} from "./claimDeadline";
import type { Incident } from "@/api/generated/requests/types.gen";

const NOW = Date.parse("2026-11-08T12:00:00.000Z");

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "incident-1",
    reservationId: "reservation-1",
    status: "submitted_to_guest",
    isEmergencyMode: false,
    placeholderTotalAmountCents: 0,
    finalPayoutRequestedCents: 0,
    resolutionCenterSubmittedAt: "2026-11-08T11:00:00.000Z",
    guestResponseDeadlineAt: "2026-11-09T11:00:00.000Z",
    aircoverEscalationDeadlineAt: "2026-12-08T11:00:00.000Z",
    createdAt: "2026-11-08T11:00:00.000Z",
    updatedAt: "2026-11-08T11:00:00.000Z",
    ...overrides,
  };
}

describe("getClaimDeadlineState", () => {
  it("counts down while the guest window is open", () => {
    const state = getClaimDeadlineState(incident(), NOW);

    expect(state.guestDeadlineTime).toBe(Date.parse("2026-11-09T11:00:00.000Z"));
    expect(state.msUntilGuestDeadline).toBe(23 * 60 * 60 * 1000);
    expect(state.minutesUntilGuestDeadline).toBe(23 * 60);
    expect(state.isGuestResponseOverdue).toBe(false);
  });

  it("clamps to zero and flags overdue once the deadline passes, never negative", () => {
    const state = getClaimDeadlineState(
      incident({ guestResponseDeadlineAt: "2026-11-08T11:00:00.000Z" }),
      NOW,
    );

    expect(state.msUntilGuestDeadline).toBe(0);
    expect(state.minutesUntilGuestDeadline).toBe(0);
    expect(state.isGuestResponseOverdue).toBe(true);
  });

  it("treats the deadline instant itself as overdue", () => {
    const state = getClaimDeadlineState(
      incident({ guestResponseDeadlineAt: "2026-11-08T12:00:00.000Z" }),
      NOW,
    );

    expect(state.isGuestResponseOverdue).toBe(true);
  });

  it("reports no guest deadline on an unfiled claim", () => {
    const state = getClaimDeadlineState(
      incident({ status: "draft", guestResponseDeadlineAt: null }),
      NOW,
    );

    expect(state.guestDeadlineTime).toBeNull();
    expect(state.isGuestResponseOverdue).toBe(false);
    expect(state.msUntilGuestDeadline).toBe(0);
  });

  it("treats a corrupt guest deadline as no deadline, not as epoch 0", () => {
    const state = getClaimDeadlineState(
      incident({ guestResponseDeadlineAt: "garbage" }),
      NOW,
    );

    expect(state.guestDeadlineTime).toBeNull();
    expect(state.isGuestResponseOverdue).toBe(false);
  });

  it("counts AirCover days up, not down", () => {
    // 30 days minus one hour: 30 to the day, because a partial day still exists.
    const state = getClaimDeadlineState(incident(), NOW);

    expect(state.daysUntilAircover).toBe(30);
    expect(state.isAircoverOverdue).toBe(false);
  });

  it("flags the AirCover deadline overdue and clamps its days to zero", () => {
    const state = getClaimDeadlineState(
      incident({ aircoverEscalationDeadlineAt: "2026-11-01T00:00:00.000Z" }),
      NOW,
    );

    expect(state.daysUntilAircover).toBe(0);
    expect(state.isAircoverOverdue).toBe(true);
  });
});

describe("countdownParts", () => {
  it("splits a 23-hour window into hours and minutes", () => {
    expect(countdownParts(23 * 60 * 60 * 1000)).toEqual({ hours: 23, minutes: 0 });
  });

  it("rounds a partial hour up rather than reporting a whole hour lost", () => {
    // 22h 40m left must not read as "22h 0m" — understating the host's time is the
    // one error this feature cannot afford.
    expect(countdownParts(22 * 60 * 60 * 1000 + 40 * 60 * 1000)).toEqual({
      hours: 22,
      minutes: 40,
    });
    expect(countdownParts(30_000)).toEqual({ hours: 0, minutes: 1 });
  });

  it("returns zeroes for zero and for a negative input", () => {
    expect(countdownParts(0)).toEqual({ hours: 0, minutes: 0 });
    expect(countdownParts(-5_000)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("claimUrgency", () => {
  it("is emergency whenever the backend says so, whatever the clock says", () => {
    expect(claimUrgency(incident({ isEmergencyMode: true }), NOW)).toBe("emergency");
  });

  it("is soon while the guest window is under a day and still open", () => {
    const soon = incident({
      guestResponseDeadlineAt: new Date(NOW + GUEST_RESPONSE_WINDOW_MS - 60_000).toISOString(),
    });

    expect(claimUrgency(soon, NOW)).toBe("soon");
  });

  it("is normal with no deadline and with an overdue one", () => {
    expect(
      claimUrgency(incident({ status: "draft", guestResponseDeadlineAt: null }), NOW),
    ).toBe("normal");
    expect(
      claimUrgency(
        incident({ guestResponseDeadlineAt: "2026-11-08T11:00:00.000Z" }),
        NOW,
      ),
    ).toBe("normal");
  });
});
