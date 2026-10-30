import { describe, expect, it } from "vitest";
import {
  PROOF_WINDOW_FALLBACK_HOURS,
  getProofWindowState,
} from "./proofWindow";
import type { ProofWindowSubject } from "./proofWindow";

const HOUR = 60 * 60 * 1000;

/** Anchored, not relative: a fixed instant keeps every assertion readable. */
const CHECK_IN = "2026-09-01T14:00:00.000Z";
const CHECK_IN_MS = new Date(CHECK_IN).getTime();

function at(offsetMs: number): number {
  return CHECK_IN_MS + offsetMs;
}

function subject(overrides: Partial<ProofWindowSubject> = {}): ProofWindowSubject {
  return {
    checkInDatetime: CHECK_IN,
    alternativeCheckInDatetime: null,
    proofWindowHours: 4,
    hasPhotoProof: false,
    status: "PENDING_PROOF",
    ...overrides,
  };
}

describe("getProofWindowState — the four window states", () => {
  it("TOO_EARLY before check-in minus the window, and reports the hours remaining", () => {
    // 6h before check-in, with a 4h window: the window opens in 2h.
    const state = getProofWindowState(subject(), at(-6 * HOUR));

    expect(state.state).toBe("TOO_EARLY");
    expect(state.canTakeShots).toBe(false);
    expect(state.hoursUntilWindow).toBe(2);
    expect(state.windowStartTime).toBe(at(-4 * HOUR));
    expect(state.windowEndTime).toBe(at(HOUR));
  });

  it("OPEN on the opening instant itself, and for the whole window", () => {
    expect(getProofWindowState(subject(), at(-4 * HOUR)).state).toBe("OPEN");
    expect(getProofWindowState(subject(), at(0)).state).toBe("OPEN");
    expect(getProofWindowState(subject(), at(HOUR)).state).toBe("OPEN");
  });

  it("EXPIRED one millisecond past check-in plus the grace hour", () => {
    const state = getProofWindowState(subject(), at(HOUR + 1));

    expect(state.state).toBe("EXPIRED");
    expect(state.canTakeShots).toBe(false);
    expect(state.hoursUntilWindow).toBe(0);
  });

  it("ALREADY_SUBMITTED wins over the window bounds, in both directions", () => {
    // Covered AND inside the window.
    expect(
      getProofWindowState(subject({ status: "COVERED" }), at(0)).state,
    ).toBe("ALREADY_SUBMITTED");

    // Covered AND past the close — still reported as already submitted, not expired.
    expect(
      getProofWindowState(subject({ status: "COVERED" }), at(48 * HOUR)).state,
    ).toBe("ALREADY_SUBMITTED");

    // The flag alone, with a pending status, is enough.
    expect(
      getProofWindowState(subject({ hasPhotoProof: true }), at(0)).state,
    ).toBe("ALREADY_SUBMITTED");

    // Even before the window would have opened.
    expect(
      getProofWindowState(subject({ status: "COVERED" }), at(-99 * HOUR)).state,
    ).toBe("ALREADY_SUBMITTED");
  });
});

describe("getProofWindowState — the effective check-in", () => {
  it("prefers the alternative check-in when one is set", () => {
    const alternative = "2026-09-10T14:00:00.000Z";
    const altMs = new Date(alternative).getTime();

    // The ORIGINAL check-in's window is wide open at this instant…
    const state = getProofWindowState(
      subject({ alternativeCheckInDatetime: alternative }),
      CHECK_IN_MS,
    );

    // …but the alternative is 9 days out, so the window is still ahead.
    expect(state.effectiveCheckInDatetime).toBe(alternative);
    expect(state.checkInTime).toBe(altMs);
    expect(state.state).toBe("TOO_EARLY");
    expect(state.windowStartTime).toBe(altMs - 4 * HOUR);
  });

  it("falls back to the plain check-in when the alternative is null or empty", () => {
    for (const value of [null, "", undefined]) {
      const state = getProofWindowState(
        subject({ alternativeCheckInDatetime: value }),
        CHECK_IN_MS,
      );

      expect(state.effectiveCheckInDatetime, String(value)).toBe(CHECK_IN);
      expect(state.state, String(value)).toBe("OPEN");
    }
  });
});

describe("getProofWindowState — the hours default and degenerate input", () => {
  it("defaults proofWindowHours when the field is missing or null", () => {
    expect(getProofWindowState(subject({ proofWindowHours: null }), at(0)).windowHours).toBe(
      PROOF_WINDOW_FALLBACK_HOURS,
    );

    const noField = subject();
    delete noField.proofWindowHours;

    const state = getProofWindowState(noField, at(0));

    expect(state.windowHours).toBe(PROOF_WINDOW_FALLBACK_HOURS);
    expect(state.windowStartTime).toBe(at(-PROOF_WINDOW_FALLBACK_HOURS * HOUR));
  });

  it("honours a non-default proofWindowHours", () => {
    const state = getProofWindowState(subject({ proofWindowHours: 12 }), at(0));

    expect(state.windowHours).toBe(12);
    expect(state.windowStartTime).toBe(at(-12 * HOUR));
    expect(state.state).toBe("OPEN");
  });

  it("reports NOT_STARTED — never OPEN — for a reservation with no usable check-in", () => {
    // A null check-in and an unparseable one must both read as "no window". The
    // second case is the one the old inline arithmetic got wrong: NaN is truthy,
    // and every comparison against NaN is false, so it fell through to "can take".
    expect(
      getProofWindowState(subject({ checkInDatetime: null }), at(0)).state,
    ).toBe("NOT_STARTED");

    const corrupt = getProofWindowState(
      subject({ checkInDatetime: "not-a-date" }),
      at(0),
    );

    expect(corrupt.state).toBe("NOT_STARTED");
    expect(corrupt.canTakeShots).toBe(false);
    expect(corrupt.checkInTime).toBeNull();
    expect(corrupt.windowStartTime).toBeNull();
    expect(corrupt.windowEndTime).toBeNull();
    expect(corrupt.hoursUntilWindow).toBe(0);
  });
});

describe("isPast and isPastEnd — has the stay ended", () => {
  it("reports both as past once the check-out has gone by", () => {
    // Check-out at +2h, the clock at +3h: the stay is over.
    const state = getProofWindowState(subject({ checkOutDatetime: new Date(at(2 * HOUR)).toISOString() }), at(3 * HOUR));

    expect(state.isPast).toBe(true);
    expect(state.isPastEnd).toBe(true);
  });

  it("reports neither as past for a stay that has not ended", () => {
    const state = getProofWindowState(subject({ checkOutDatetime: new Date(at(24 * HOUR)).toISOString() }), at(HOUR));

    expect(state.isPast).toBe(false);
    expect(state.isPastEnd).toBe(false);
  });

  it("lets the alternative check-out win, which is the precedence rule", () => {
    // The plain check-out is 1h gone; the alternative is two days out. The stay is NOT
    // over, because the alternative is the effective one — but the plain end HAS passed,
    // and that is exactly what isPastEnd is for (D3).
    const state = getProofWindowState(
      subject({
        checkOutDatetime: new Date(at(2 * HOUR)).toISOString(),
        alternativeCheckOutDatetime: new Date(at(48 * HOUR)).toISOString(),
      }),
      at(3 * HOUR),
    );

    expect(state.isPast).toBe(false);
    expect(state.isPastEnd).toBe(true);
  });

  it("is never past when the check-out is missing, null, empty or unparseable", () => {
    for (const checkOutDatetime of [undefined, null, "", "not-a-date"]) {
      const state = getProofWindowState(subject({ checkOutDatetime }), at(24 * HOUR));

      expect(state.isPast).toBe(false);
      expect(state.isPastEnd).toBe(false);
    }
  });

  it("stays independent of the window state, in both directions", () => {
    // Both have proofs submitted, so both report ALREADY_SUBMITTED — the window answer must
    // not shadow the past answer, and the past answer must not shadow the window's.
    const past = getProofWindowState(
      subject({ checkOutDatetime: new Date(at(2 * HOUR)).toISOString(), hasPhotoProof: true }),
      at(3 * HOUR),
    );
    const upcoming = getProofWindowState(
      subject({ checkOutDatetime: new Date(at(24 * HOUR)).toISOString(), hasPhotoProof: true }),
      at(HOUR),
    );

    expect(past.state).toBe("ALREADY_SUBMITTED");
    expect(upcoming.state).toBe("ALREADY_SUBMITTED");
    expect(past.isPast).toBe(true);
    expect(upcoming.isPast).toBe(false);
  });

  it("treats the exact check-out instant as not yet past", () => {
    const state = getProofWindowState(subject({ checkOutDatetime: new Date(at(3 * HOUR)).toISOString() }), at(3 * HOUR));

    expect(state.isPast).toBe(false);
  });
});
