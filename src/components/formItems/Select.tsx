import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className, containerClassName, ...props }, ref) => {
    const activeId = useId();

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <div
          className={cn(
            "relative border border-gray-300 rounded-lg bg-white focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all duration-200",
            error && "border-destructive focus-within:border-destructive focus-within:ring-destructive"
          )}
        >
          <select
            id={activeId}
            ref={ref}
            className={cn(
              "peer w-full px-3 pt-6 pb-2 text-base text-black bg-transparent border-0 outline-none focus:ring-0 min-h-[56px] appearance-none cursor-pointer",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          
          <label
            htmlFor={activeId}
            className="absolute left-3 top-4 origin-top-left -translate-y-3 scale-75 transform text-sm text-gray-500 duration-150 pointer-events-none peer-focus:text-black"
          >
            {label}
          </label>

          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <span className="text-xs text-destructive mt-1 block px-1">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;