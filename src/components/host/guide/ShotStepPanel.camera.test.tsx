import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { ShotStepPanel } from "./ShotStepPanel";

/**
 * jsdom implements no `URL.createObjectURL` — the gap D24b's injection seam exists for.
 * The stub below is what lets this file drive the *real* control rather than a substitute.
 */
beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:preview"),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const shot: CapturedApartmentShot = {
  id: "shot-0",
  apartmentId: "apartment-1",
  roomLocation: "KITCHEN",
  shotType: "SWEEP_ONLY",
  title: "Shot 0",
  instructions: "Instructions 0",
  assetIds: [],
  createdAt: "2026-09-01T14:00:00.000Z",
  updatedAt: "2026-09-01T14:00:00.000Z",
};

describe("the panel's own camera control (D30)", () => {
  it("renders the native trigger when no camera is injected", () => {
    render(
      <ShotStepPanel
        shot={shot}
        shotIndexInRoom={1}
        roomShotCount={1}
        completedCount={0}
        totalCount={1}
        isCaptured={false}
        isViewingEarlierStep={false}
        hasNextStep={false}
        disabled={false}
        onCapture={() => {}}
        onNext={() => {}}
        onGoToCurrent={() => {}}
      />,
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input).toHaveAttribute("accept", "image/*");
    expect(input).toHaveAttribute("capture", "environment");
    // It is reachable through the label the host sees, not a separate view.
    expect(screen.getByText("shotGuide.camera.openCamera")).toBeInTheDocument();
  });

  it("hands the file and a preview URL to onCapture, and lets the same file be re-chosen", () => {
    const onCapture = vi.fn();
    render(
      <ShotStepPanel
        shot={shot}
        shotIndexInRoom={1}
        roomShotCount={1}
        completedCount={0}
        totalCount={1}
        isCaptured={false}
        isViewingEarlierStep={false}
        hasNextStep={false}
        disabled={false}
        onCapture={onCapture}
        onNext={() => {}}
        onGoToCurrent={() => {}}
      />,
    );

    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0][0]).toBe("blob:preview");
    expect(onCapture.mock.calls[0][1]).toBe(file);

    // `value` is cleared, so re-choosing the same photo still fires `change` — that is
    // what makes Retake take a second photo rather than silently doing nothing.
    expect(input.value).toBe("");
  });
});