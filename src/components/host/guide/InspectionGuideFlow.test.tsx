import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";

import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { InspectionGuideFlow } from "./InspectionGuideFlow";

/** A two-photo guide, which is the smallest guide that can show prep §3's bug. */
function twoPending(): CapturedApartmentShot[] {
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
  }));
}

let captureSeq = 0;

/**
 * The flow calls `useGuideExitGuard`, whose `useBlocker` throws outside a DATA router —
 * `MemoryRouter` is not one. So the harness builds the smallest `createMemoryRouter` that
 * hosts the component, which is the same constraint `router.behaviour.test.ts` documents.
 */
function renderFlow() {
  captureSeq = 0;

  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <InspectionGuideFlow
            initialShots={twoPending()}
            onSubmit={() => {}}
            renderCamera={(onCapture) => (
              <button
                type="button"
                onClick={() => {
                  captureSeq += 1;
                  onCapture(`blob:preview-${captureSeq}`, new File([], "a.jpg"));
                }}
              >
                stub-shutter
              </button>
            )}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
}

const shutter = () => screen.getByRole("button", { name: "stub-shutter" });
const next = () => screen.getByRole("button", { name: "shotGuide.actions.next" });
const submit = () =>
  screen.getByRole("button", { name: "shotGuide.review.submit" });
const stripItems = () => screen.getAllByTestId("guide-strip-item");
const goToCurrent = () =>
  screen.getByRole("button", { name: "shotGuide.actions.goToCurrent" });

describe("the confirmation as the (N+1)th step (prep §3)", () => {
  it("renders one strip item per photo, plus the confirmation", () => {
    renderFlow();

    expect(stripItems()).toHaveLength(3);
  });

  it("labels the confirmation item and marks it current once the cursor lands on it", async () => {
    const user = userEvent.setup();
    renderFlow();

    // Take both photos, pressing Next after each.
    for (let photo = 0; photo < 2; photo += 1) {
      await user.click(shutter());
      await user.click(next());
    }

    // The confirmation is on screen: this is the whole fix — before prep §3 the last Next
    // stayed on the last photo and there was no submit here at all.
    expect(screen.getByText("shotGuide.review.title")).toBeInTheDocument();
    expect(submit()).toBeInTheDocument();

    const [first, second, confirmation] = stripItems();
    expect(first).not.toHaveAttribute("aria-current");
    expect(second).not.toHaveAttribute("aria-current");
    expect(confirmation).toHaveAttribute("aria-current", "step");
    expect(confirmation).toHaveClass("ring-emerald-500");
  });

  it("keeps every photo reachable from the confirmation, and returns to it (prep §3)", async () => {
    const user = userEvent.setup();
    renderFlow();

    for (let photo = 0; photo < 2; photo += 1) {
      await user.click(shutter());
      await user.click(next());
    }

    // Tap the last photo — the retake case the prep is about.
    await user.click(stripItems()[1]);

    expect(screen.getByText("Shot 1")).toBeInTheDocument();
    expect(shutter()).toBeInTheDocument();
    expect(goToCurrent()).toBeInTheDocument();

    // And back to the confirmation, which is logically where "current" is.
    await user.click(goToCurrent());

    expect(screen.getByText("shotGuide.review.title")).toBeInTheDocument();
    expect(submit()).toBeInTheDocument();
  });

  it("marks a done capture the host is looking at as active, and the cursor's own item as current", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(shutter());
    await user.click(next());
    await user.click(shutter());
    await user.click(next());

    // Now on the confirmation; tap photo 0.
    await user.click(stripItems()[0]);

    const [photo0, photo1, confirmation] = stripItems();
    // Prep §1: only active — the current step is the confirmation.
    expect(photo0).toHaveClass("ring-orange-400");
    expect(photo0).not.toHaveClass("ring-emerald-500");
    // photo1 is captured but neither current nor viewed.
    expect(photo1).not.toHaveClass("ring-orange-400");
    expect(photo1).not.toHaveClass("ring-emerald-500");
    // The confirmation is the current step, so green.
    expect(confirmation).toHaveClass("ring-emerald-500");
    expect(confirmation).not.toHaveClass("ring-orange-400");
  });

  it("offers Next on the last photo, and it leads to the confirmation", async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(shutter());
    await user.click(next());

    // On the last photo (cursor 1 of 0..1). Before prep §3 this step rendered the
    // "take a photo to continue" hint and no Next at all, so the confirmation was
    // unreachable — the bug the whole of §3 exists to fix.
    expect(screen.getByText("Shot 1")).toBeInTheDocument();
    // The D5 rule still holds on this step: Next exists but waits for the photo.
    expect(next()).toBeDisabled();

    await user.click(shutter());
    expect(next()).toBeEnabled();

    await user.click(next());

    expect(screen.getByText("shotGuide.review.title")).toBeInTheDocument();
  });

  it("does not offer Go to current step while on the confirmation", async () => {
    const user = userEvent.setup();
    renderFlow();

    for (let photo = 0; photo < 2; photo += 1) {
      await user.click(shutter());
      await user.click(next());
    }

    expect(
      screen.queryByRole("button", { name: "shotGuide.actions.goToCurrent" }),
    ).not.toBeInTheDocument();
  });
});
