/**
 * Prep §4: where a tooltip panel goes, given the trigger and the box it must stay inside.
 *
 * This module is deliberately NOT the measuring half. `getBoundingClientRect` is DOM and jsdom
 * reports it as all zeros, so a test of the measurement asserts nothing; the *rule* is four
 * comparisons and every one of them is a test case in the file beside this one. The same split
 * `proofWindow.ts` and `reservationActions.ts` already use.
 *
 * Coordinates are viewport coordinates — the shape `getBoundingClientRect()` returns — because the
 * panel is rendered `position: fixed`. That is what makes scroll and resize a re-measure rather
 * than an offset calculation.
 */

/** A rectangle in viewport coordinates. Satisfied by a `DOMRect`. */
export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TooltipPlacementInput {
  /** The control the panel hangs off. */
  trigger: Rect;
  /** The box the panel may not cross — `PageLayout`'s element, or the viewport. */
  host: Rect;
  /** The width the panel would like. Clamped to the host, never the other way round. */
  preferredWidth: number;
  /** The panel's own measured height. The caller measures it; this function cannot. */
  panelHeight: number;
  /** Space between the trigger and the panel. Defaults to `TOOLTIP_GAP`. */
  gap?: number;
  /** Which side to try first. Defaults to below. */
  preferred?: "below" | "above";
}

export interface TooltipPlacement {
  /** Viewport x of the panel's top-left corner. */
  left: number;
  /** Viewport y of the panel's top-left corner. */
  top: number;
  /** The panel must render at this width or it can exceed the host. */
  width: number;
  /** Which side of the trigger the panel ended up on — also the arrow's side. */
  placeBelow: boolean;
  /** Which horizontal edge is flush with the trigger — also the arrow's side. */
  align: "left" | "right";
}

/** The house tooltip width: the `w-64` this replaced (decisions D32). */
export const DEFAULT_TOOLTIP_WIDTH = 288;

/** The house gap between a trigger and its panel. */
export const TOOLTIP_GAP = 8;

export function computeTooltipPlacement(
  input: TooltipPlacementInput,
): TooltipPlacement {
  const gap = input.gap ?? TOOLTIP_GAP;

  // Prep §4, sentence 3: the panel is never wider than the box it lives in. This is the one
  // clamp that has to happen before anything else, because every horizontal decision below
  // assumes a width that fits.
  const width = Math.min(input.preferredWidth, input.host.width);

  // Sentence 2, vertical half: below by default, above when below overflows and above does not.
  const belowTop = input.trigger.bottom + gap;
  const aboveTop = input.trigger.top - gap - input.panelHeight;
  const fitsBelow = belowTop + input.panelHeight <= input.host.bottom;
  const fitsAbove = aboveTop >= input.host.top;

  const preferBelow = input.preferred !== "above";
  // When neither side fits, the requested side wins and the clamp below pulls it back in —
  // flipping to a side that also overflows would only move which edge is cut off.
  const placeBelow = preferBelow ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;

  const rawTop = placeBelow ? belowTop : aboveTop;
  const maxTop = Math.max(input.host.top, input.host.bottom - input.panelHeight);
  const top = Math.min(Math.max(rawTop, input.host.top), maxTop);

  // Sentence 2, horizontal half: point the panel away from the crowded edge. A trigger in the
  // host's right half gets a panel whose right edge is flush with it, and vice versa — which is
  // "if they are opened on the far right they should be pointed to left where the space is".
  const triggerCenter = input.trigger.left + input.trigger.width / 2;
  const hostCenter = input.host.left + input.host.width / 2;
  const align: "left" | "right" = triggerCenter <= hostCenter ? "left" : "right";

  const rawLeft =
    align === "left" ? input.trigger.left : input.trigger.right - width;
  // Sentence 3, horizontal half. `maxLeft` cannot go below `minLeft`, because `width` was already
  // clamped to the host — so a panel wider than its host pins to the host's left edge instead of
  // producing an inverted range.
  const minLeft = input.host.left;
  const maxLeft = Math.max(minLeft, input.host.right - width);
  const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);

  return { left, top, width, placeBelow, align };
}
