import { useRef } from "react";
import { FileText } from "lucide-react";

import { TooltipPanel } from "./TooltipPanel";

interface DescriptionTooltipProps {
  /** The text to show, already translated or already user data. */
  content: string;
  /** The trigger's `aria-label`; it is an icon-only button, so it needs one. */
  label: string;
  className?: string;
}

/**
 * A description behind a text-icon trigger. Extracted from `AssetItemCard` (prep §2) so the
 * inspection guide can use the same affordance for a shot's instructions.
 *
 * D12: it keeps `group-hover` + `group-focus-within` and has no click handler of its own.
 * `group-focus-within` is what makes it work on a touch device — a tap focuses the button once —
 * and a click toggle would need a dismiss affordance, which is `Popover`'s job and collides with
 * the `Modal` layer (see `InfoTooltip`'s own comment).
 *
 * The panel is measured and clamped by `TooltipPanel` (prep §4). Before this phase it was an
 * absolutely-positioned box inside an inline wrapper, which is why it could escape its row.
 */
export function DescriptionTooltip({
  content,
  label,
  className,
}: DescriptionTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={`group/tooltip inline-flex shrink-0 ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100/80 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:focus-visible:outline-gray-100"
      >
        <FileText className="h-4 w-4" />
      </button>

      <TooltipPanel triggerRef={triggerRef}>{content}</TooltipPanel>
    </div>
  );
}
