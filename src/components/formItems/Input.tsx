import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = {
  label: string;
  error?: string;
  containerClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Input({
  label,
  error,
  className,
  containerClassName,
  id,
  placeholder = " ",
  ref,
  ...props
}: InputProps) {
  const inputId = React.useId();
  const activeId = id || inputId;

  return (
    <div className={cn("relative w-full", containerClassName)}>
      <div
        className={cn(
          "relative border border-gray-300 rounded-lg bg-white focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all duration-200",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive"
        )}
      >
        <input
          id={activeId}
          ref={ref} // Forwarding the reference to Hook Form
          placeholder={placeholder}
          className={cn(
            "peer w-full px-3 pt-6 pb-2 text-base text-black bg-transparent border-0 outline-none focus:ring-0 placeholder-transparent min-h-[56px]",
            className
          )}
          {...props}
        />
        <label
          htmlFor={activeId}
          className="absolute left-3 top-4 origin-top-left -translate-y-3 scale-75 transform text-sm text-gray-500 duration-150 
            peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 
            peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-black pointer-events-none"
        >
          {label}
        </label>
      </div>
      
      {error && (
        <span className="text-xs text-destructive mt-1 block px-1">
          {error}
        </span>
      )}
    </div>
  );
}

export default Input;
