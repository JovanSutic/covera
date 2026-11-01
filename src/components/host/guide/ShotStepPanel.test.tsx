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
 *
 * D30: there is no camera flag. The panel is the flow's only step view and its camera
 * control is the native camera's trigger, so the injected stub below replaces that control
 * rather than standing in for a screen the flow switches to.
 */
function Harness({ initial }: { initial: CapturedApartmentShot[] }) {
  const { shots, capture } = useCapturedShots(initial);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [viewedIndex, setViewedIndex] = useState(0);

  const shot = shots[viewedIndex];

  /** What phase 5's `PhotoStrip` calls when a captured item is tapped. */
  const openStep = (index: number) => {
    setViewedIndex(selectStep(shots, index, cursorIndex));
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
        isCaptured={isCaptured(shot)}
        isViewingEarlierStep={isViewingEarlierStep(cursorIndex, viewedIndex)}
        hasNextStep={nextPendingIndex(shots, cursorIndex) !== null}
        disabled={false}
        onCapture={(url, file) => {
          capture(viewedIndex, url, file);
        }}
        onNext={() => {
          const next = advanceCursor(shots, cursorIndex);
          setCursorIndex(next);
          setViewedIndex(next);
        }}
        onGoToCurrent={() => {
          setViewedIndex(cursorIndex);
        }}
        renderCamera={(onCapture) => (
          <button
            type="button"
            onClick={() => onCapture("blob:preview", new File([], "a.jpg"))}
          >
            stub-shutter
          </button>
        )}
      />
    </div>
  );
}

const shutter = () => screen.getByRole("button", { name: "stub-shutter" });
const next = () => screen.getByRole("button", { name: "shotGuide.actions.next" });
// No `retake`/`openCamera` helpers: the injected stub REPLACES the panel's camera control,
// label included, so `shotGuide.camera.*` is never in this test's DOM. The control's own
// presence is asserted through `shutter()`, and its label is pinned by phase 2/3 markup.
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
  it("shows the step panel, with Next disabled until the photo exists", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    expect(screen.getByText("Shot 0")).toBeInTheDocument();
    expect(next()).toBeDisabled();

    await user.click(shutter());

    expect(next()).toBeEnabled();
  });

  it("shows the captured photo large in the panel, with the camera control still on screen", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());

    expect(screen.getByRole("img", { name: "Shot 0" })).toHaveAttribute(
      "src",
      "blob:preview",
    );
    // D30: the control is the native camera's trigger and is always mounted — the capture
    // does not swap the panel for a different view, which was the defect this phase fixes.
    expect(shutter()).toBeInTheDocument();
  });

  it("does NOT move the cursor on capture — the host stays on the captured step (D2)", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    await user.click(shutter());

    expect(screen.getByText("Shot 0")).toBeInTheDocument();
    expect(progress()).toBeInTheDocument();
  });

  it("advances to the next pending step on Next", async () => {
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
    await user.click(shutter());

    // Two captures on the same step: the heading is unchanged and Next is enabled, which
    // can only be the one step carrying a photo. That the counter still reads 1 of 3 is
    // `capturedCount`'s guarantee, pinned in `guideFlow.test.ts`.
    expect(screen.getByText("Shot 0")).toBeInTheDocument();
    expect(next()).toBeEnabled();
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

  it("opens a pending step read-only — its camera control, and a disabled Next", async () => {
    const user = userEvent.setup();
    render(<Harness initial={threePending()} />);

    // Step 1 is pending, so `openStep(1)` is a no-op for selection... but the jump button
    // exercises the same helper. Capture 0 first so the cursor is behind it, then jump.
    await user.click(shutter());
    await user.click(next());
    await user.click(jumpTo(1));

    // 1 is the cursor and is pending: the control is there to take the photo, and nothing
    // offers to move on until it is taken.
    expect(screen.getByText("Shot 1")).toBeInTheDocument();
    expect(shutter()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "shotGuide.actions.goToCurrent" })).not.toBeInTheDocument();
    expect(next()).toBeDisabled();
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