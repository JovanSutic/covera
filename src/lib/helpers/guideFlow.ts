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
 *
 * The confirmation (prep §3) is a STEP, and its index is `shots.length`. That is the
 * second thing this module owns: an index one past the last shot is the only index for
 * which `shots[index]` is undefined, and every function below treats it as a real
 * destination rather than as an error.
 *
 * Prep §1's active ring is the third: `inspectionGuideSteps` takes the cursor AND the
 * viewed index, and answers both "what is current" and "what has the host jumped into".
 */

/** One item of the transparency list (prep §1, §3). */
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
  /**
   * Prep §1: the captured step the host has jumped into, while the cursor is elsewhere.
   * Never true on the current item, and never true on more than one item — `isCurrent`
   * wins, and the item renders one ring.
   */
  isActive: boolean;
  /** Prep §3: the confirmation tile, the (N+1)th item. Exactly one item is the confirmation. */
  isConfirm: boolean;
}

/**
 * A step is captured when it carries a preview URL. The upload's own test is `rawFile`,
 * and `ShotStepPanel` sets both in the same call — this is the same pair, read for the
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
 * Prep §3: the flow's step count — one per photo, plus the confirmation. Written once,
 * here, because the confirmation's index and the strip's length are the same number and
 * a `+ 1` at a call site is how the two drift apart.
 */
export function stepCount(shots: CapturedApartmentShot[]): number {
  return shots.length + 1;
}

/** Prep §3: the confirmation's cursor index. The one index `shots[index]` cannot answer. */
export function confirmationIndex(shots: CapturedApartmentShot[]): number {
  return shots.length;
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
 * D20 as amended by prep §3: where a guide opens. A resumed guide (the page passes
 * `initialShots`, which can carry captures) lands on the first pending step; a fresh one
 * lands on 0, which is also its first pending step.
 *
 * An all-captured guide lands on the CONFIRMATION, which is where a host who has taken
 * every photo is going — the previous `?? 0` dropped them back on the first step with no
 * Next to press, because `advanceCursor` never moves past the last shot.
 */
export function initialCursorIndex(shots: CapturedApartmentShot[]): number {
  return nextPendingIndex(shots, -1) ?? confirmationIndex(shots);
}

/**
 * D2: the cursor moves on an explicit Next and on nothing else. It never moves backwards
 * and never wraps: when no pending step follows, it stays where it is. The caller reads
 * that "stayed put" as "step onto the confirmation" (prep §3) — the rule lives at the
 * call site because it is about Next, not about progress.
 */
export function advanceCursor(
  shots: CapturedApartmentShot[],
  cursorIndex: number,
): number {
  return nextPendingIndex(shots, cursorIndex) ?? cursorIndex;
}

/**
 * Prep §3: the confirmation is always selectable — it is a step the host is allowed to
 * stand on, and "Go to current step" has to be able to land on it.
 *
 * D21 otherwise stands: tapping a strip item shows that step and moves nothing else, and
 * a pending step is not selectable (prep §1: "Only the photo components with the photo
 * ... are clickable"), so the guard lives here rather than in the item's `onClick` — the
 * item renders no button for a pending step, and this is the second half of that same
 * rule, at the state layer where a stray call cannot bypass it.
 */
export function selectStep(
  shots: CapturedApartmentShot[],
  index: number,
  cursorIndex: number,
): number {
  if (index === confirmationIndex(shots)) return index;

  return isCaptured(shots[index]) ? index : cursorIndex;
}

/**
 * True while the host is looking at a capture that is not the cursor (prep §2). This, not
 * a flag, is what puts "Go to current step" on screen and takes "Next" off it.
 *
 * Prep §3 makes it also mean "the host is looking at a photo while the confirmation is
 * current", which is the state the whole of §3 exists to make reachable.
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
 * The strip's data (prep §1, §3). Invariant 10: the strip computes nothing — every
 * blank/pending, captured, current, active and confirmation decision is made here.
 *
 * Every photo is returned, in the API's order, blank ones included (prep §1: seeing how
 * many photos are needed is the point), and the confirmation is appended LAST (prep §3).
 *
 * The count is deliberately NOT a parameter: the strip never renders it, and an unused
 * parameter is a compile error here (`noUnusedParameters`). The confirmation's counter
 * comes from `confirmationProgress` below.
 */
export function inspectionGuideSteps(
  shots: CapturedApartmentShot[],
  cursorIndex: number,
  viewedIndex: number,
): StripItem[] {
  const photos: StripItem[] = shots.map((shot, index) => ({
    index,
    shotId: shot.id,
    title: shot.title,
    roomLocation: shot.roomLocation,
    imageUrl: shot.capturedImageUrl ?? null,
    isCaptured: isCaptured(shot),
    isCurrent: index === cursorIndex,
    // Prep §1: "the item that was already done and has the photo, and he will be moved to
    // that step ... the step is not somehow highlighted". So active is the step the host
    // CLICKED INTO — `viewedIndex` — and only while the cursor is somewhere else. It is
    // deliberately not "every captured step that is not current", which would light up
    // every finished photo at once. `isCurrent` wins when both would apply, so exactly one
    // item is ever active and the item renders one ring.
    //
    // The `isCaptured` guard is redundant on the path the flow takes — `selectStep` refuses
    // to move the view onto a pending step — and is here anyway: this module owns the
    // decision (invariant 10), and "active implies captured" is part of what the strip
    // relies on. A pending item renders no button, so a ring on one would be unreachable
    // *and* wrong.
    isActive: isCaptured(shot) && index === viewedIndex && index !== cursorIndex,
    isConfirm: false,
  }));

  const confirmation: StripItem = {
    index: shots.length,
    shotId: "confirmation",
    title: "",
    roomLocation: "",
    imageUrl: null,
    isCaptured: false,
    isCurrent: cursorIndex === shots.length,
    isActive: false,
    isConfirm: true,
  };

  return [...photos, confirmation];
}

/** The counter the confirmation tile shows: how many, of what. */
export function confirmationProgress(
  shots: CapturedApartmentShot[],
  completed: number,
): { completed: number; total: number } {
  return { completed, total: shots.length };
}
