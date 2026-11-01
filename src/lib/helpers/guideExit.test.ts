import { describe, expect, it } from "vitest";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { canLeaveGuide } from "./guideExit";

function shots(captured: number[]): CapturedApartmentShot[] {
  return [0, 1, 2].map((index) => ({
    id: `shot-${index}`,
    apartmentId: "apartment-1",
    roomLocation: "KITCHEN",
    shotType: "SWEEP_ONLY",
    title: `Shot ${index}`,
    instructions: `Instructions ${index}`,
    assetIds: [],
    createdAt: "2026-09-01T14:00:00.000Z",
    updatedAt: "2026-09-01T14:00:00.000Z",
    ...(captured.includes(index) ? { capturedImageUrl: `blob:preview-${index}` } : {}),
  }));
}

describe("canLeaveGuide", () => {
  it("is true when nothing has been captured — there is nothing to lose", () => {
    expect(canLeaveGuide(shots([]), false)).toBe(true);
  });

  it("is false as soon as one photo is captured", () => {
    expect(canLeaveGuide(shots([0]), false)).toBe(false);
  });

  it("is false when every step is captured and nothing is submitted yet", () => {
    // The review screen is exactly this state, and it is the one where leaving costs the
    // most — a full set of photos.
    expect(canLeaveGuide(shots([0, 1, 2]), false)).toBe(false);
  });

  it("is true while submitting, so the overlay is not a trap (D11)", () => {
    expect(canLeaveGuide(shots([0, 1, 2]), true)).toBe(true);
  });

  it("is true on a guide with no steps at all", () => {
    expect(canLeaveGuide([], false)).toBe(true);
  });
});
