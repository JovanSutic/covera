/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useId,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";

export interface RichOption {
  value: string;
  label: string;
  subLabel?: string;
}

export interface CustomSelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue"
> {
  label?: string;
  options: RichOption[];
  error?: string;
  containerClassName?: string;
  value?: string;
  defaultValue?: string; // Add explicit defaultValue definition
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
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const activeId = id || generatedId;

    const containerRef = useRef<HTMLDivElement>(null);
    const nativeSelectRef = useRef<HTMLSelectElement>(null);

    useImperativeHandle(ref, () => nativeSelectRef.current!);

    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const isControlled = value !== undefined;

    // Updated initialization without accessing props.value / props.defaultValue
    const [uncontrolledValue, setUncontrolledValue] = useState<string>(
      defaultValue || value || "",
    );

    const currentValue = isControlled ? value : uncontrolledValue;

    // Updated synchronization effect
    useEffect(() => {
      if (!isControlled && nativeSelectRef.current) {
        setUncontrolledValue(nativeSelectRef.current.value || "");
      }
    }, [value, defaultValue, isControlled]);

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

    const handleSelectOption = (selectedValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(selectedValue);
      }
      setIsOpen(false);

      if (nativeSelectRef.current) {
        const nativeSelect = nativeSelectRef.current;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value",
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(nativeSelect, selectedValue);
        } else {
          nativeSelect.value = selectedValue;
        }

        const event = new Event("change", { bubbles: true });
        nativeSelect.dispatchEvent(event);

        if (onChange) {
          onChange({
            target: nativeSelect,
            currentTarget: nativeSelect,
            type: "change",
          } as React.ChangeEvent<HTMLSelectElement>);
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
          handleSelectOption(options[focusedIndex].value);
        } else {
          setIsOpen((prev) => !prev);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        }
      }
    };

    const selectedOption = options.find((opt) => opt.value === currentValue);
    const hasValue = Boolean(selectedOption || currentValue);

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full", containerClassName)}
      >
        <select
          ref={nativeSelectRef}
          value={currentValue}
          onChange={(e) => {
            if (!isControlled) setUncontrolledValue(e.target.value);
            onChange?.(e);
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          disabled={disabled}
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
            "relative cursor-pointer rounded-lg border border-gray-300 bg-white transition-all duration-200",
            isOpen && "border-black ring-1 ring-black",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive",
            disabled && "cursor-not-allowed opacity-50 bg-gray-50",
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <button
            id={activeId}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={`${activeId}-listbox`}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex w-full flex-col justify-center border-0 bg-transparent px-3 text-left text-base text-black outline-none pr-10 select-none cursor-pointer",
              label ? "min-h-[56px] pb-2 pt-6" : "min-h-[38px] py-2",
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

          {label && (
            <label
              htmlFor={activeId}
              className={cn(
                "pointer-events-none absolute left-3 origin-top-left transition-all duration-150",
                hasValue || isOpen
                  ? "top-4 -translate-y-3 scale-75 text-sm text-gray-500"
                  : "top-4 translate-y-0 scale-100 text-base text-gray-500",
                isOpen && "text-black",
              )}
            >
              {label}
            </label>
          )}

          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500 transition-transform duration-200",
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
            id={`${activeId}-listbox`}
            role="listbox"
            tabIndex={-1}
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-xs italic text-gray-500">
                No matching options found
              </li>
            ) : (
              options.map((opt, idx) => {
                const isSelected = opt.value === currentValue;
                const isFocused = idx === focusedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(opt.value);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={cn(
                      "cursor-pointer select-none px-3 py-2 text-left transition-colors",
                      isSelected && "font-medium bg-gray-100",
                      isFocused && !isSelected && "bg-gray-50",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {opt.label}
                      </span>
                      {opt.subLabel && (
                        <span className="mt-0.5 text-xs text-gray-500">
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
          <span className="mt-1 block px-1 text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
    );
  },
);

CustomSelect.displayName = "CustomSelect";
export default CustomSelect;
