import { useRef } from "react";
import { Info } from "lucide-react";

import { TooltipPanel } from "./TooltipPanel";

interface InfoTooltipProps {
  /** The explanatory text, already translated. */
  content: string;
  /** The trigger's `aria-label`; it is an icon-only button, so it needs one. */
  label: string;
  className?: string;
}

/**
 * An explanatory tooltip whose trigger is a real <button>, so it is reachable by
 * keyboard — unlike the hover-only version it is modelled on.
 *
 * `group-focus-within` alongside `group-hover` is the point: tabbing to the trigger reveals the
 * panel. It is also what makes the panel usable on a touch device, where a tap focuses the
 * button once.
 *
 * The panel is measured and clamped by `TooltipPanel` (prep §4), which is the fix for tooltips
 * breaking the page layout on `/reservations/:id` and on a phone. It is contained rather than
 * built on `Popover` for the reason it always was: `Popover` portals to `document.body` at
 * `z-9999`, which would clash with the `Modal` layer the proof dialog sits in.
 *
 * It renders a SIBLING of the button it explains, never a child: a <button> cannot contain a
 * <button>, and a nested one would also bubble its click into the action.
 */
export function InfoTooltip({ content, label, className }: InfoTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={`group/tooltip inline-flex shrink-0 ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        className="inline-flex cursor-help items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-900 dark:text-gray-500 dark:hover:text-gray-300 dark:focus-visible:outline-gray-100"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <TooltipPanel triggerRef={triggerRef}>{content}</TooltipPanel>
    </div>
  );
}
