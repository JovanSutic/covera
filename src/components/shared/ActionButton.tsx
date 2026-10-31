import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { InfoTooltip } from "./InfoTooltip";

/**
 * The app's one action button: an icon and a label, in a configurable variant and
 * size, with an optional spinner and an optional info tooltip (prep §5).
 *
 * Built on CVA because `Card`, `GradientContainer` and `ConfirmActionButton`
 * already are — one convention for variants, not two.
 *
 * It is deliberately NOT `formItems/Button`: that one is a `children`-only submit
 * button for forms with no icon slot, and it styles with four tokens that do not
 * exist in `index.css`. It stays as it is (D20).
 *
 * The rendered shape is a fragment so this stays ONE flex item's worth of layout.
 */
const actionButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // newly authored, lifted from `InspectionIntroduction`'s CTA — the app's
        // existing dark primary button.
        primary:
          "border-transparent bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200",
        // verbatim — `ReservationHeaderActions.tsx`, the create-inspection container
        neutral:
          "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300",
        // verbatim — `ReservationHeaderActions.tsx`, the copy-message button
        info: "border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50",
        // verbatim — `ReservationHeaderActions.tsx`, the delete container
        danger: "border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400",
      },
      size: {
        sm: "px-2.5 py-1.5 text-xs",
        md: "px-3 py-2 text-sm",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface ActionButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "className">,
    VariantProps<typeof actionButtonVariants> {
  /** Placed before the label. Sized by the caller; `h-4 w-4` is the house size. */
  icon?: ReactNode;
  /** An already-translated string — never a key name. */
  label: string;
  /** Appends a `Loader2` spinner and disables the button. */
  loading?: boolean;
  /** Explanatory copy for the `InfoTooltip` beside the label. Omit for none. */
  tooltip?: string;
  /** The tooltip trigger's accessible name. Required when `tooltip` is given. */
  tooltipLabel?: string;
  className?: string;
}

export function ActionButton({
  icon,
  label,
  loading = false,
  tooltip,
  tooltipLabel,
  variant,
  size,
  className,
  disabled,
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <>
      <button
        type={type}
        disabled={disabled || loading}
        className={cn(actionButtonVariants({ variant, size }), className)}
        {...props}
      >
        {icon}
        <span>{label}</span>
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
      </button>

      {tooltip && (
        // D6a: desktop-only. `hidden sm:contents` makes the wrapper vanish from the
        // layout at `sm` and up, so the tooltip becomes a real flex item beside the
        // button and the row's `gap` applies to it — and below `sm` there is simply
        // no tooltip. The BUTTON itself is unaffected at every width; only the
        // explanation is desktop-only. Putting this here rather than at each call
        // site is what makes "is this a desktop surface" one decision, not eight.
        <span className="hidden sm:contents">
          <InfoTooltip content={tooltip} label={tooltipLabel ?? label} />
        </span>
      )}
    </>
  );
}
