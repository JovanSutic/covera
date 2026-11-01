import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";
import { capturedCount } from "./guideFlow";

/**
 * D11: the ONE answer to "should leaving this guide be confirmed". Both exits ask it —
 * the data-router blocker for an in-app navigation, the `beforeunload` listener for a tab
 * close — so the two can never disagree about whether the host has unsaved work.
 *
 * `isSubmitting` is deliberately NOT a reason to block. While a submission is in flight
 * the page renders a full-screen overlay, so the host cannot reach a link anyway, and a
 * confirmation stacked on top of that overlay would be a trap rather than a protection.
 * The `beforeunload` warning still fires while submitting (D10) — that is the one exit
 * where a closed tab genuinely costs an upload.
 */
export function canLeaveGuide(
  shots: CapturedApartmentShot[],
  isSubmitting: boolean,
): boolean {
  if (isSubmitting) return true;

  return capturedCount(shots) === 0;
}
