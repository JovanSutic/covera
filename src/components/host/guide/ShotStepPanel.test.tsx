import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import {
  advanceCursor,
  capturedCount,
  isCaptured,
  isViewingEarlierStep,
  nextPendingIndex,
  selectStep,
} from "@/lib/helpers/guideFlow";
import { useCapturedShots } from "./useCapturedShots";
import { ShotStepPanel } from "./ShotStepPanel";

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

/**
 * The phase-5 orchestrator's state, in miniature: the same helper calls in the same
 * order, so this test fails if the flow's rules change even though the orchestrator does
 * not exist yet.
 */
function Harness({ initial }: { initial: CapturedApartmentShot[] }) {
  const { shots, capture } = useCapturedShots(initial);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [viewedIndex, setViewedIndex] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(true);

  const shot = shots[viewedIndex];

  /** What phase 5's `PhotoStrip` calls when a captured item is tapped. */
  const openStep = (index: number) => {
    const selected = selectStep(shots, index, cursorIndex);
    setViewedIndex(selected);
    setIsCameraOpen(!isCaptured(shots[selected]));
  };

  return (
    <div>
      {/* The strip's two jobs, as two buttons: jump to step 0 or to step 1. */}
      <button type="button" onClick={() => openStep(0)}>
        stub-jump-0
      </button>
      <button type="button" onClick={() => openStep(1)}>
        stub-jump-1
      </button>

      <ShotStepPanel
        shot={shot}
        shotIndexInRoom={viewedIndex + 1}
        roomShotCount={shots.length}
        completedCount={capturedCount(shots)}
        totalCount={shots.length}
        isCameraOpen={isCameraOpen}
        isCaptured={isCaptured(shot)}
        isViewingEarlierStep={isViewingEarlierStep(cursorIndex, viewedIndex)}
        hasNextStep={nextPendingIndex(shots, cursorIndex) !== null}
        disabled={false}
        onCapture={(url, file) => {
          capture(viewedIndex, url, file);
          setIsCameraOpen(false);
        }}
        onCameraCancel={() => setIsCameraOpen(false)}
        onOpenCamera={() => setIsCameraOpen(true)}
        onNext={() => {
          const next = advanceCursor(shots, cursorIndex);
          setCursorIndex(next);
          setViewedIndex(next);
          setIsCameraOpen(!isCaptured(shots[next]));
        }}
        onGoToCurrent={() => {
          setViewedIndex(cursorIndex);
          setIsCameraOpen(!isCaptured(shots[cursorIndex]));
        }}
        renderCamera={(onCapture, onCancel) => (
          <div>
            <button
              type="button"
              onClick={() => onCapture("blob:preview", new File([], "a.jpg"))}
            >
              stub-shutter
            </button>
            <button type="button" onClick={onCancel}>
              stub-cancel
            </button>
          </div>
        )}
      />
    </div>
  );
}

const shutter = () => screen.getByRole("button", { name: "stub-shutter" });
const next = () => screen.getByRole("button", { name: "shotGuide.actions.next" });
const retake = () => screen.getByRole("button", { name: /shotGuide.camera.retakePhoto/ });
// No `openCamera` helper: the two assertions that mention that control are negative, and
// a `getByRole` helper throws when the element is absent. They query inline instead.
const goToCurrent = () =>
  screen.getByRole("button", { name: "shotGuide.actions.goToCurrent" });
const jumpTo = (index: number) =>
  screen.getByRole("button", { name: `stub-jump-${index}` });

/**
 * The progress counter. `test-setup.ts` global-mocks `react-i18next` with a
 * single-argument `t`, so the interpolation options are dropped and the counter's own
 * value never reaches the DOM — it is asserted by its key. The value it is fed
 * (`capturedCount`) is pinned by `guideFlow.test.ts` instead (invariant 9).
 */
const progress = () => screen.getByText("shotGuide.header.completedCount");

describe("the step's capture state", () => {
  it("opens on the camera, with Next disabled until the photo exists", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    expect(screen.getByText("Shot 0")).toBeInTheDocument();
    expect(next()).toBeDisabled();

    await user.click(shutter());

    expect(next()).toBeEnabled();
  });

  it("closing the camera shows the photo large with the retake control", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());

    expect(screen.queryByRole("button", { name: "stub-shutter" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Shot 0" })).toHaveAttribute(
      "src",
      "blob:preview",
    );
    expect(retake()).toBeInTheDocument();
  });

  it("does NOT move the cursor on capture — the host stays on the captured step (D2)", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());

    expect(screen.getByText("Shot 0")).toBeInTheDocument();
    expect(progress()).toBeInTheDocument();
  });

  it("advances to the next pending step on Next, and opens its camera", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());
    await user.click(next());

    expect(screen.getByText("Shot 1")).toBeInTheDocument();
    expect(shutter()).toBeInTheDocument();
  });

  it("retaking replaces the step's photo rather than adding one", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());
    await user.click(retake());

    // The camera is back and the counter is still there: a retake is not a capture. That it
    // still reads 1 of 3 is `capturedCount`'s guarantee, pinned in `guideFlow.test.ts`.
    expect(shutter()).toBeInTheDocument();
    expect(progress()).toBeInTheDocument();
  });

  it("offers Go to current step, and no Next, while viewing an earlier captured step (D4)", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    // Capture 0, advance to 1. The cursor is now on 1; 0 is behind it and captured.
    await user.click(shutter());
    await user.click(next());

    await user.click(jumpTo(0));

    expect(screen.getByText("Shot 0")).toBeInTheDocument();
    expect(goToCurrent()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "shotGuide.actions.next" })).not.toBeInTheDocument();
    expect(retake()).toBeInTheDocument();
  });

  it("returns to the cursor on Go to current step, and Next comes back", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());
    await user.click(next());
    await user.click(jumpTo(0));
    await user.click(goToCurrent());

    expect(screen.getByText("Shot 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "shotGuide.actions.goToCurrent" })).not.toBeInTheDocument();
    expect(next()).toBeInTheDocument();
  });

  it("opens a pending step's panel read-only — the camera control, never a retake", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    // Step 1 is pending, so `openStep(1)` is a no-op for selection... but the jump button
    // exercises the same helper. Capture 0 first so the cursor is behind it, then jump.
    await user.click(shutter());
    await user.click(next());
    await user.click(jumpTo(1));

    // 1 is the cursor and is pending: the camera is open, so neither control is on screen.
    expect(shutter()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retakePhoto/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /openCamera/ })).not.toBeInTheDocument();
  });

  it("shows no Next, and the take-the-photo hint, on the last pending step", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());
    await user.click(next());
    await user.click(shutter());
    await user.click(next());

    expect(screen.getByText("Shot 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "shotGuide.actions.next" })).not.toBeInTheDocument();
    expect(screen.getByText("shotGuide.actions.takePhotoFirst")).toBeInTheDocument();
  });
});
