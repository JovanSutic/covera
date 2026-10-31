import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { ShotWithAssets } from "@/api/generated/requests/types.gen";
import { proofStatusCopy, summarizeShotProofs } from "./proofSummary";

/** The four fields `summarizeShotProofs` reads; the rest of the shape is noise. */
function shot(
  images: Array<{ status: string; deletedAt: string | null; uploadedAt: string }>,
): ShotWithAssets {
  return { id: "shot-1", images } as unknown as ShotWithAssets;
}

const active = (uploadedAt: string) => ({
  status: "active",
  deletedAt: null,
  uploadedAt,
});

const softDeleted = (uploadedAt: string) => ({
  status: "soft_deleted",
  deletedAt: "2026-01-02T00:00:00.000Z",
  uploadedAt,
});

describe("summarizeShotProofs", () => {
  it("returns nothing for no shots", () => {
    expect(summarizeShotProofs([])).toEqual({
      photoCount: 0,
      lastCapturedAt: null,
    });
  });

  it("returns nothing for shots that carry no images", () => {
    expect(summarizeShotProofs([shot([])])).toEqual({
      photoCount: 0,
      lastCapturedAt: null,
    });
  });

  it("counts one active image on each of two shots", () => {
    const summary = summarizeShotProofs([
      shot([active("2026-01-01T10:00:00.000Z")]),
      shot([active("2026-01-02T10:00:00.000Z")]),
    ]);

    expect(summary.photoCount).toBe(2);
  });

  it("takes the NEWEST upload as the last capture, not the last shot in order", () => {
    const summary = summarizeShotProofs([
      shot([active("2026-01-05T10:00:00.000Z")]),
      shot([active("2026-01-01T10:00:00.000Z")]),
    ]);

    expect(summary.lastCapturedAt).toBe("2026-01-05T10:00:00.000Z");
  });

  it("ignores soft-deleted images even when they are newer", () => {
    const summary = summarizeShotProofs([
      shot([active("2026-01-01T10:00:00.000Z")]),
      shot([softDeleted("2026-01-09T10:00:00.000Z")]),
    ]);

    expect(summary).toEqual({
      photoCount: 1,
      lastCapturedAt: "2026-01-01T10:00:00.000Z",
    });
  });

  it("counts every active image on a single shot", () => {
    const summary = summarizeShotProofs([
      shot([
        active("2026-01-01T10:00:00.000Z"),
        active("2026-01-03T10:00:00.000Z"),
      ]),
    ]);

    expect(summary).toEqual({
      photoCount: 2,
      lastCapturedAt: "2026-01-03T10:00:00.000Z",
    });
  });

  it("reports a count of zero when every image is deleted", () => {
    const summary = summarizeShotProofs([
      shot([softDeleted("2026-01-01T10:00:00.000Z")]),
    ]);

    expect(summary).toEqual({ photoCount: 0, lastCapturedAt: null });
  });
});

describe("proofStatusCopy", () => {
  it("reuses the table's status label rather than a second set of strings", () => {
    expect(proofStatusCopy({ state: "OPEN", status: "PENDING_PROOF" }).statusKey).toBe(
      "apartmentReservationsManager.status.PENDING_PROOF",
    );
  });

  it("falls back to PENDING_PROOF for an unknown or missing status", () => {
    expect(proofStatusCopy({ state: "OPEN", status: null }).statusKey).toBe(
      "apartmentReservationsManager.status.PENDING_PROOF",
    );
    expect(proofStatusCopy({ state: "OPEN", status: "WAT" }).statusKey).toBe(
      "apartmentReservationsManager.status.PENDING_PROOF",
    );
  });

  it("lets a dispute outrank every window state", () => {
    const copy = proofStatusCopy({ state: "OPEN", status: "DISPUTED" });

    expect(copy.tone).toBe("danger");
    expect(copy.bodyKey).toBe("reservationPage.proof.status.disputed");
  });

  it("treats a resolved or closed claim as settled even inside an open window", () => {
    expect(proofStatusCopy({ state: "OPEN", status: "RESOLVED" }).tone).toBe("neutral");
    expect(proofStatusCopy({ state: "OPEN", status: "CLOSED" }).tone).toBe("neutral");
    expect(proofStatusCopy({ state: "OPEN", status: "CLOSED" }).bodyKey).toBe(
      "reservationPage.proof.status.settled",
    );
  });

  it("reports EXPIRED as danger even when the status reads COVERED", () => {
    const copy = proofStatusCopy({ state: "EXPIRED", status: "COVERED" });

    expect(copy.tone).toBe("danger");
    expect(copy.bodyKey).toBe("reservationPage.proof.status.expired");
  });

  it("maps each remaining window state to its own line and tone", () => {
    expect(proofStatusCopy({ state: "ALREADY_SUBMITTED", status: "COVERED" })).toEqual({
      tone: "success",
      statusKey: "apartmentReservationsManager.status.COVERED",
      bodyKey: "reservationPage.proof.status.submitted",
    });
    expect(proofStatusCopy({ state: "TOO_EARLY", status: "PENDING_PROOF" }).bodyKey).toBe(
      "reservationPage.proof.status.tooEarly",
    );
    expect(proofStatusCopy({ state: "NOT_STARTED", status: "PENDING_PROOF" }).tone).toBe(
      "warning",
    );
    expect(proofStatusCopy({ state: "OPEN", status: "PENDING_PROOF" }).bodyKey).toBe(
      "reservationPage.proof.status.open",
    );
  });

  /**
   * Step 2.3 adds the copy for these; this pair is what ties the two together. Every
   * `bodyKey` this function can return must exist in `en/host.json`, so a missing key
   * is a red test rather than a raw key string rendered at runtime. It also closes the
   * function over every branch: these are the only seven keys it can produce.
   */
  const EVERY_STATE = [
    "NOT_STARTED",
    "TOO_EARLY",
    "OPEN",
    "EXPIRED",
    "ALREADY_SUBMITTED",
  ] as const;

  const EVERY_STATUS = [
    "PENDING_PROOF",
    "COVERED",
    "DISPUTED",
    "RESOLVED",
    "CLOSED",
  ] as const;

  it("produces exactly these seven body keys, and no others", () => {
    const produced = new Set<string>();

    for (const state of EVERY_STATE) {
      for (const status of EVERY_STATUS) {
        produced.add(proofStatusCopy({ state, status }).bodyKey);
      }
    }

    expect([...produced].sort()).toEqual(
      [
        "reservationPage.proof.status.disputed",
        "reservationPage.proof.status.expired",
        "reservationPage.proof.status.notStarted",
        "reservationPage.proof.status.open",
        "reservationPage.proof.status.settled",
        "reservationPage.proof.status.submitted",
        "reservationPage.proof.status.tooEarly",
      ].sort(),
    );
  });

  it("every key it can produce exists in en/host.json", () => {
    const file = path.join(
      process.cwd(),
      "public",
      "locales",
      "en",
      "host.json",
    );
    const english = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
      string,
      unknown
    >;

    const lookup = (key: string): unknown =>
      key
        .split(".")
        .reduce<unknown>(
          (node, part) =>
            node && typeof node === "object"
              ? (node as Record<string, unknown>)[part]
              : undefined,
          english,
        );

    for (const state of EVERY_STATE) {
      for (const status of EVERY_STATUS) {
        const { bodyKey, statusKey } = proofStatusCopy({ state, status });

        expect(lookup(bodyKey), `${state}/${status} → ${bodyKey}`).toBeTypeOf(
          "string",
        );
        expect(lookup(statusKey), `${state}/${status} → ${statusKey}`).toBeTypeOf(
          "string",
        );
      }
    }
  });
});
