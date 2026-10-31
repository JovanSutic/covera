import { Info } from "lucide-react";

interface InfoTooltipProps {
  /** The explanatory text, already translated. */
  content: string;
  /** The trigger's `aria-label`; it is an icon-only button, so it needs one. */
  label: string;
  className?: string;
}

/**
 * An explanatory tooltip whose trigger is a real <button>, so it is reachable by
 * keyboard — the `DescriptionTooltip` version it is modelled on (AssetItemCard) is a
 * <button> that does nothing on click and shows only on `group-hover`, which makes
 * it a dead tab stop.
 *
 * `group-focus-within` alongside `group-hover` is the point: tabbing to the trigger
 * reveals the panel.
 *
 * It is contained (`z-30` inside a `relative` span, no portal) rather than built on
 * `Popover`. `Popover` portals to `document.body` at `z-9999`, which would clash
 * with the `Modal` layer the proof dialog sits in.
 *
 * It renders a SIBLING of the button it explains, never a child: a <button> cannot
 * contain a <button>, and a nested one would also bubble its click into the action.
 *
 * Desktop only by design (D6a) — a surface inside a table cell or a horizontally
 * scrolling strip passes no `tooltip` to its buttons, because an absolutely
 * positioned panel is clipped there.
 */
export function InfoTooltip({ content, label, className }: InfoTooltipProps) {
  return (
    <span
      className={`group/tooltip relative inline-flex shrink-0 ${className ?? ""}`}
    >
      <button
        type="button"
        aria-label={label}
        className="inline-flex cursor-help items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-900 dark:text-gray-500 dark:hover:text-gray-300 dark:focus-visible:outline-gray-100"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-64 max-w-xs animate-in fade-in zoom-in-95 duration-150 group-hover/tooltip:block group-focus-within/tooltip:block">
        <span className="relative block rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs font-normal text-gray-100 shadow-xl dark:border-gray-700 dark:bg-gray-950">
          <span className="absolute -top-1 left-2.5 h-2 w-2 rotate-45 border-l border-t border-gray-800 bg-gray-900 dark:border-gray-700 dark:bg-gray-950" />
          <span className="relative z-10 block whitespace-normal break-words leading-relaxed text-gray-200">
            {content}
          </span>
        </span>
      </span>
    </span>
  );
}
