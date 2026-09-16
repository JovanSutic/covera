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

export interface MultiSelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "defaultValue" | "onChange" | "multiple"
  > {
  label?: string;
  options: RichOption[];
  error?: string;
  containerClassName?: string;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}

const MultiSelect = forwardRef<HTMLSelectElement, MultiSelectProps>(
  (props, ref) => {
    const {
      label,
      options,
      error,
      className,
      containerClassName,
      onChange,
      value,
      defaultValue = [],
      id,
      disabled,
      ...restProps
    } = props;

    const generatedId = useId();
    const activeId = id || generatedId;

    const containerRef = useRef<HTMLDivElement>(null);
    const nativeSelectRef = useRef<HTMLSelectElement>(null);

    useImperativeHandle(ref, () => nativeSelectRef.current!);

    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Controlled vs Uncontrolled state
    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] =
      useState<string[]>(defaultValue);

    const currentValue = isControlled ? value || [] : uncontrolledValue;

    // Close dropdown on outside click
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

    // Sync native hidden select and trigger onChange callbacks
    const notifyChange = (newValue: string[]) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }

      if (nativeSelectRef.current) {
        const nativeSelect = nativeSelectRef.current;
        Array.from(nativeSelect.options).forEach((opt) => {
          opt.selected = newValue.includes(opt.value);
        });

        const syntheticEvent = new Event("change", { bubbles: true });
        nativeSelect.dispatchEvent(syntheticEvent);
      }

      if (onChange) {
        onChange(newValue);
      }
    };

    const handleToggleOption = (selectedValue: string) => {
      const nextValue = currentValue.includes(selectedValue)
        ? currentValue.filter((v) => v !== selectedValue)
        : [...currentValue, selectedValue];

      notifyChange(nextValue);
    };

    const removeTag = (valToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const nextValue = currentValue.filter((v) => v !== valToRemove);
      notifyChange(nextValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
          handleToggleOption(options[focusedIndex].value);
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

    const selectedOptions = options.filter((opt) =>
      currentValue.includes(opt.value)
    );
    const hasValue = currentValue.length > 0;

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full", containerClassName)}
      >
        {/* Hidden native multi-select for DOM & form library support */}
        <select
          ref={nativeSelectRef}
          multiple
          value={currentValue}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          disabled={disabled}
          {...restProps}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div
          className={cn(
            "relative cursor-pointer rounded-lg border border-gray-300 bg-white transition-all duration-200 dark:bg-gray-900 dark:border-gray-700",
            isOpen &&
              "border-black ring-1 ring-black dark:border-white dark:ring-white",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive",
            disabled &&
              "cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-800"
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
              "flex w-full flex-wrap items-center gap-1.5 border-0 bg-transparent px-3 text-left text-base text-black dark:text-white outline-none pr-10 select-none cursor-pointer min-h-[56px]",
              label ? "pb-2 pt-6" : "py-2",
              className
            )}
          >
            {selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              >
                {opt.label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => removeTag(opt.value, e)}
                  className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </span>
              </span>
            ))}
          </button>

          {label && (
            <label
              htmlFor={activeId}
              className={cn(
                "pointer-events-none absolute left-3 origin-top-left transition-all duration-150",
                hasValue || isOpen
                  ? "top-4 -translate-y-3 scale-75 text-sm text-gray-500 dark:text-gray-400"
                  : "top-4 translate-y-0 scale-100 text-base text-gray-500 dark:text-gray-400",
                isOpen && "text-black dark:text-white font-medium"
              )}
            >
              {label}
            </label>
          )}

          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500 transition-transform duration-200",
              isOpen && "rotate-180"
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
            aria-multiselectable="true"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-xs italic text-gray-500">
                No matching options found
              </li>
            ) : (
              options.map((opt, idx) => {
                const selected = currentValue.includes(opt.value);
                const isFocused = idx === focusedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={selected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleOption(opt.value);
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={cn(
                      "cursor-pointer select-none px-3 py-2 text-left transition-colors flex items-center justify-between",
                      selected && "font-medium bg-gray-100 dark:bg-gray-800",
                      isFocused && !selected && "bg-gray-50 dark:bg-gray-800/50"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {opt.label}
                      </span>
                      {opt.subLabel && (
                        <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {selected && (
                      <span className="text-xs font-semibold text-black dark:text-white">
                        ✓
                      </span>
                    )}
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
  }
);

MultiSelect.displayName = "MultiSelect";
export default MultiSelect;