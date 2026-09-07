import { useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";

export type ConfirmVariant = "danger" | "success" | "primary";

export interface ConfirmActionButtonProps {
  /** The icon displayed on the initial trigger button */
  icon: ReactNode;
  /** Action label (e.g., "Delete", "Create", "Approve") */
  confirmLabel?: string;
  /** Cancel label */
  cancelLabel?: string;
  /** Optional inline prompt shown alongside buttons during confirmation state */
  confirmMessage?: string;
  /** Visual theme for the confirmation state */
  variant?: ConfirmVariant;
  /** Async or sync action triggered on confirmation */
  onConfirm: () => void | Promise<unknown>;
  /** Disables the trigger button */
  disabled?: boolean;
  /** Tooltip title for the initial icon button */
  title?: string;
  /** Spinner or loading state override (e.g. from TanStack Query `isPending`) */
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<
  ConfirmVariant,
  {
    iconHover: string;
    confirmBtn: string;
  }
> = {
  danger: {
    iconHover: "hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
  },
  success: {
    iconHover: "hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  primary: {
    iconHover: "hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30",
    confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export function ConfirmActionButton({
  icon,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmMessage,
  variant = "danger",
  onConfirm,
  disabled = false,
  title,
  isLoading = false,
}: ConfirmActionButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  const activeLoading = isLoading || internalLoading;
  const styles = VARIANT_STYLES[variant];

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
        {confirmMessage && (
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {confirmMessage}
          </span>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={activeLoading}
          className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${styles.confirmBtn}`}
          title={confirmLabel}
        >
          {activeLoading ? (
            <span className="animate-pulse">...</span>
          ) : (
            <Check className="h-3 w-3 shrink-0" />
          )}
          <span>{confirmLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          disabled={activeLoading}
          className="flex items-center gap-0.5 rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          title={cancelLabel}
        >
          <X className="h-3 w-3 shrink-0" />
          <span>{cancelLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsConfirming(true)}
      disabled={disabled}
      title={title}
      className={`text-gray-400 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed ${styles.iconHover}`}
    >
      {icon}
    </button>
  );
}