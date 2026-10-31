import { cloneElement, useState, type ReactElement, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ConfirmButtonVariant = "danger" | "success";

/**
 * The confirmation step's colour. `danger` is the delete pattern lifted from
 * `AssetItemCard`; `success` is the create-inspection step the previous plan's
 * inline cell rendered emerald. The two triggers are identical (D31), so this is
 * the only thing left that says which action is being confirmed (D32).
 */
const CONFIRM_STEP_CLASSES: Record<ConfirmButtonVariant, string> = {
  // verbatim — `AssetItemCard.tsx`, the confirm button
  danger:
    "flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 disabled:opacity-50",
  success:
    "flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50",
};

export interface ConfirmButtonProps {
  /**
   * The trigger. Must accept `onClick` and `disabled` — `ActionButton`, a raw
   * `<button>`, anything that forwards its props.
   */
  children: ReactElement<{
    onClick?: (event: React.MouseEvent) => void;
    disabled?: boolean;
  }>;
  /** Fires on the confirm click. Awaiting it keeps the confirm step busy. */
  onConfirm: () => void | Promise<unknown>;
  /** An already-translated string. */
  confirmLabel: string;
  /** An already-translated string. */
  cancelLabel: string;
  /** The confirmation step's leading icon. Defaults to a check. */
  icon?: ReactNode;
  /** The confirmation step's colour. Defaults to the delete pattern's. */
  variant?: ConfirmButtonVariant;
  /** A pending mutation, from outside — the confirm button spins. */
  isLoading?: boolean;
  /** Also disables the trigger, independent of the mutation. */
  disabled?: boolean;
  /** Applied to the confirmation step's container, so a surface can position it. */
  className?: string;
}

/**
 * The in-place "are you sure" pattern, extracted from `AssetItemCard` so delete
 * looks and behaves identically wherever it exists (prep §1, §5).
 *
 * The confirmation step is unconditional: nothing here can delete on one click.
 * That is what lets D4 style delete like every other button and stay safe.
 */
export function ConfirmButton({
  children,
  onConfirm,
  confirmLabel,
  cancelLabel,
  icon,
  variant = "danger",
  isLoading = false,
  disabled = false,
  className,
}: ConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const busy = isLoading || isPending;

  const handleConfirm = async () => {
    try {
      setIsPending(true);
      await onConfirm();
    } finally {
      setIsPending(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 animate-in fade-in duration-150",
          className,
        )}
      >
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className={CONFIRM_STEP_CLASSES[variant]}
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            icon ?? <Check className="h-3 w-3" />
          )}
          <span>{confirmLabel}</span>
        </button>

        {/* verbatim — `AssetItemCard.tsx`, the cancel button */}
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          disabled={busy}
          className="cursor-pointer rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {cancelLabel}
        </button>
      </div>
    );
  }

  return cloneElement(children, {
    onClick: () => setIsConfirming(true),
    disabled: disabled || children.props.disabled,
  });
}
