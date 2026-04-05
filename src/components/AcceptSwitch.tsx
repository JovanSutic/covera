import { cn } from "@/lib/utils";
import { useState } from "react";

type AcceptSwitchProps = {
  accepted?: boolean;
  onChange?: (accepted: boolean) => void;
  className?: string;
};

export default function AcceptSwitch({
  accepted = true,
  onChange,
  className,
}: AcceptSwitchProps) {
  const [state, setState] = useState(accepted);

  const toggle = () => {
    const newState = !state;
    setState(newState);
    onChange?.(newState);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg border h-[64px] w-full",
        state ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50",
        className,
      )}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className={cn(
            "text-xs leading-tight line-clamp-2",
            state ? "text-green-600" : "text-textMuted",
          )}
        >
          {state
            ? "Looks good"
            : "Something’s not right — please notify the host and you’re covered"}
        </span>
      </div>

      <button
        onClick={toggle}
        role="switch"
        aria-checked={state}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
          state ? "bg-green-500" : "bg-gray-300",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            state ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
