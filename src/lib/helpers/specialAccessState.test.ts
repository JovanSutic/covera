import { describe, expect, it } from "vitest";

import { grantState, grantStateLabelKey, isRevocable } from "./specialAccessState";
import type { SpecialAccess } from "@/api/generated/requests/types.gen";

const NOW = Date.parse("2026-06-15T12:00:00.000Z");

function grant(overrides: Partial<SpecialAccess> = {}): SpecialAccess {
  return {
    id: "g1",
    accessId: "abc123",
    scope: "inspection_proof",
    apartmentId: "a1",
    reservationId: "r1",
    incidentItemId: null,
    expiresAt: new Date(NOW + 60 * 60 * 1000).toISOString(),
    revokedAt: null,
    usedAt: null,
    createdAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe("grantState", () => {
  it("is active while unrevoked, unused and unexpired", () => {
    expect(grantState(grant(), NOW)).toBe("active");
  });

  it("is expired once the expiry has passed", () => {
    expect(
      grantState(grant({ expiresAt: new Date(NOW - 1000).toISOString() }), NOW),
    ).toBe("expired");
  });

  it("is used once it has been redeemed", () => {
    expect(grantState(grant({ usedAt: new Date(NOW - 1000).toISOString() }), NOW)).toBe(
      "used",
    );
  });

  it("reports revoked ahead of used and expired", () => {
    const revoked = grant({
      revokedAt: new Date(NOW - 1000).toISOString(),
      usedAt: new Date(NOW - 2000).toISOString(),
      expiresAt: new Date(NOW - 3000).toISOString(),
    });

    expect(grantState(revoked, NOW)).toBe("revoked");
  });

  it("fails closed on an unparseable expiry", () => {
    expect(grantState(grant({ expiresAt: "garbage" }), NOW)).toBe("expired");
  });

  it("treats the exact expiry instant as expired", () => {
    expect(grantState(grant({ expiresAt: new Date(NOW).toISOString() }), NOW)).toBe(
      "expired",
    );
  });
});

describe("the label keys", () => {
  it("maps every state to its own key", () => {
    const keys = (["active", "used", "revoked", "expired"] as const).map(
      grantStateLabelKey,
    );

    expect(new Set(keys).size).toBe(4);
    expect(keys.every((key) => key.startsWith("reservationPage.links.state."))).toBe(true);
  });
});

describe("isRevocable", () => {
  it("is true only for an active grant", () => {
    expect(isRevocable("active")).toBe(true);
    expect(isRevocable("used")).toBe(false);
    expect(isRevocable("revoked")).toBe(false);
    expect(isRevocable("expired")).toBe(false);
  });
});
