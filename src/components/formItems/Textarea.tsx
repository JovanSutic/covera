import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      className,
      containerClassName,
      id,
      placeholder = " ",
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const activeId = id || generatedId;

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <div
          className={cn(
            // Added overflow-hidden to prevent corner bleed on autofill or resize
            "relative overflow-hidden rounded-lg border border-gray-300 bg-white transition-all duration-200 focus-within:border-black focus-within:ring-1 focus-within:ring-black",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive"
          )}
        >
          <textarea
            id={activeId}
            ref={ref}
            rows={rows}
            placeholder={placeholder}
            className={cn(
              "peer min-h-[80px] w-full resize-y border-0 bg-transparent px-3 pb-2 pt-6 text-base text-black outline-none placeholder-transparent focus:ring-0",
              // Autofill background and text color overrides
              "[&:-webkit-autofill]:bg-white",
              "[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_white_inset]",
              "[&:-webkit-autofill]:[-webkit-text-fill-color:black]",
              "[&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_white_inset]",
              className
            )}
            {...props}
          />
          <label
            htmlFor={activeId}
            className="pointer-events-none absolute left-3 top-4 origin-top-left -translate-y-3 scale-75 transform text-sm text-gray-500 duration-150 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-black peer-[:autofill]:-translate-y-3 peer-[:autofill]:scale-75 peer-[:autofill]:text-black"
          >
            {label}
          </label>
        </div>

        {error && (
          <span className="mt-1 block px-1 text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;