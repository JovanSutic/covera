import type { ReactNode, RefObject } from "react";

import { useTooltipPlacement } from "@/hooks/useTooltipPlacement";
import { cn } from "@/lib/utils";

export interface TooltipPanelProps {
  /**
   * The control the panel hangs off. It must sit inside a `[data-tooltip-host]` box for the
   * panel to be clamped to the page wrapper; without one it is clamped to the viewport.
   */
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Which side to try first. Defaults to below. */
  preferred?: "below" | "above";
}

/**
 * The app's one tooltip panel (prep §4). It owns the measured position so neither of the two
 * tooltip components has to.
 *
 * It is `fixed` and its coordinates are viewport coordinates, which is why the hook re-measures
 * on scroll and resize instead of computing an offset.
 *
 * It is `invisible` rather than `hidden`: a `display: none` panel has no `offsetHeight`, and the
 * panel's height is an input to its own placement. `group-hover` / `group-focus-within` are
 * read off the `group/tooltip` wrapper the CALLER renders — this component supplies no trigger
 * and no group, because both call sites already have one.
 *
 * The wrapper the caller renders must be `position: static` (or `relative`, which is the same
 * for a fixed child): `position: fixed` is relative to the viewport, so the wrapper cannot move
 * the panel, it only has to be the hover/focus group.
 *
 * The panel is a plain flex item, so unlike the version this replaced it has ink — an
 * absolutely-positioned box with no ink does not grow an inline formatting context, which is
 * what let the old panel escape its row.
 */
export function TooltipPanel({
  triggerRef,
  children,
  preferred,
}: TooltipPanelProps) {
  const { panelRef, placement } = useTooltipPlacement(triggerRef, preferred);

  return (
    <div
      ref={panelRef}
      role="tooltip"
      style={{
        left: `${placement.left}px`,
        top: `${placement.top}px`,
        width: `${placement.width}px`,
      }}
      className="pointer-events-none invisible fixed z-30 opacity-0 transition-opacity duration-150 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100"
    >
      <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs font-normal text-gray-100 shadow-xl dark:border-gray-700 dark:bg-gray-950">
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-2 w-2 rotate-45 border-gray-800 bg-gray-900 dark:border-gray-700 dark:bg-gray-950",
            placement.placeBelow
              ? "-top-1 border-l border-t"
              : "-bottom-1 border-b border-r",
            placement.align === "left" ? "left-2.5" : "right-2.5",
          )}
        />
        <div className="relative z-10 whitespace-normal break-words leading-relaxed text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}
