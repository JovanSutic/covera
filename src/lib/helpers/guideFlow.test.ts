import { describe, expect, it } from "vitest";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import {
  advanceCursor,
  capturedCount,
  confirmationIndex,
  confirmationProgress,
  initialCursorIndex,
  inspectionGuideSteps,
  isCaptured,
  isFlowComplete,
  isViewingEarlierStep,
  nextPendingIndex,
  selectStep,
  stepCount,
} from "./guideFlow";

/** Three steps, none captured — the state the guide opens in. */
function threePending(): CapturedApartmentShot[] {
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
  }));
}

/** The same three, with the given indices captured. */
function withCaptured(indices: number[]): CapturedApartmentShot[] {
  return threePending().map((shot, index) =>
    indices.includes(index)
      ? { ...shot, capturedImageUrl: `blob:preview-${index}` }
      : shot,
  );
}

describe("isCaptured", () => {
  it("is false for a pending step, an undefined shot, and an empty URL", () => {
    const [pending] = threePending();

    expect(isCaptured(pending)).toBe(false);
    expect(isCaptured(undefined)).toBe(false);
    expect(isCaptured({ ...pending, capturedImageUrl: "" })).toBe(false);
  });

  it("is true once a preview URL is set", () => {
    expect(isCaptured(withCaptured([0])[0])).toBe(true);
  });
});

describe("capturedCount", () => {
  it("counts the captured steps and nothing else", () => {
    expect(capturedCount(threePending())).toBe(0);
    expect(capturedCount(withCaptured([0, 2]))).toBe(2);
    expect(capturedCount([])).toBe(0);
  });
});

describe("stepCount and confirmationIndex", () => {
  it("is one more than the photo count — the confirmation (prep §3)", () => {
    expect(stepCount(threePending())).toBe(4);
    expect(stepCount([])).toBe(1);
  });

  it("puts the confirmation at the photo count", () => {
    expect(confirmationIndex(threePending())).toBe(3);
    expect(confirmationIndex([])).toBe(0);
  });
});

describe("nextPendingIndex", () => {
  it("finds the first pending step strictly after the cursor", () => {
    expect(nextPendingIndex(threePending(), -1)).toBe(0);
    expect(nextPendingIndex(threePending(), 0)).toBe(1);
  });

  it("skips the steps already captured", () => {
    expect(nextPendingIndex(withCaptured([1]), 0)).toBe(2);
  });

  it("returns null when nothing pending remains", () => {
    expect(nextPendingIndex(withCaptured([0, 1, 2]), 0)).toBeNull();
    expect(nextPendingIndex([], -1)).toBeNull();
  });

  it("never looks backwards", () => {
    expect(nextPendingIndex(withCaptured([2]), 1)).toBeNull();
  });
});

describe("initialCursorIndex", () => {
  it("opens a fresh guide on the first step", () => {
    expect(initialCursorIndex(threePending())).toBe(0);
  });

  it("opens a resumed guide on the first PENDING step", () => {
    expect(initialCursorIndex(withCaptured([0, 1]))).toBe(2);
  });

  it("opens an all-captured guide on the CONFIRMATION (prep §3)", () => {
    expect(initialCursorIndex(withCaptured([0, 1, 2]))).toBe(3);
  });

  it("opens an empty guide on 0 — which is also its confirmation index", () => {
    expect(initialCursorIndex([])).toBe(0);
  });
});

describe("advanceCursor", () => {
  it("moves to the next pending step after a capture", () => {
    expect(advanceCursor(withCaptured([0]), 0)).toBe(1);
  });

  it("skips over steps captured out of order", () => {
    expect(advanceCursor(withCaptured([0, 1]), 0)).toBe(2);
  });

  it("stays put when nothing pending follows — the caller reads that as the confirmation", () => {
    expect(advanceCursor(withCaptured([0, 1, 2]), 2)).toBe(2);

    const [onlyStep] = withCaptured([0]);
    expect(advanceCursor([onlyStep], 0)).toBe(0);
  });

  it("is a no-op on an empty guide", () => {
    expect(advanceCursor([], 0)).toBe(0);
  });
});

describe("selectStep", () => {
  it("returns the tapped index for a captured step", () => {
    expect(selectStep(withCaptured([0, 1]), 0, 1)).toBe(0);
  });

  it("returns the cursor for a pending step — a pending item is not selectable", () => {
    expect(selectStep(withCaptured([0]), 1, 1)).toBe(1);
  });

  it("returns the cursor for an index with no step at all", () => {
    expect(selectStep(threePending(), 99, 0)).toBe(0);
  });

  it("always returns the confirmation index — it is a step you may stand on", () => {
    expect(selectStep(threePending(), 3, 3)).toBe(3);
    expect(selectStep(threePending(), 3, 0)).toBe(3);
  });
});

describe("isViewingEarlierStep", () => {
  it("is false at the cursor, true anywhere else", () => {
    expect(isViewingEarlierStep(2, 2)).toBe(false);
    expect(isViewingEarlierStep(2, 0)).toBe(true);
  });

  it("is true when the cursor is the confirmation and the host is on a photo", () => {
    expect(isViewingEarlierStep(3, 2)).toBe(true);
  });
});

describe("isFlowComplete", () => {
  it("is true only when every step carries a photo", () => {
    expect(isFlowComplete(withCaptured([0, 1, 2]))).toBe(true);
    expect(isFlowComplete(withCaptured([0, 1]))).toBe(false);
    expect(isFlowComplete(threePending())).toBe(false);
  });

  it("is false for an empty guide — there is nothing to submit", () => {
    expect(isFlowComplete([])).toBe(false);
  });
});

describe("inspectionGuideSteps", () => {
  it("returns every photo, blank ones included, in order, plus the confirmation", () => {
    const items = inspectionGuideSteps(withCaptured([1]), 1, 1);

    expect(items.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(items.map((item) => item.isCaptured)).toEqual([false, true, false, false]);
    expect(items.map((item) => item.isConfirm)).toEqual([false, false, false, true]);
  });

  it("marks exactly one item current, and it is the cursor", () => {
    expect(
      inspectionGuideSteps(withCaptured([0]), 1, 1)
        .filter((item) => item.isCurrent)
        .map((item) => item.index),
    ).toEqual([1]);
  });

  it("marks the confirmation current when the cursor is on it", () => {
    expect(
      inspectionGuideSteps(withCaptured([0, 1, 2]), 3, 3)
        .filter((item) => item.isCurrent)
        .map((item) => item.index),
    ).toEqual([3]);
  });

  it("marks the step the host jumped into as active (prep §1)", () => {
    // Every photo is captured, the cursor is on the confirmation, and the host has tapped
    // photo 1: photo 1 alone is active.
    const items = inspectionGuideSteps(withCaptured([0, 1, 2]), 3, 1);

    expect(items.filter((item) => item.isActive).map((item) => item.index)).toEqual([1]);
  });

  it("does NOT mark every finished photo active — only the one being viewed", () => {
    // The bug this pins: `isActive: isCaptured(shot) && index !== cursorIndex` lit up
    // every completed step at once, which is the opposite of a "you are here" ring.
    const items = inspectionGuideSteps(withCaptured([0, 1, 2]), 3, 1);

    expect(items.map((item) => item.isActive)).toEqual([false, true, false, false]);
  });

  it("never marks the current item active — current wins", () => {
    const items = inspectionGuideSteps(withCaptured([0, 1, 2]), 1, 1);

    expect(items.filter((item) => item.isActive)).toEqual([]);
    expect(items.filter((item) => item.isCurrent).map((item) => item.index)).toEqual([1]);
  });

  it("never marks a pending step active, even if it is the viewed index", () => {
    // `selectStep` refuses to move `viewedIndex` onto a pending step, so this is
    // unreachable through the flow — pinned here as the helper's own guarantee.
    const items = inspectionGuideSteps(threePending(), 0, 2);

    expect(items.filter((item) => item.isActive)).toEqual([]);
  });

  it("marks at most one item active, whatever the cursor and viewed index are", () => {
    for (const cursor of [0, 1, 2, 3]) {
      for (const viewed of [0, 1, 2, 3]) {
        const items = inspectionGuideSteps(withCaptured([0, 1, 2]), cursor, viewed);
        const active = items.filter((item) => item.isActive);

        expect(
          active.length,
          `cursor ${cursor}, viewed ${viewed}`,
        ).toBeLessThanOrEqual(1);
        expect(
          items.filter((item) => item.isCurrent && item.isActive).length,
          `cursor ${cursor}, viewed ${viewed}`,
        ).toBe(0);
      }
    }
  });

  it("carries the preview URL only for a captured step", () => {
    const items = inspectionGuideSteps(withCaptured([2]), 0, 0);

    expect(items[2].imageUrl).toBe("blob:preview-2");
    expect(items[0].imageUrl).toBeNull();
    expect(items[3].imageUrl).toBeNull();
  });

  it("carries the shot's title and room so the item needs no lookup", () => {
    const items = inspectionGuideSteps(threePending(), 0, 0);

    expect(items[1].title).toBe("Shot 1");
    expect(items[1].roomLocation).toBe("KITCHEN");
    expect(items[1].shotId).toBe("shot-1");
  });

  it("gives the confirmation a stable id and no photo", () => {
    const [confirmation] = inspectionGuideSteps(threePending(), 3, 3).slice(-1);

    expect(confirmation.shotId).toBe("confirmation");
    expect(confirmation.isCaptured).toBe(false);
    expect(confirmation.title).toBe("");
  });

  it("returns just the confirmation for an empty guide", () => {
    const items = inspectionGuideSteps([], 0, 0);

    expect(items).toHaveLength(1);
    expect(items[0].isConfirm).toBe(true);
    expect(items[0].index).toBe(0);
  });
});

describe("confirmationProgress", () => {
  it("counts the photos and the shots, never the confirmation step", () => {
    expect(confirmationProgress(threePending(), 2)).toEqual({
      completed: 2,
      total: 3,
    });
  });
});
