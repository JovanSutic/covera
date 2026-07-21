/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { forwardRef, useState, useRef, useEffect, useId } from "react";
import { cn } from "@/lib/utils";

export interface RichOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: RichOption[];
  error?: string;
  containerClassName?: string;
}

const CustomSelect = forwardRef<HTMLSelectElement, CustomSelectProps>(
  (
    {
      label,
      options,
      error,
      className,
      containerClassName,
      onChange,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const activeId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const nativeSelectRef = useRef<HTMLSelectElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string>(
      (value || defaultValue || "") as string,
    );

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value as string);
      }
    }, [value]);

    useEffect(() => {
      const nativeSelect = nativeSelectRef.current;
      if (!nativeSelect) return;

      const handleNativeChange = () => {
        setInternalValue(nativeSelect.value);
      };

      nativeSelect.addEventListener("change", handleNativeChange);

      const valueDescriptor = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      );

      if (valueDescriptor && valueDescriptor.set) {
        const originalSet = valueDescriptor.set;

        Object.defineProperty(nativeSelect, "value", {
          configurable: true,
          get() {
            return valueDescriptor.get?.call(this);
          },
          set(val) {
            originalSet.call(this, val);
            setInternalValue(val);
          },
        });
      }

      return () => {
        nativeSelect.removeEventListener("change", handleNativeChange);
        if (valueDescriptor) {
          Object.defineProperty(nativeSelect, "value", valueDescriptor);
        }
      };
    }, []);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const setCombinedRefs = (element: HTMLSelectElement | null) => {
      (nativeSelectRef as any).current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        (ref as any).current = element;
      }
    };

    const handleSelectOption = (selectedValue: string) => {
      setInternalValue(selectedValue);
      setIsOpen(false);

      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = selectedValue;

        const event = new Event("change", { bubbles: true });
        nativeSelectRef.current.dispatchEvent(event);

        if (onChange) {
          onChange({
            target: nativeSelectRef.current,
            type: "change",
          } as React.ChangeEvent<HTMLSelectElement>);
        }
      }
    };

    const selectedOption = options.find((opt) => opt.value === internalValue);

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full", containerClassName)}
      >
        <select
          ref={setCombinedRefs}
          value={internalValue}
          onChange={(e) => setInternalValue(e.target.value)}
          className="sr-only"
          {...props}
        >
          <option value="" />
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div
          className={cn(
            "relative border border-gray-300 rounded-lg bg-white transition-all duration-200 cursor-pointer",
            isOpen && "border-black ring-1 ring-black",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive",
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <button
            id={activeId}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={cn(
              "w-full text-left px-3 pt-6 pb-2 text-base text-black bg-transparent border-0 outline-none min-h-[56px] flex flex-col justify-center select-none pr-10 cursor-pointer",
              className,
            )}
          >
            {selectedOption ? (
              <span className="block truncate text-sm font-normal leading-tight">
                {selectedOption.label}
              </span>
            ) : (
              <span className="block h-5" />
            )}
          </button>

          <label
            htmlFor={activeId}
            className={cn(
              "absolute left-3 transition-all duration-150 pointer-events-none origin-top-left",
              selectedOption || isOpen
                ? "top-4 -translate-y-3 scale-75 text-sm text-gray-500"
                : "top-4 text-base text-gray-500 scale-100 translate-y-0",
              isOpen && "text-black",
            )}
          >
            {label}
          </label>

          <div
            className={cn(
              "absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {isOpen && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-200"
          >
            {options.length === 0 ? (
              <li className="py-2 px-3 text-gray-500 italic text-xs">
                No matching options found
              </li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === internalValue;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(opt.value);
                    }}
                    className={cn(
                      "cursor-pointer select-none py-2 px-3 transition-colors text-left",
                      isSelected
                        ? "bg-gray-100 font-medium"
                        : "hover:bg-gray-50",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {opt.label}
                      </span>
                      {opt.subLabel && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}

        {error && (
          <span className="text-xs text-destructive mt-1 block px-1">
            {error}
          </span>
        )}
      </div>
    );
  },
);

CustomSelect.displayName = "CustomSelect";
export default CustomSelect;