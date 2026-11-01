import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import {
  DEFAULT_TOOLTIP_WIDTH,
  computeTooltipPlacement,
  type Rect,
  type TooltipPlacement,
} from "@/lib/helpers/tooltipPlacement";

/**
 * Prep §4's boundary, as a selector. `PageLayout` carries it; a panel whose trigger has no such
 * ancestor is clamped to the viewport instead (decisions D28).
 */
export const TOOLTIP_HOST_ATTR = "data-tooltip-host";

const EMPTY_RECT: Rect = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
};

function viewportRect(): Rect {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return { top: 0, left: 0, right: width, bottom: height, width, height };
}

/**
 * Measures a tooltip's trigger, its host and the panel itself, and asks
 * `computeTooltipPlacement` where the panel goes. The DOM half of phase 1 — the rule is in
 * `lib/helpers/`, this is only the reading.
 *
 * The layout effect has NO dependency array, on purpose. The panel's width is set BY the
 * placement and its height is an input TO the placement, so the first pass measures a panel that
 * is still at width 0 — wrapped to one character per line and therefore far too tall — and the
 * second pass measures the real thing. The `setPlacement` below returns the previous object
 * whenever nothing changed, which makes React bail out of the re-render and is what stops the
 * third pass being a fourth. Never drop that comparison guard.
 */
export function useTooltipPlacement(
  triggerRef: RefObject<HTMLElement | null>,
  preferred: "below" | "above" = "below",
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>(() =>
    computeTooltipPlacement({
      trigger: EMPTY_RECT,
      host: EMPTY_RECT,
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: 0,
      preferred,
    }),
  );

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const host = trigger.closest(`[${TOOLTIP_HOST_ATTR}]`);
    const next = computeTooltipPlacement({
      trigger: trigger.getBoundingClientRect(),
      host: host ? host.getBoundingClientRect() : viewportRect(),
      preferredWidth: DEFAULT_TOOLTIP_WIDTH,
      panelHeight: panel.offsetHeight,
      preferred,
    });

    setPlacement((previous) =>
      previous.left === next.left &&
      previous.top === next.top &&
      previous.width === next.width &&
      previous.placeBelow === next.placeBelow &&
      previous.align === next.align
        ? previous
        : next,
    );
  }, [preferred, triggerRef]);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return { panelRef, placement };
}
