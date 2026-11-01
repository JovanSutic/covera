import { describe, expect, it } from "vitest";

import {
  DEFAULT_TOOLTIP_WIDTH,
  TOOLTIP_GAP,
  computeTooltipPlacement,
  type Rect,
} from "./tooltipPlacement";

/** A 1000×800 page wrapper, which is roughly `PageLayout size="lg"` on a laptop. */
function host(): Rect {
  return { top: 0, left: 0, right: 1000, bottom: 800, width: 1000, height: 800 };
}

/** A 20×20 icon button sitting at (left, top). */
function trigger(left: number, top: number, size = 20): Rect {
  return {
    left,
    top,
    right: left + size,
    bottom: top + size,
    width: size,
    height: size,
  };
}

const PANEL_HEIGHT = 100;

describe("computeTooltipPlacement", () => {
  it("sits below the trigger, flush left, when there is room below", () => {
    const placement = computeTooltipPlacement({
      trigger: trigger(300, 100),
      host: host(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    expect(placement.placeBelow).toBe(true);
    expect(placement.align).toBe("left");
    expect(placement.left).toBe(300);
    expect(placement.top).toBe(100 + 20 + TOOLTIP_GAP);
    expect(placement.width).toBe(DEFAULT_TOOLTIP_WIDTH);
  });

  it("flips above when below would overflow the host and above would not", () => {
    const placement = computeTooltipPlacement({
      trigger: trigger(300, 750),
      host: host(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    expect(placement.placeBelow).toBe(false);
    expect(placement.top).toBe(750 - TOOLTIP_GAP - PANEL_HEIGHT);
  });

  it("honours a preferred side when both sides fit", () => {
    const placement = computeTooltipPlacement({
      trigger: trigger(300, 400),
      host: host(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
      preferred: "above",
    });

    expect(placement.placeBelow).toBe(false);
    expect(placement.top).toBe(400 - TOOLTIP_GAP - PANEL_HEIGHT);
  });

  it("stays on the requested side and clamps vertically when NEITHER side fits", () => {
    // A 200px-tall host with a 100px panel leaves no room above or below the trigger.
    const shortHost: Rect = {
      top: 0,
      left: 0,
      right: 1000,
      bottom: 200,
      width: 1000,
      height: 200,
    };

    const placement = computeTooltipPlacement({
      trigger: trigger(300, 90),
      host: shortHost,
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    // Below is the default, so below wins the tie, and the clamp pulls it to the last
    // position where it still ends inside the host.
    expect(placement.placeBelow).toBe(true);
    expect(placement.top).toBe(200 - PANEL_HEIGHT);
  });

  it("aligns to the RIGHT edge when the trigger is in the host's right half", () => {
    const placement = computeTooltipPlacement({
      trigger: trigger(700, 100),
      host: host(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    expect(placement.align).toBe("right");
    // The panel's right edge is flush with the trigger's right edge (720).
    expect(placement.left).toBe(720 - DEFAULT_TOOLTIP_WIDTH);
  });

  it("clamps the width to the host and pins left when the panel is wider than its host", () => {
    const narrowHost: Rect = {
      top: 0,
      left: 0,
      right: 200,
      bottom: 800,
      width: 200,
      height: 800,
    };

    const placement = computeTooltipPlacement({
      trigger: trigger(40, 100),
      host: narrowHost,
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    expect(placement.width).toBe(200);
    expect(placement.left).toBe(0);
  });

  it("clamps the left edge up to the host when the trigger overhangs it", () => {
    const placement = computeTooltipPlacement({
      trigger: trigger(-50, 100, 100),
      host: host(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    expect(placement.align).toBe("left");
    expect(placement.left).toBe(0);
  });

  it("clamps the right edge back into the host when the trigger overhangs it", () => {
    const narrowHost: Rect = {
      top: 0,
      left: 0,
      right: 700,
      bottom: 800,
      width: 700,
      height: 800,
    };

    const placement = computeTooltipPlacement({
      trigger: trigger(900, 100, 100),
      host: narrowHost,
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
    });

    expect(placement.left).toBe(700 - DEFAULT_TOOLTIP_WIDTH);
  });

  it("takes a gap override", () => {
    const placement = computeTooltipPlacement({
      trigger: trigger(300, 100),
      host: host(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: PANEL_HEIGHT,
      gap: 20,
    });

    expect(placement.top).toBe(100 + 20 + 20);
  });

  it("pins to the host's top when the panel is taller than the host", () => {
    const shortHost: Rect = {
      top: 50,
      left: 0,
      right: 1000,
      bottom: 120,
      width: 1000,
      height: 70,
    };

    const placement = computeTooltipPlacement({
      trigger: trigger(300, 60),
      host: shortHost,
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: 200,
    });

    expect(placement.top).toBe(50);
  });
});
