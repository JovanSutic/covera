import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { inspectionGuideSteps } from "@/lib/helpers/guideFlow";
import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { PhotoStripItem } from "./PhotoStripItem";

function shots(captured: number[]): CapturedApartmentShot[] {
  return [0, 1].map((index) => ({
    id: `shot-${index}`,
    apartmentId: "apartment-1",
    roomLocation: "KITCHEN",
    shotType: "SWEEP_ONLY",
    title: `Shot ${index}`,
    instructions: `Instructions ${index}`,
    assetIds: [],
    createdAt: "2026-09-01T14:00:00.000Z",
    updatedAt: "2026-09-01T14:00:00.000Z",
    ...(captured.includes(index)
      ? { capturedImageUrl: `blob:preview-${index}` }
      : {}),
  }));
}

function renderItem(cursorIndex: number) {
  const [item] = inspectionGuideSteps(shots([0]), cursorIndex, cursorIndex);

  return render(<PhotoStripItem item={item} total={2} onSelect={vi.fn()} />)
    .container;
}

describe("PhotoStripItem's rings (prep §1)", () => {
  it("is current and not active — emerald only — when the cursor is on a captured step", () => {
    const container = renderItem(0);

    expect(container.firstElementChild).toHaveClass("ring-emerald-500");
    expect(container.firstElementChild).not.toHaveClass("ring-orange-400");
  });

  it("is active and not current — orange only — when the cursor has moved past a capture", () => {
    // The whole of prep §1: photo 0 is done, the cursor is on photo 1, photo 0 is the
    // one the host is looking at. In this phase `viewedIndex` does not exist yet, so
    // the helper cannot produce this state — phase 4 makes it reachable. The item's
    // rendering is pinned here so phase 4 changes one helper expression and no markup.
    const items = inspectionGuideSteps(shots([0]), 1, 1);
    const activeItem = { ...items[0], isActive: true, isCurrent: false };

    const container = render(
      <PhotoStripItem item={activeItem} total={2} onSelect={vi.fn()} />,
    ).container;

    expect(container.firstElementChild).toHaveClass("ring-orange-400");
    expect(container.firstElementChild).not.toHaveClass("ring-emerald-500");
  });

  it("renders emerald, not orange, when an item is somehow both (D2's ordering rule)", () => {
    const items = inspectionGuideSteps(shots([0]), 0, 0);
    const both = { ...items[0], isActive: true, isCurrent: true };

    const container = render(
      <PhotoStripItem item={both} total={2} onSelect={vi.fn()} />,
    ).container;

    // `currentRing` is applied last in the template literal, so it is the one that wins —
    // which puts emerald at the HIGHER index. (p3.md step 3.3 asserts the reverse; Tailwind
    // resolves a conflicting utility by source order in the stylesheet, not by class
    // attribute order, so the attribute order is only a proxy for the template literal.)
    const className = container.firstElementChild?.className ?? "";

    expect(className.indexOf("ring-emerald-500")).toBeGreaterThan(-1);
    expect(className.indexOf("ring-emerald-500")).toBeGreaterThan(
      className.indexOf("ring-orange-400"),
    );
  });

  it("has no ring at all when it is neither current nor active", () => {
    const container = renderItem(1);

    expect(container.firstElementChild).not.toHaveClass("ring-emerald-500");
    expect(container.firstElementChild).not.toHaveClass("ring-orange-400");
  });

  it("never marks more than one item active, and never the current one", () => {
    for (const cursorIndex of [0, 1]) {
      const items = inspectionGuideSteps(
        shots([0, 1]),
        cursorIndex,
        cursorIndex,
      );

      expect(items.filter((item) => item.isActive)).toEqual([]);
      expect(items.filter((item) => item.isCurrent)).toHaveLength(1);
    }
  });
});
