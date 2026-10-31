import type { ShotWithAssets } from "@/api/generated/requests/types.gen";
import type { ProofWindowStateName } from "@/lib/helpers/proofWindow";

/**
 * D9: the ONLY computation of "how many photos are there, and when was the last one
 * captured". The proof section reports it; nothing re-derives it from `images`.
 *
 * An image counts when it is `active` AND not deleted — the same predicate
 * `RoomPhotoItem` uses to choose the one image it renders. Two copies of that rule
 * is how the section ends up reporting a count the dialog does not show.
 *
 * `lastCapturedAt` is the newest `uploadedAt` among the counted images, as an ISO
 * string, or `null` when there are none. It is returned as a string rather than as
 * a `Date` so the caller owns formatting and this stays pure data-in/data-out.
 */
export interface ShotProofSummary {
  photoCount: number;
  lastCapturedAt: string | null;
}

export function summarizeShotProofs(shots: ShotWithAssets[]): ShotProofSummary {
  let photoCount = 0;
  let lastCapturedAt: string | null = null;

  for (const shot of shots) {
    for (const image of shot.images ?? []) {
      if (image.status !== "active" || image.deletedAt) continue;

      photoCount += 1;

      // String comparison, not Date parsing: `uploadedAt` is an ISO-8601 string, so
      // lexicographic order IS chronological order — and it cannot be derailed by a
      // corrupt value the way `new Date(x).getTime()` can (compare proofWindow.ts,
      // which needs `Number.isFinite` for exactly that reason).
      if (lastCapturedAt === null || image.uploadedAt > lastCapturedAt) {
        lastCapturedAt = image.uploadedAt;
      }
    }
  }

  return { photoCount, lastCapturedAt };
}

export type ProofStatusTone =
  | "neutral"
  | "info"
  | "warning"
  | "danger"
  | "success";

export interface ProofStatusCopy {
  tone: ProofStatusTone;
  /** One of the five `apartmentReservationsManager.status.*` keys — reused, never duplicated. */
  statusKey: string;
  /** One of the eight `reservationPage.proof.status.*` keys. */
  bodyKey: string;
}

const STATUS_KEYS: Record<string, string> = {
  PENDING_PROOF: "apartmentReservationsManager.status.PENDING_PROOF",
  COVERED: "apartmentReservationsManager.status.COVERED",
  DISPUTED: "apartmentReservationsManager.status.DISPUTED",
  RESOLVED: "apartmentReservationsManager.status.RESOLVED",
  CLOSED: "apartmentReservationsManager.status.CLOSED",
};

/**
 * D10: the status chip's label, tone, and its one line of explanation.
 *
 * ORDER IS THE BEHAVIOUR, and it is chosen to answer the host's actual question —
 * "what should I do next" — rather than to report a database value:
 *
 *   1. A disputed reservation is the most urgent thing the section can say, and it
 *      outranks everything: it is the reason the host opened this page.
 *   2. A closed or resolved claim is finished business, whatever the window says.
 *   3. Otherwise the WINDOW decides. EXPIRED before COVERED is deliberate: a host
 *      whose window closed with nothing submitted is the case that most needs
 *      saying, and rating it on `status === "COVERED"` alone would call it success.
 *   4. Then the window's four remaining states in their own precedence.
 *
 * The argument is a flat `{ state, status }` rather than the whole window object so
 * the function is trivially testable and cannot reach past what it is given.
 */
export function proofStatusCopy({
  state,
  status,
}: {
  state: ProofWindowStateName;
  status: string | null | undefined;
}): ProofStatusCopy {
  const statusKey = STATUS_KEYS[status ?? ""] ?? STATUS_KEYS.PENDING_PROOF;

  if (status === "DISPUTED") {
    return { tone: "danger", statusKey, bodyKey: "reservationPage.proof.status.disputed" };
  }

  if (status === "CLOSED" || status === "RESOLVED") {
    return { tone: "neutral", statusKey, bodyKey: "reservationPage.proof.status.settled" };
  }

  if (state === "EXPIRED") {
    return { tone: "danger", statusKey, bodyKey: "reservationPage.proof.status.expired" };
  }

  if (state === "ALREADY_SUBMITTED") {
    return { tone: "success", statusKey, bodyKey: "reservationPage.proof.status.submitted" };
  }

  if (state === "TOO_EARLY") {
    return { tone: "info", statusKey, bodyKey: "reservationPage.proof.status.tooEarly" };
  }

  if (state === "NOT_STARTED") {
    return { tone: "warning", statusKey, bodyKey: "reservationPage.proof.status.notStarted" };
  }

  return { tone: "info", statusKey, bodyKey: "reservationPage.proof.status.open" };
}
