import type { CapturedApartmentShot } from "@/lib/api/submitPhotoProofs";

/**
 * D1: the ONLY computation of "where is the host in the photo-proof flow". The strip,
 * the step panel, the review screen and the exit guard all ask these functions instead
 * of comparing `capturedImageUrl` themselves — the same reason `proofWindow.ts` exists:
 * the control that offers an action and the surface that refuses it cannot drift if
 * they share one answer.
 *
 * Everything here is pure. `shots` is always a `CapturedApartmentShot[]`; these
 * functions never mutate it and never read a clock.
 */

/** One item of the transparency list (prep §1). */
export interface StripItem {
  index: number;
  shotId: string;
  title: string;
  roomLocation: string;
  /** The local object URL of the capture, or null while the step is pending. */
  imageUrl: string | null;
  isCaptured: boolean;
  /** The step sequential progress stopped at (prep §1). Exactly one item is current. */
  isCurrent: boolean;
}

/**
 * A step is captured when it carries a preview URL. The upload's own test is `rawFile`,
 * and `InlineCamera` sets both in the same call — this is the same pair, read for the
 * screen rather than for the request.
 */
export function isCaptured(shot: CapturedApartmentShot | undefined): boolean {
  return Boolean(shot?.capturedImageUrl);
}

/** How many steps carry a photo. The progress counter's numerator. */
export function capturedCount(shots: CapturedApartmentShot[]): number {
  return shots.filter(isCaptured).length;
}

/**
 * The first pending step strictly after `fromIndex`, or null when none remains.
 * Strictly after, not at: `fromIndex` is the step just captured, and a captured step
 * is never "next".
 */
export function nextPendingIndex(
  shots: CapturedApartmentShot[],
  fromIndex: number,
): number | null {
  for (let index = fromIndex + 1; index < shots.length; index += 1) {
    if (!isCaptured(shots[index])) return index;
  }

  return null;
}

/**
 * D20: where a guide opens. A resumed guide (the page passes `initialShots`, which can
 * carry captures) lands on the first pending step; a fresh one lands on 0, which is also
 * its first pending step. An all-captured guide lands on 0 rather than nowhere — the
 * review screen ignores the cursor, and a null cursor would be a second empty state.
 */
export function initialCursorIndex(shots: CapturedApartmentShot[]): number {
  return nextPendingIndex(shots, -1) ?? 0;
}

/**
 * D2: the cursor moves on an explicit Next and on nothing else. It never moves backwards
 * and never wraps: when no pending step follows, it stays where it is. `isFlowComplete`
 * is the signal that the flow is done, not a moved cursor.
 */
export function advanceCursor(
  shots: CapturedApartmentShot[],
  cursorIndex: number,
): number {
  return nextPendingIndex(shots, cursorIndex) ?? cursorIndex;
}

/**
 * D21: tapping a strip item shows that step and moves nothing else. A pending step is not
 * selectable (prep §1: "Only the photo components with the photo ... are clickable"), so
 * the guard lives here rather than in the item's `onClick` — the item renders no button
 * for a pending step, and this is the second half of that same rule, at the state layer
 * where a stray call cannot bypass it.
 */
export function selectStep(
  shots: CapturedApartmentShot[],
  index: number,
  cursorIndex: number,
): number {
  return isCaptured(shots[index]) ? index : cursorIndex;
}

/**
 * True while the host is looking at a captured step that is not the cursor (prep §2).
 * This, not a flag, is what puts "Go to current step" on screen and takes "Next" off it.
 */
export function isViewingEarlierStep(
  cursorIndex: number,
  viewedIndex: number,
): boolean {
  return viewedIndex !== cursorIndex;
}

/**
 * D16: the flow is complete when every step carries a photo. An empty guide is NOT
 * complete — completeness renders the review screen, and `shots.length === 0` renders the
 * existing `noShots` panel instead. Conflating the two would put a Submit button on a
 * guide that has nothing to submit, which `submitInspectionPhotos` would then reject.
 */
export function isFlowComplete(shots: CapturedApartmentShot[]): boolean {
  return shots.length > 0 && shots.every(isCaptured);
}

/**
 * The strip's data. Invariant 10: the strip computes nothing — every blank/pending,
 * captured, and current decision is made here. Every item is returned, in the API's
 * order, blank ones included: seeing how many photos are needed is the point (prep §1).
 */
export function stripItems(
  shots: CapturedApartmentShot[],
  cursorIndex: number,
): StripItem[] {
  return shots.map((shot, index) => ({
    index,
    shotId: shot.id,
    title: shot.title,
    roomLocation: shot.roomLocation,
    imageUrl: shot.capturedImageUrl ?? null,
    isCaptured: isCaptured(shot),
    isCurrent: index === cursorIndex,
  }));
}
