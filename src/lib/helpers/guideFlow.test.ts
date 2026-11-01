import { describe, expect, it } from "vitest";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import {
  advanceCursor,
  capturedCount,
  initialCursorIndex,
  isCaptured,
  isFlowComplete,
  isViewingEarlierStep,
  nextPendingIndex,
  selectStep,
  stripItems,
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

describe("nextPendingIndex", () => {
  it("finds the first pending step strictly after the cursor", () => {
    expect(nextPendingIndex(threePending(), -1)).toBe(0);
    expect(nextPendingIndex(threePending(), 0)).toBe(1);
  });

  it("skips the steps already captured", () => {
    // 1 is captured, so from 0 the next pending step is 2, not 1.
    expect(nextPendingIndex(withCaptured([1]), 0)).toBe(2);
  });

  it("returns null when nothing pending remains", () => {
    expect(nextPendingIndex(withCaptured([0, 1, 2]), 0)).toBeNull();
    expect(nextPendingIndex([], -1)).toBeNull();
  });

  it("never looks backwards", () => {
    // 0 is pending but sits behind the cursor: from 1 there is no next pending step.
    expect(nextPendingIndex(withCaptured([2]), 1)).toBeNull();
  });
});

describe("initialCursorIndex", () => {
  it("opens a fresh guide on the first step", () => {
    expect(initialCursorIndex(threePending())).toBe(0);
  });

  it("opens a resumed guide on the first PENDING step", () => {
    // D20: steps 0 and 1 are done, so the host lands where the work is.
    expect(initialCursorIndex(withCaptured([0, 1]))).toBe(2);
  });

  it("opens an all-captured guide on 0, so the cursor is never null", () => {
    expect(initialCursorIndex(withCaptured([0, 1, 2]))).toBe(0);
  });

  it("opens an empty guide on 0", () => {
    expect(initialCursorIndex([])).toBe(0);
  });
});

describe("advanceCursor", () => {
  it("moves to the next pending step after a capture", () => {
    // Step 0 was just captured; the cursor was on it.
    expect(advanceCursor(withCaptured([0]), 0)).toBe(1);
  });

  it("skips over steps captured out of order", () => {
    expect(advanceCursor(withCaptured([0, 1]), 0)).toBe(2);
  });

  it("stays put when nothing pending follows — it does not wrap to a captured step", () => {
    expect(advanceCursor(withCaptured([0, 1, 2]), 2)).toBe(2);

    // A guide with a single step: the cursor sits on it, nothing follows it, and it
    // must not wrap back to the captured step it is already on.
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
});

describe("isViewingEarlierStep", () => {
  it("is false at the cursor, true anywhere else", () => {
    expect(isViewingEarlierStep(2, 2)).toBe(false);
    expect(isViewingEarlierStep(2, 0)).toBe(true);
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

describe("stripItems", () => {
  it("returns every step, blank ones included, in order", () => {
    const items = stripItems(withCaptured([1]), 1);

    expect(items.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(items.map((item) => item.isCaptured)).toEqual([false, true, false]);
  });

  it("marks exactly one item current, and it is the cursor", () => {
    const items = stripItems(withCaptured([0]), 1);

    expect(items.filter((item) => item.isCurrent).map((item) => item.index)).toEqual([1]);
  });

  it("carries the preview URL only for a captured step", () => {
    const items = stripItems(withCaptured([2]), 0);

    expect(items[2].imageUrl).toBe("blob:preview-2");
    expect(items[0].imageUrl).toBeNull();
  });

  it("carries the shot's title and room so the item needs no lookup", () => {
    const items = stripItems(threePending(), 0);

    expect(items[1].title).toBe("Shot 1");
    expect(items[1].roomLocation).toBe("KITCHEN");
    expect(items[1].shotId).toBe("shot-1");
  });

  it("returns nothing for an empty guide", () => {
    expect(stripItems([], 0)).toEqual([]);
  });
});
